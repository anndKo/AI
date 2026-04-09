import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction } from "@/components/ui/alert-dialog";
import { db } from "@/lib/supabaseAny";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Check, X, CreditCard, Package, Download, ZoomIn, Clock } from "lucide-react";
import { BillUploader } from "./BillUploader";
import { ImageViewer } from "@/components/chat/ImageViewer";

interface PaymentPackage { id: string; name: string; description: string | null; price: number; questions_count: number; package_type: string; duration_days: number | null; image_url: string | null; }
interface PaymentInfo { bank_name: string; account_number: string; account_name: string; qr_image: string; }
interface PaymentModalProps { open: boolean; onClose: () => void; }

export function PaymentModal({ open, onClose }: PaymentModalProps) {
  const { user } = useAuth();
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null);
  const [step, setStep] = useState<"packages" | "confirm" | "upload">("packages");
  const [loading, setLoading] = useState(false);
  const [billImage, setBillImage] = useState("");
  const [showQrViewer, setShowQrViewer] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  useEffect(() => { if (open) { fetchPackages(); fetchPaymentInfo(); } }, [open]);

  const fetchPackages = async () => { const { data, error } = await db.from("payment_packages").select("*").eq("is_active", true).order("price", { ascending: true }); if (!error && data) setPackages(data as PaymentPackage[]); };
  const fetchPaymentInfo = async () => { const { data, error } = await db.from("app_settings").select("value").eq("key", "payment_info").single(); if (!error && data) setPaymentInfo(data.value as PaymentInfo); };

  const handleSubmitBill = async () => {
    if (!user || !selectedPackage) return;
    if (!billImage) { toast.error("Vui lòng tải bill chuyển khoản lên"); return; }
    setLoading(true);
    try {
      const { error } = await db.from("payment_requests").insert({ user_id: user.id, package_id: selectedPackage.id, amount: selectedPackage.price, questions_count: selectedPackage.questions_count, status: "pending", bill_image_url: billImage });
      if (error) throw error;
      setShowSuccessDialog(true);
    } catch (error) { console.error("Error creating payment request:", error); toast.error("Có lỗi xảy ra, vui lòng thử lại."); }
    finally { setLoading(false); }
  };

  const handleSuccessClose = () => { setShowSuccessDialog(false); handleClose(); };
  const handleClose = () => { setStep("packages"); setSelectedPackage(null); setBillImage(""); onClose(); };
  const handleBack = () => { if (step === "upload") setStep("confirm"); else if (step === "confirm") { setStep("packages"); setSelectedPackage(null); } };
  const formatPrice = (price: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  const getPackageTypeLabel = (type: string, days: number | null) => { if (type === "daily" && days) return `${days} ngày`; if (type === "monthly" && days) return `${Math.round(days / 30)} tháng`; return "Một lần"; };

  return (
    <>
      <Dialog open={open} onOpenChange={next => { if (next) return; if (showQrViewer) { setShowQrViewer(false); return; } handleClose(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={e => { if (showQrViewer) e.preventDefault(); }} onEscapeKeyDown={e => { if (showQrViewer) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />{step === "packages" && "Mua thêm lượt hỏi"}{step === "confirm" && "Xác nhận thanh toán"}{step === "upload" && "Tải bill chuyển khoản"}</DialogTitle>
            <DialogDescription>{step === "packages" && "Chọn gói phù hợp với nhu cầu của bạn"}{step === "confirm" && "Chuyển khoản theo thông tin bên dưới"}{step === "upload" && "Tải ảnh bill để admin xác nhận"}</DialogDescription>
          </DialogHeader>
          {step === "packages" && (<div className="space-y-3 mt-4">{packages.length === 0 ? <p className="text-center text-muted-foreground py-8">Chưa có gói thanh toán nào.</p> : packages.map(pkg => (<div key={pkg.id} onClick={() => { setSelectedPackage(pkg); setStep("confirm"); }} className="p-4 border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><Package className="w-8 h-8 text-primary" /><div><h3 className="font-semibold">{pkg.name}</h3><p className="text-sm text-muted-foreground">{pkg.description}</p><p className="text-xs text-muted-foreground mt-1">{pkg.questions_count} câu hỏi • {getPackageTypeLabel(pkg.package_type, pkg.duration_days)}</p></div></div><div className="text-right"><p className="font-bold text-primary">{formatPrice(pkg.price)}</p></div></div></div>))}</div>)}
          {step === "confirm" && selectedPackage && (<div className="space-y-4 mt-4"><div className="p-4 bg-muted rounded-lg"><h3 className="font-semibold mb-2">Gói đã chọn: {selectedPackage.name}</h3><p className="text-sm">Số câu hỏi: {selectedPackage.questions_count}</p><p className="text-sm font-bold text-primary">Số tiền: {formatPrice(selectedPackage.price)}</p></div>{paymentInfo && (paymentInfo.bank_name || paymentInfo.qr_image) && (<div className="p-4 border rounded-lg"><h4 className="font-semibold mb-2">Thông tin chuyển khoản:</h4>{paymentInfo.bank_name && <p className="text-sm">Ngân hàng: {paymentInfo.bank_name}</p>}{paymentInfo.account_number && <p className="text-sm">Số TK: {paymentInfo.account_number}</p>}{paymentInfo.account_name && <p className="text-sm">Chủ TK: {paymentInfo.account_name}</p>}{paymentInfo.qr_image && <div className="mt-3"><img src={paymentInfo.qr_image} alt="QR Code" className="w-48 h-48 mx-auto border rounded cursor-pointer hover:opacity-80" onClick={() => setShowQrViewer(true)} /><div className="flex justify-center gap-2 mt-2"><Button variant="outline" size="sm" onClick={() => setShowQrViewer(true)} className="gap-1"><ZoomIn className="w-4 h-4" />Xem lớn</Button></div></div>}</div>)}<div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={handleBack}><X className="w-4 h-4 mr-1" />Quay lại</Button><Button className="flex-1" onClick={() => setStep("upload")}><Check className="w-4 h-4 mr-1" />Đã chuyển khoản</Button></div></div>)}
          {step === "upload" && selectedPackage && user && (<div className="space-y-4 mt-4"><div className="p-4 bg-muted rounded-lg"><h3 className="font-semibold mb-2">Gói: {selectedPackage.name}</h3><p className="text-sm font-bold text-primary">Số tiền: {formatPrice(selectedPackage.price)}</p></div><BillUploader currentImage={billImage} onImageChange={setBillImage} userId={user.id} /><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={handleBack} disabled={loading}><X className="w-4 h-4 mr-1" />Quay lại</Button><Button className="flex-1" onClick={handleSubmitBill} disabled={loading || !billImage}><Check className="w-4 h-4 mr-1" />{loading ? "Đang gửi..." : "Xác nhận gửi"}</Button></div></div>)}
        </DialogContent>
      </Dialog>
      {showQrViewer && paymentInfo?.qr_image && <ImageViewer src={paymentInfo.qr_image} alt="QR Code thanh toán" onClose={() => setShowQrViewer(false)} />}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}><AlertDialogContent className="max-w-sm"><AlertDialogHeader><div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"><Clock className="w-8 h-8 text-primary" /></div><AlertDialogTitle className="text-center">Yêu cầu đã được gửi!</AlertDialogTitle><AlertDialogDescription className="text-center">Vui lòng chờ admin xác nhận.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="sm:justify-center"><AlertDialogAction onClick={handleSuccessClose} className="min-w-[120px]">Đã hiểu</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
