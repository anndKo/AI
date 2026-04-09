import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Sparkles } from "lucide-react";
import { PaymentModal } from "@/components/payment/PaymentModal";

export function QuotaExhausted() {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center p-6 bg-muted/50 border border-border/60 rounded-xl mx-4 my-2 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-semibold text-base text-foreground mb-1">
          Bạn đã hết lượt sử dụng
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Nâng cấp gói để tiếp tục trải nghiệm AI
        </p>
        <Button onClick={() => setShowPayment(true)} className="gap-2 rounded-xl">
          <CreditCard className="w-4 h-4" />
          Mua thêm lượt
        </Button>
      </div>

      <PaymentModal open={showPayment} onClose={() => setShowPayment(false)} />
    </>
  );
}
