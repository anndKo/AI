import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle } from "lucide-react";
import { PaymentModal } from "@/components/payment/PaymentModal";

export function QuotaExhausted() {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center p-6 bg-destructive/10 border border-destructive/20 rounded-lg mx-4 my-2">
        <AlertCircle className="w-12 h-12 text-destructive mb-3" />
        <h3 className="font-semibold text-lg text-destructive mb-2">
          Bạn đã hết lượt dùng
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Mua thêm lượt hỏi để tiếp tục sử dụng
        </p>
        <Button onClick={() => setShowPayment(true)} className="gap-2">
          <CreditCard className="w-4 h-4" />
          Thanh toán ngay
        </Button>
      </div>

      <PaymentModal open={showPayment} onClose={() => setShowPayment(false)} />
    </>
  );
}
