import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDeviceSecurity } from "@/hooks/useDeviceSecurity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Mail, Lock, ArrowLeft, ShieldAlert, Clock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

const emailSchema = z.string().email("Email không hợp lệ");
const passwordSchema = z.string().min(6, "Mật khẩu tối thiểu 6 ký tự");

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, loading } = useAuth();
  const {
    isBlocked,
    blockReason,
    blockExpiresAt,
    isPermanentBlock,
    attemptsRemaining,
    isLoading: securityLoading,
    isAutomationDetected,
    startBehaviorTracking,
    stopBehaviorTracking,
    checkRegistrationAllowed,
    recordLoginAttempt,
    registerDeviceAccount,
    linkUserToDevice,
  } = useDeviceSecurity();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  // Start behavior tracking when form is focused
  useEffect(() => {
    startBehaviorTracking();
    return () => stopBehaviorTracking();
  }, [startBehaviorTracking, stopBehaviorTracking]);

  // Countdown timer for block
  useEffect(() => {
    if (!isBlocked || isPermanentBlock || !blockExpiresAt) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = blockExpiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown("");
        window.location.reload(); // Refresh to check block status
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isBlocked, isPermanentBlock, blockExpiresAt]);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate]);

  const validate = () => {
    const newErrors: typeof errors = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (!isLogin && password !== confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    
    if (!validate()) return;

    // Check if device is blocked
    if (isBlocked) {
      setSecurityError(
        isPermanentBlock 
          ? "Thiết bị đã bị khóa vĩnh viễn do vi phạm bảo mật" 
          : `Thiết bị tạm thời bị khóa. Vui lòng thử lại sau.`
      );
      return;
    }

    // Check for automation
    if (isAutomationDetected) {
      setSecurityError("Phát hiện hoạt động bất thường. Vui lòng thử lại sau.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        // Login flow
        const { error } = await signIn(email, password);
        
        if (error) {
          // Record failed attempt - Use generic error message
          const result = await recordLoginAttempt(email, false, "invalid_credentials");
          
          if (!result.canProceed) {
            setSecurityError(result.error || "Thiết bị đã bị khóa");
          } else {
            // Generic error - don't reveal if email exists
            toast.error("Thông tin đăng nhập không hợp lệ");
            if (result.attemptsRemaining !== undefined && result.attemptsRemaining <= 3) {
              setSecurityError(`Còn ${result.attemptsRemaining} lần thử trước khi bị khóa`);
            }
          }
        } else {
          // Record successful login
          await recordLoginAttempt(email, true);
          toast.success("Đăng nhập thành công");
          navigate("/");
        }
      } else {
        // Registration flow
        const regCheck = await checkRegistrationAllowed();
        
        if (!regCheck.canProceed) {
          setSecurityError(regCheck.error || "Không thể đăng ký");
          return;
        }

        const { error } = await signUp(email, password);
        
        if (error) {
          // Use generic message
          if (error.message.includes("already registered")) {
            toast.error("Thông tin đăng ký không hợp lệ");
          } else {
            toast.error("Thông tin đăng ký không hợp lệ");
          }
        } else {
          // Register device account
          await registerDeviceAccount();
          toast.success("Đăng ký thành công");
          navigate("/");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || securityLoading) {
    return (
      <div className="min-h-screen bg-chat-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show block screen
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-chat-bg flex flex-col">
        <div className="p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Thiết bị bị khóa
            </h1>
            <p className="text-muted-foreground mb-6">
              {isPermanentBlock 
                ? "Thiết bị này đã bị khóa vĩnh viễn do vi phạm bảo mật nghiêm trọng."
                : "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau."}
            </p>
            
            {!isPermanentBlock && countdown && (
              <div className="bg-muted rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-lg font-mono">
                  <Clock className="w-5 h-5" />
                  <span>{countdown}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Thời gian còn lại
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ quản trị viên.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chat-bg flex flex-col">
      <div className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {isLogin ? "Đăng nhập" : "Đăng ký"}
            </h1>
            <p className="text-muted-foreground mt-2 text-center">
              {isLogin
                ? "Đăng nhập để lưu lịch sử chat"
                : "Tạo tài khoản để lưu lịch sử chat"}
            </p>
          </div>

          {securityError && (
            <Alert variant="destructive" className="mb-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Cảnh báo bảo mật</AlertTitle>
              <AlertDescription>{securityError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isLogin ? "Đăng nhập" : "Đăng ký"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
                setSecurityError(null);
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? "Chưa có tài khoản? Đăng ký ngay"
                : "Đã có tài khoản? Đăng nhập"}
            </button>
          </div>

          {/* Security info */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              🔒 Được bảo vệ bởi hệ thống bảo mật nâng cao
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
