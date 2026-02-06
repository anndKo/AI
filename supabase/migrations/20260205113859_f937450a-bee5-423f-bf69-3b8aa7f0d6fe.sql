-- ===========================================
-- ADVANCED SECURITY SYSTEM
-- Device Fingerprinting + Brute Force Protection
-- ===========================================

-- 1. Bảng lưu Device Fingerprints
CREATE TABLE public.device_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint_hash TEXT NOT NULL UNIQUE,
  accounts_count INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  block_expires_at TIMESTAMP WITH TIME ZONE,
  block_count INTEGER NOT NULL DEFAULT 0,
  risk_score INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index cho tra cứu nhanh
CREATE INDEX idx_device_fingerprints_hash ON public.device_fingerprints(fingerprint_hash);
CREATE INDEX idx_device_fingerprints_blocked ON public.device_fingerprints(is_blocked) WHERE is_blocked = true;

-- 2. Bảng liên kết User-Device
CREATE TABLE public.user_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fingerprint_id UUID NOT NULL REFERENCES public.device_fingerprints(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  first_login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  login_count INTEGER NOT NULL DEFAULT 1,
  is_trusted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, fingerprint_id)
);

CREATE INDEX idx_user_devices_user ON public.user_devices(user_id);
CREATE INDEX idx_user_devices_fingerprint ON public.user_devices(fingerprint_id);

-- 3. Bảng ghi log đăng nhập thất bại
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint_hash TEXT NOT NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  attempt_type TEXT NOT NULL DEFAULT 'login', -- 'login', 'register'
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  behavior_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_attempts_fingerprint ON public.login_attempts(fingerprint_hash);
CREATE INDEX idx_login_attempts_time ON public.login_attempts(created_at DESC);
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);

-- 4. Bảng security audit log
CREATE TABLE public.security_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'login_blocked', 'device_blocked', 'suspicious_activity', 'rate_limit_exceeded'
  fingerprint_hash TEXT,
  user_id UUID,
  ip_address TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_audit_time ON public.security_audit_log(created_at DESC);
CREATE INDEX idx_security_audit_type ON public.security_audit_log(event_type);
CREATE INDEX idx_security_audit_severity ON public.security_audit_log(severity);

-- Enable RLS
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Chỉ admin mới xem được
CREATE POLICY "Admins can view device fingerprints"
  ON public.device_fingerprints
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage device fingerprints"
  ON public.device_fingerprints
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own devices"
  ON public.user_devices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user devices"
  ON public.user_devices
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view security audit"
  ON public.security_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Function: Kiểm tra device có bị block không
CREATE OR REPLACE FUNCTION public.check_device_blocked(p_fingerprint_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  device_record RECORD;
  result JSONB;
BEGIN
  SELECT * INTO device_record FROM public.device_fingerprints WHERE fingerprint_hash = p_fingerprint_hash;
  
  IF device_record IS NULL THEN
    RETURN jsonb_build_object('blocked', false, 'reason', null);
  END IF;
  
  -- Check if block expired
  IF device_record.is_blocked AND device_record.block_expires_at IS NOT NULL AND device_record.block_expires_at < NOW() THEN
    UPDATE public.device_fingerprints SET is_blocked = false, block_reason = null WHERE fingerprint_hash = p_fingerprint_hash;
    RETURN jsonb_build_object('blocked', false, 'reason', null);
  END IF;
  
  IF device_record.is_blocked THEN
    RETURN jsonb_build_object(
      'blocked', true,
      'reason', device_record.block_reason,
      'expires_at', device_record.block_expires_at,
      'permanent', device_record.block_expires_at IS NULL
    );
  END IF;
  
  RETURN jsonb_build_object('blocked', false, 'reason', null);
END;
$$;

-- Function: Đếm số tài khoản đã đăng ký từ device
CREATE OR REPLACE FUNCTION public.get_device_account_count(p_fingerprint_hash TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  device_record RECORD;
BEGIN
  SELECT * INTO device_record FROM public.device_fingerprints WHERE fingerprint_hash = p_fingerprint_hash;
  
  IF device_record IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN device_record.accounts_count;
END;
$$;

-- Function: Đăng ký device mới hoặc tăng account count
CREATE OR REPLACE FUNCTION public.register_device_account(p_fingerprint_hash TEXT, p_metadata JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  device_record RECORD;
  max_accounts INTEGER := 3;
BEGIN
  SELECT * INTO device_record FROM public.device_fingerprints WHERE fingerprint_hash = p_fingerprint_hash;
  
  IF device_record IS NULL THEN
    -- Tạo mới device
    INSERT INTO public.device_fingerprints (fingerprint_hash, accounts_count, metadata)
    VALUES (p_fingerprint_hash, 1, p_metadata);
    RETURN jsonb_build_object('success', true, 'accounts_count', 1);
  END IF;
  
  -- Kiểm tra giới hạn
  IF device_record.accounts_count >= max_accounts THEN
    -- Ghi log
    INSERT INTO public.security_audit_log (event_type, fingerprint_hash, details, severity)
    VALUES ('registration_blocked', p_fingerprint_hash, jsonb_build_object('reason', 'max_accounts_reached', 'count', device_record.accounts_count), 'warning');
    
    RETURN jsonb_build_object('success', false, 'error', 'max_accounts_reached', 'accounts_count', device_record.accounts_count);
  END IF;
  
  -- Tăng account count
  UPDATE public.device_fingerprints 
  SET accounts_count = accounts_count + 1, last_seen_at = NOW()
  WHERE fingerprint_hash = p_fingerprint_hash;
  
  RETURN jsonb_build_object('success', true, 'accounts_count', device_record.accounts_count + 1);
END;
$$;

-- Function: Ghi nhận login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_fingerprint_hash TEXT,
  p_email TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_success BOOLEAN,
  p_failure_reason TEXT DEFAULT NULL,
  p_behavior_score INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fail_count INTEGER;
  device_record RECORD;
  block_duration INTERVAL;
BEGIN
  -- Ghi log attempt
  INSERT INTO public.login_attempts (fingerprint_hash, email, ip_address, user_agent, success, failure_reason, behavior_score)
  VALUES (p_fingerprint_hash, p_email, p_ip_address, p_user_agent, p_success, p_failure_reason, p_behavior_score);
  
  IF p_success THEN
    -- Reset fail count on success
    UPDATE public.device_fingerprints SET last_seen_at = NOW() WHERE fingerprint_hash = p_fingerprint_hash;
    RETURN jsonb_build_object('blocked', false);
  END IF;
  
  -- Đếm số lần fail trong 15 phút
  SELECT COUNT(*) INTO fail_count
  FROM public.login_attempts
  WHERE fingerprint_hash = p_fingerprint_hash
    AND success = false
    AND created_at > NOW() - INTERVAL '15 minutes';
  
  -- Lấy device record
  SELECT * INTO device_record FROM public.device_fingerprints WHERE fingerprint_hash = p_fingerprint_hash;
  
  IF device_record IS NULL THEN
    INSERT INTO public.device_fingerprints (fingerprint_hash, metadata)
    VALUES (p_fingerprint_hash, jsonb_build_object('first_fail_at', NOW()));
    SELECT * INTO device_record FROM public.device_fingerprints WHERE fingerprint_hash = p_fingerprint_hash;
  END IF;
  
  -- Kiểm tra xem có cần block không (sau 5 lần fail)
  IF fail_count >= 5 THEN
    -- Tính thời gian block dựa vào số lần bị block trước đó
    CASE device_record.block_count
      WHEN 0 THEN block_duration := INTERVAL '15 minutes';
      WHEN 1 THEN block_duration := INTERVAL '1 hour';
      WHEN 2 THEN block_duration := INTERVAL '24 hours';
      ELSE block_duration := NULL; -- Permanent block
    END CASE;
    
    UPDATE public.device_fingerprints
    SET is_blocked = true,
        block_reason = 'too_many_failed_attempts',
        block_expires_at = CASE WHEN block_duration IS NOT NULL THEN NOW() + block_duration ELSE NULL END,
        block_count = block_count + 1,
        risk_score = risk_score + 10
    WHERE fingerprint_hash = p_fingerprint_hash;
    
    -- Ghi security audit log
    INSERT INTO public.security_audit_log (event_type, fingerprint_hash, details, severity)
    VALUES (
      'device_blocked',
      p_fingerprint_hash,
      jsonb_build_object('reason', 'too_many_failed_attempts', 'fail_count', fail_count, 'block_duration', block_duration::text),
      'critical'
    );
    
    RETURN jsonb_build_object(
      'blocked', true,
      'reason', 'too_many_failed_attempts',
      'expires_at', CASE WHEN block_duration IS NOT NULL THEN NOW() + block_duration ELSE NULL END,
      'permanent', block_duration IS NULL
    );
  END IF;
  
  RETURN jsonb_build_object('blocked', false, 'attempts_remaining', 5 - fail_count);
END;
$$;

-- Function: Liên kết user với device sau khi đăng nhập thành công
CREATE OR REPLACE FUNCTION public.link_user_device(
  p_user_id UUID,
  p_fingerprint_hash TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  device_id UUID;
BEGIN
  -- Get or create device
  SELECT id INTO device_id FROM public.device_fingerprints WHERE fingerprint_hash = p_fingerprint_hash;
  
  IF device_id IS NULL THEN
    INSERT INTO public.device_fingerprints (fingerprint_hash)
    VALUES (p_fingerprint_hash)
    RETURNING id INTO device_id;
  END IF;
  
  -- Create or update user-device link
  INSERT INTO public.user_devices (user_id, fingerprint_id, ip_address, user_agent)
  VALUES (p_user_id, device_id, p_ip_address, p_user_agent)
  ON CONFLICT (user_id, fingerprint_id)
  DO UPDATE SET last_login_at = NOW(), login_count = public.user_devices.login_count + 1, ip_address = p_ip_address;
END;
$$;