-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create user_quotas table
CREATE TABLE public.user_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    daily_limit INTEGER NOT NULL DEFAULT 10,
    monthly_limit INTEGER,
    questions_used_today INTEGER NOT NULL DEFAULT 0,
    questions_used_month INTEGER NOT NULL DEFAULT 0,
    bonus_questions INTEGER NOT NULL DEFAULT 0,
    last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_month_reset DATE NOT NULL DEFAULT CURRENT_DATE,
    plan_type TEXT DEFAULT 'free',
    plan_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quota"
ON public.user_quotas
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all quotas"
ON public.user_quotas
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert quotas"
ON public.user_quotas
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Admins can update quotas"
ON public.user_quotas
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can update own quota"
ON public.user_quotas
FOR UPDATE
USING (auth.uid() = user_id);

-- Create payment_packages table (admin created)
CREATE TABLE public.payment_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,0) NOT NULL,
    questions_count INTEGER NOT NULL,
    package_type TEXT NOT NULL DEFAULT 'one_time',
    duration_days INTEGER,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages"
ON public.payment_packages
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage packages"
ON public.payment_packages
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create payment_requests table
CREATE TABLE public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    package_id UUID REFERENCES public.payment_packages(id) ON DELETE SET NULL,
    amount DECIMAL(10,0) NOT NULL,
    questions_count INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
ON public.payment_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create requests"
ON public.payment_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
ON public.payment_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests"
ON public.payment_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create app_settings table for global settings
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings"
ON public.app_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.app_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES 
('default_daily_limit', '10'),
('payment_info', '{"bank_name": "", "account_number": "", "account_name": "", "qr_image": ""}');

-- Function to auto-create user quota and assign admin to first user
CREATE OR REPLACE FUNCTION public.handle_new_user_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_count INTEGER;
    default_limit INTEGER;
BEGIN
    -- Get default daily limit
    SELECT (value::text)::integer INTO default_limit 
    FROM public.app_settings 
    WHERE key = 'default_daily_limit';
    
    IF default_limit IS NULL THEN
        default_limit := 10;
    END IF;

    -- Count existing users
    SELECT COUNT(*) INTO user_count FROM public.user_roles;
    
    -- Create quota for new user
    INSERT INTO public.user_quotas (user_id, daily_limit)
    VALUES (NEW.id, default_limit);
    
    -- If first user, make them admin
    IF user_count = 0 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'user');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user quota
CREATE TRIGGER on_auth_user_created_quota
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_quota();

-- Function to reset daily quotas
CREATE OR REPLACE FUNCTION public.reset_daily_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.user_quotas
    SET questions_used_today = 0,
        last_reset_date = CURRENT_DATE
    WHERE last_reset_date < CURRENT_DATE;
    
    -- Reset monthly quotas
    UPDATE public.user_quotas
    SET questions_used_month = 0,
        last_month_reset = CURRENT_DATE
    WHERE EXTRACT(MONTH FROM last_month_reset) != EXTRACT(MONTH FROM CURRENT_DATE);
END;
$$;

-- Function to check and use quota
CREATE OR REPLACE FUNCTION public.check_and_use_quota(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    quota_record RECORD;
    can_use BOOLEAN := false;
BEGIN
    -- Reset if new day
    PERFORM public.reset_daily_quotas();
    
    SELECT * INTO quota_record FROM public.user_quotas WHERE user_id = _user_id;
    
    IF quota_record IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if plan expired
    IF quota_record.plan_expires_at IS NOT NULL AND quota_record.plan_expires_at < NOW() THEN
        UPDATE public.user_quotas 
        SET plan_type = 'free', plan_expires_at = NULL 
        WHERE user_id = _user_id;
    END IF;
    
    -- Check if has bonus questions
    IF quota_record.bonus_questions > 0 THEN
        UPDATE public.user_quotas 
        SET bonus_questions = bonus_questions - 1
        WHERE user_id = _user_id;
        RETURN true;
    END IF;
    
    -- Check daily limit
    IF quota_record.questions_used_today < quota_record.daily_limit THEN
        UPDATE public.user_quotas 
        SET questions_used_today = questions_used_today + 1
        WHERE user_id = _user_id;
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- Function to get remaining quota
CREATE OR REPLACE FUNCTION public.get_remaining_quota(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    quota_record RECORD;
    result JSONB;
BEGIN
    PERFORM public.reset_daily_quotas();
    
    SELECT * INTO quota_record FROM public.user_quotas WHERE user_id = _user_id;
    
    IF quota_record IS NULL THEN
        RETURN '{"remaining": 0, "daily_limit": 0, "bonus": 0}'::jsonb;
    END IF;
    
    result := jsonb_build_object(
        'remaining', GREATEST(0, quota_record.daily_limit - quota_record.questions_used_today),
        'daily_limit', quota_record.daily_limit,
        'bonus', quota_record.bonus_questions,
        'plan_type', quota_record.plan_type,
        'plan_expires_at', quota_record.plan_expires_at
    );
    
    RETURN result;
END;
$$;