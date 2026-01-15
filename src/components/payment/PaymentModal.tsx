import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";import { QrFullscreenViewer } from "@/components/chat/QrFullscreenViewer";import { toast } from "sonner";
import { Check, X, CreditCard, Package } from "lucide-react";

interface PaymentPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  questions_count: number;
  package_type: string;
  duration_days: number | null;
  image_url: string | null;
}

interface PaymentInfo {
  bank_name: string;
  account_number: string;
  account_name: string;
  qr_image: string;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaymentModal({ open, onClose }: PaymentModalProps) {
  const { user } = useAuth();
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null);
  const [step, setStep] = useState<"packages" | "confirm">("packages");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPackages();
      fetchPaymentInfo();
    }
  }, [open]);

  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from("payment_packages")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (!error && data) {
      setPackages(data);
    }
  };

  const fetchPaymentInfo = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "payment_info")
      .single();

    if (!error && data) {
      setPaymentInfo(data.value as unknown as PaymentInfo);
    }
  };

  const handleSelectPackage = (pkg: PaymentPackage) => {
    setSelectedPackage(pkg);
    setStep("confirm");
  };

  const handleConfirmPayment = async () => {
    if (!user || !selectedPackage) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("payment_requests").insert({
        user_id: user.id,
        package_id: selectedPackage.id,
        amount: selectedPackage.price,
        questions_count: selectedPackage.questions_count,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Đã gửi yêu cầu thanh toán! Vui lòng đợi admin duyệt.");
      onClose();
      setStep("packages");
      setSelectedPackage(null);
    } catch (error) {
      console.error("Error creating payment request:", error);
      toast.error("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setStep("packages");
    setSelectedPackage(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const getPackageTypeLabel = (type: string, days: number | null) => {
    if (type === "daily" && days) return `${days} ngày`;
    if (type === "monthly" && days) return `${Math.round(days / 30)} tháng`;
    return "Một lần";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {step === "packages" ? "Mua thêm lượt hỏi" : "Xác nhận thanh toán"}
          </DialogTitle>
          <DialogDescription>
            {step === "packages"
              ? "Chọn gói phù hợp với nhu cầu của bạn"
              : "Chuyển khoản và xác nhận để được duyệt"}
          </DialogDescription>
        </DialogHeader>

        {step === "packages" && (
          <div className="space-y-3 mt-4">
            {packages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Chưa có gói thanh toán nào. Vui lòng liên hệ admin.
              </p>
            ) : (
              packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg)}
                  className="p-4 border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="w-8 h-8 text-primary" />
                      <div>
                        <h3 className="font-semibold">{pkg.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {pkg.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pkg.questions_count} câu hỏi •{" "}
                          {getPackageTypeLabel(pkg.package_type, pkg.duration_days)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {formatPrice(pkg.price)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {step === "confirm" && selectedPackage && (
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Gói đã chọn: {selectedPackage.name}</h3>
              <p className="text-sm">Số câu hỏi: {selectedPackage.questions_count}</p>
              <p className="text-sm font-bold text-primary">
                Số tiền: {formatPrice(selectedPackage.price)}
              </p>
            </div>

            {paymentInfo && (paymentInfo.bank_name || paymentInfo.qr_image) && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Thông tin chuyển khoản:</h4>
                {paymentInfo.bank_name && (
                  <p className="text-sm">Ngân hàng: {paymentInfo.bank_name}</p>
                )}
                {paymentInfo.account_number && (
                  <p className="text-sm">Số TK: {paymentInfo.account_number}</p>
                )}
                {paymentInfo.account_name && (
                  <p className="text-sm">Chủ TK: {paymentInfo.account_name}</p>
                )}
                {paymentInfo.qr_image && (
                  <img
                    src={paymentInfo.qr_image}
                    alt="QR Code"
                    className="w-48 h-48 mx-auto mt-3 border rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowQrFullscreen(true)}
                    title="Bấm để xem toàn màn hình"
                  />
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-1" />
                Huỷ
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmPayment}
                disabled={loading}
              >
                <Check className="w-4 h-4 mr-1" />
                {loading ? "Đang gửi..." : "Xác nhận chuyển khoản"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* QR Fullscreen Viewer */}
      {paymentInfo?.qr_image && (
        <QrFullscreenViewer
          open={showQrFullscreen}
          imageUrl={paymentInfo.qr_image}
          onClose={() => setShowQrFullscreen(false)}
        />
      )}
    </Dialog>
  );
}
