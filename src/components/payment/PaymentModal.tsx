import { useState, useEffect, useRef } from "react";
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
import { Check, X, CreditCard, Package, Upload, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

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
  const [step, setStep] = useState<"packages" | "confirm" | "bill">("packages");
  const [loading, setLoading] = useState(false);
  const [showQrFullscreen, setShowQrFullscreen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billImage, setBillImage] = useState<File | null>(null);
  const [billPreview, setBillPreview] = useState<string | null>(null);
  const [uploadingBill, setUploadingBill] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      fetchPackages();
      fetchPaymentInfo();
    } else {
      // Reset state when closing
      setStep("packages");
      setSelectedPackage(null);
      setBillImage(null);
      setBillPreview(null);
    }
  }, [open]);

  const fetchPackages = async () => {
    try {
      setDataLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("payment_packages")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (err) {
        setError("Không thể tải gói thanh toán");
        return;
      }
      
      if (data) {
        setPackages(data);
      }
    } catch (err) {
      console.error("Error fetching packages:", err);
      setError("Có lỗi khi tải dữ liệu");
    } finally {
      setDataLoading(false);
    }
  };

  const fetchPaymentInfo = async () => {
    try {
      const { data, error: err } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "payment_info")
        .single();

      if (err) {
        console.warn("No payment info found");
        return;
      }

      if (data) {
        setPaymentInfo(data.value as unknown as PaymentInfo);
      }
    } catch (err) {
      console.error("Error fetching payment info:", err);
    }
  };

  const handleSelectPackage = (pkg: PaymentPackage) => {
    setSelectedPackage(pkg);
    setStep("bill");
  };

  const handleBillImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5MB");
      return;
    }

    setBillImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setBillPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadBillImage = async (): Promise<string | null> => {
    if (!billImage || !user) return null;

    try {
      setUploadingBill(true);
      const fileExt = billImage.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `bills/${fileName}`;

      // Try to upload to payment_bills bucket, fallback to bills bucket
      let uploadError: any = null;
      let uploadedPath = "";

      // Try primary bucket first
      const { error: err1 } = await supabase.storage
        .from("payment_bills")
        .upload(filePath, billImage, { upsert: false });

      if (err1) {
        // If payment_bills doesn't exist, try bills bucket
        const { error: err2 } = await supabase.storage
          .from("bills")
          .upload(filePath, billImage, { upsert: false });

        if (err2) {
          uploadError = err2;
        } else {
          uploadedPath = "bills";
        }
      } else {
        uploadedPath = "payment_bills";
      }

      if (uploadError && !uploadedPath) {
        throw uploadError;
      }

      const bucketName = uploadedPath || "payment_bills";
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading bill:", error);
      toast.error("Lỗi upload ảnh bill. Vui lòng thử lại.");
      return null;
    } finally {
      setUploadingBill(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!user || !selectedPackage) return;

    // Validate bill image is selected
    if (!billImage) {
      toast.error("Vui lòng chọn ảnh bill/chứng chỉ chuyển khoản");
      return;
    }

    setLoading(true);
    try {
      // Upload bill image first
      const billUrl = await uploadBillImage();
      if (!billUrl) {
        toast.error("Lỗi upload ảnh bill");
        return;
      }

      // Create payment request with bill image
      const { error } = await supabase.from("payment_requests").insert({
        user_id: user.id,
        package_id: selectedPackage.id,
        amount: selectedPackage.price,
        questions_count: selectedPackage.questions_count,
        bill_image: billUrl,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Đã gửi yêu cầu thanh toán! Vui lòng đợi admin duyệt.");
      onClose();
      setStep("packages");
      setSelectedPackage(null);
      setBillImage(null);
      setBillPreview(null);
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
    setBillImage(null);
    setBillPreview(null);
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
            {step === "packages" ? "Mua thêm lượt hỏi" : step === "bill" ? "Tải ảnh bill" : "Xác nhận thanh toán"}
          </DialogTitle>
          <DialogDescription>
            {step === "packages"
              ? "Chọn gói phù hợp với nhu cầu của bạn"
              : step === "bill"
              ? "Tải ảnh bill/chứng chỉ chuyển khoản"
              : "Chuyển khoản và xác nhận để được duyệt"}
          </DialogDescription>
        </DialogHeader>

        {step === "packages" && (
          <div className="space-y-3 mt-4">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => {
                    fetchPackages();
                    fetchPaymentInfo();
                  }}
                >
                  Thử lại
                </Button>
              </div>
            )}
            {dataLoading && (
              <p className="text-center text-muted-foreground py-8">
                Đang tải dữ liệu...
              </p>
            )}
            {!dataLoading && packages.length === 0 && !error && (
              <p className="text-center text-muted-foreground py-8">
                Chưa có gói thanh toán nào. Vui lòng liên hệ admin.
              </p>
            )}
            {packages.length > 0 && (
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

        {step === "bill" && selectedPackage && (
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Gói đã chọn: {selectedPackage.name}</h3>
              <p className="text-sm">Số câu hỏi: {selectedPackage.questions_count}</p>
              <p className="text-sm font-bold text-primary">
                Số tiền: {formatPrice(selectedPackage.price)}
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="bill-image" className="text-base font-semibold">
                Tải ảnh bill/Chứng chỉ chuyển khoản
              </Label>
              <p className="text-sm text-muted-foreground">
                Tải ảnh screen shot hoặc ảnh bill chuyển khoản để xác nhận
              </p>

              <input
                ref={fileInputRef}
                id="bill-image"
                type="file"
                accept="image/*"
                onChange={handleBillImageSelect}
                className="hidden"
              />

              {!billPreview ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-muted rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="font-semibold">Bấm để chọn ảnh</p>
                    <p className="text-xs text-muted-foreground">
                      Hỗ trợ JPG, PNG. Tối đa 5MB
                    </p>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border">
                    <img
                      src={billPreview}
                      alt="Bill preview"
                      className="w-full h-48 object-contain bg-muted"
                    />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2 border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                  >
                    Chọn ảnh khác
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={loading || uploadingBill}
              >
                <X className="w-4 h-4 mr-1" />
                Huỷ
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setStep("confirm");
                }}
                disabled={!billPreview || loading || uploadingBill}
              >
                Tiếp tục
              </Button>
            </div>
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

            {/* Bill Preview */}
            {billPreview && (
              <div className="border rounded-lg p-3 bg-muted">
                <p className="text-sm font-semibold mb-2">Ảnh bill đã tải:</p>
                <img
                  src={billPreview}
                  alt="Bill"
                  className="w-full h-32 object-contain rounded"
                />
              </div>
            )}

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
                onClick={() => setStep("bill")}
                disabled={loading || uploadingBill}
              >
                <X className="w-4 h-4 mr-1" />
                Quay lại
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmPayment}
                disabled={loading || uploadingBill}
              >
                {uploadingBill || loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    {uploadingBill ? "Đang tải lên..." : "Đang gửi..."}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Gửi yêu cầu
                  </>
                )}
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
