import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  generateFingerprint, 
  detectAutomation, 
  BehaviorTracker 
} from "@/lib/deviceFingerprint";

interface DeviceSecurityState {
  isBlocked: boolean;
  blockReason: string | null;
  blockExpiresAt: Date | null;
  isPermanentBlock: boolean;
  attemptsRemaining: number;
  isLoading: boolean;
  fingerprintHash: string | null;
  isAutomationDetected: boolean;
}

interface SecurityCheckResult {
  canProceed: boolean;
  error?: string;
  attemptsRemaining?: number;
}

export function useDeviceSecurity() {
  const [state, setState] = useState<DeviceSecurityState>({
    isBlocked: false,
    blockReason: null,
    blockExpiresAt: null,
    isPermanentBlock: false,
    attemptsRemaining: 5,
    isLoading: true,
    fingerprintHash: null,
    isAutomationDetected: false,
  });

  const behaviorTrackerRef = useRef<BehaviorTracker | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Initialize fingerprint and check device status
  useEffect(() => {
    const initialize = async () => {
      try {
        const fingerprint = await generateFingerprint();
        
        setState(prev => ({
          ...prev,
          fingerprintHash: fingerprint.hash,
          isAutomationDetected: fingerprint.metadata.automationDetected,
        }));

        // Check if device is blocked
        const { data, error } = await supabase.rpc("check_device_blocked", {
          p_fingerprint_hash: fingerprint.hash,
        });

        if (!error && data) {
          const result = data as { blocked: boolean; reason?: string; expires_at?: string; permanent?: boolean };
          setState(prev => ({
            ...prev,
            isBlocked: result.blocked,
            blockReason: result.reason || null,
            blockExpiresAt: result.expires_at ? new Date(result.expires_at) : null,
            isPermanentBlock: result.permanent || false,
            isLoading: false,
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Device security initialization error:", error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initialize();
  }, []);

  // Start behavior tracking
  const startBehaviorTracking = useCallback(() => {
    if (!behaviorTrackerRef.current) {
      behaviorTrackerRef.current = new BehaviorTracker();
      cleanupRef.current = behaviorTrackerRef.current.start();
    }
  }, []);

  // Stop behavior tracking
  const stopBehaviorTracking = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  // Get behavior score
  const getBehaviorScore = useCallback(() => {
    return behaviorTrackerRef.current?.getScore() || 0;
  }, []);

  // Check if registration is allowed (max 3 accounts per device)
  const checkRegistrationAllowed = useCallback(async (): Promise<SecurityCheckResult> => {
    if (!state.fingerprintHash) {
      return { canProceed: false, error: "Không thể xác định thiết bị" };
    }

    if (state.isBlocked) {
      return { 
        canProceed: false, 
        error: state.isPermanentBlock 
          ? "Thiết bị đã bị khóa vĩnh viễn" 
          : `Thiết bị bị khóa. Thử lại sau ${formatTimeRemaining(state.blockExpiresAt)}`
      };
    }

    // Check automation
    const automation = detectAutomation();
    if (automation.isBot) {
      return { canProceed: false, error: "Phát hiện hoạt động tự động" };
    }

    // Check account count
    const { data, error } = await supabase.rpc("get_device_account_count", {
      p_fingerprint_hash: state.fingerprintHash,
    });

    if (error) {
      console.error("Check account count error:", error);
      return { canProceed: true }; // Allow on error (fail open)
    }

    if ((data as number) >= 3) {
      return { 
        canProceed: false, 
        error: "Đã đạt giới hạn 3 tài khoản trên thiết bị này" 
      };
    }

    return { canProceed: true };
  }, [state.fingerprintHash, state.isBlocked, state.isPermanentBlock, state.blockExpiresAt]);

  // Record login attempt
  const recordLoginAttempt = useCallback(async (
    email: string,
    success: boolean,
    failureReason?: string
  ): Promise<SecurityCheckResult> => {
    if (!state.fingerprintHash) {
      return { canProceed: false, error: "Không thể xác định thiết bị" };
    }

    const behaviorScore = getBehaviorScore();

    try {
      const { data, error } = await supabase.rpc("record_login_attempt", {
        p_fingerprint_hash: state.fingerprintHash,
        p_email: email,
        p_ip_address: null, // Will be captured server-side if needed
        p_user_agent: navigator.userAgent,
        p_success: success,
        p_failure_reason: failureReason || null,
        p_behavior_score: behaviorScore,
      });

      if (error) throw error;

      const result = data as { 
        blocked: boolean; 
        reason?: string; 
        expires_at?: string; 
        permanent?: boolean;
        attempts_remaining?: number;
      };

      if (result.blocked) {
        setState(prev => ({
          ...prev,
          isBlocked: true,
          blockReason: result.reason || null,
          blockExpiresAt: result.expires_at ? new Date(result.expires_at) : null,
          isPermanentBlock: result.permanent || false,
        }));

        return {
          canProceed: false,
          error: result.permanent
            ? "Thiết bị đã bị khóa vĩnh viễn do đăng nhập sai quá nhiều lần"
            : `Thiết bị bị khóa. Thử lại sau ${formatTimeRemaining(result.expires_at ? new Date(result.expires_at) : null)}`,
        };
      }

      if (result.attempts_remaining !== undefined) {
        setState(prev => ({ ...prev, attemptsRemaining: result.attempts_remaining! }));
      }

      return { 
        canProceed: true, 
        attemptsRemaining: result.attempts_remaining 
      };
    } catch (error) {
      console.error("Record login attempt error:", error);
      return { canProceed: true }; // Allow on error (fail open)
    }
  }, [state.fingerprintHash, getBehaviorScore]);

  // Register device after successful signup
  const registerDeviceAccount = useCallback(async (): Promise<boolean> => {
    if (!state.fingerprintHash) return false;

    try {
      const { data, error } = await supabase.rpc("register_device_account", {
        p_fingerprint_hash: state.fingerprintHash,
        p_metadata: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      });

      if (error) throw error;
      return (data as { success: boolean }).success;
    } catch (error) {
      console.error("Register device account error:", error);
      return false;
    }
  }, [state.fingerprintHash]);

  // Link user to device after successful login
  const linkUserToDevice = useCallback(async (userId: string): Promise<void> => {
    if (!state.fingerprintHash) return;

    try {
      await supabase.rpc("link_user_device", {
        p_user_id: userId,
        p_fingerprint_hash: state.fingerprintHash,
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Link user device error:", error);
    }
  }, [state.fingerprintHash]);

  return {
    ...state,
    startBehaviorTracking,
    stopBehaviorTracking,
    getBehaviorScore,
    checkRegistrationAllowed,
    recordLoginAttempt,
    registerDeviceAccount,
    linkUserToDevice,
  };
}

// Helper function to format time remaining
function formatTimeRemaining(expiresAt: Date | null): string {
  if (!expiresAt) return "";
  
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  
  if (diff <= 0) return "vài giây";
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours} giờ ${minutes % 60} phút`;
  }
  return `${minutes} phút`;
}
