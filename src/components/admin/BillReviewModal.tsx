import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Loader2, Eye } from "lucide-react";

interface PaymentRequest {
  id: string;
  user_id: string;
  amount: number;
  questions_count: number;
  bill_image: string;
  status: string;
  created_at: string;
  profiles?: { email: string };
}

interface BillReviewModalProps {
  open: boolean;
  request: PaymentRequest | null;
  onClose: () => void;
  onApprove: () => void;
}

export function BillReviewModal({
  open,
  request,
  onClose,
  onApprove,
}: BillReviewModalProps) {
  const [approvalDays, setApprovalDays] = useState("30");
  const [approvalQuestions, setApprovalQuestions] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  if (!request) return null;

  const handleApprove = async () => {
    if (!approvalDays || !approvalQuestions) {
      toast.error("Vui lòng nhập số ngày và số câu hỏi");
      return;
    }

    setApproving(true);
    try {
      const { error: updateError } = await supabase
        .from("payment_requests")
        .update({
          status: "approved",
          approved_days: parseInt(approvalDays),
          approved_questions: parseInt(approvalQuestions),
          approved_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // Add bonus questions to user
      const { error: bonusError } = await supabase.rpc("add_bonus_questions", {
        _user_id: request.user_id,
        _amount: parseInt(approvalQuestions),
      });

      if (bonusError) throw bonusError;

      // Update plan expires date
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + parseInt(approvalDays));

      const { error: quotaError } = await supabase
        .from("user_quotas")
        .update({
          plan_expires_at: expiresDate.toISOString(),
        })
        .eq("user_id", request.user_id);

      if (quotaError) throw quotaError;

      toast.success("Đã duyệt yêu cầu thanh toán");
      onApprove();
      onClose();
      setApprovalDays("30");
      setApprovalQuestions("");
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Lỗi duyệt yêu cầu");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    setRejecting(true);
    try {
      const { error } = await supabase
        .from("payment_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
        })
        .eq("id", request.id);

      if (error) throw error;

      toast.success("Đã từ chối yêu cầu");
      onApprove();
      onClose();
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Lỗi từ chối yêu cầu");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duyệt yêu cầu thanh toán</DialogTitle>
            <DialogDescription>
              Email: {request.profiles?.email || request.user_id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Bill Image */}
            <div className="space-y-2">
              <Label>Ảnh bill/Chứng chỉ chuyển khoản</Label>
              <div
                className="border rounded-lg overflow-hidden cursor-pointer hover:opacity-80"
                onClick={() => setShowFullImage(true)}
              >
                <img
                  src={request.bill_image}
                  alt="Bill"
                  className="w-full h-auto max-h-64 object-contain"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFullImage(true)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Xem toàn màn hình
              </Button>
            </div>

            {/* Payment Info */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Số tiền:</span>
                <span className="font-semibold">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(request.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Số câu hỏi yêu cầu:</span>
                <span className="font-semibold">{request.questions_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Ngày gửi:</span>
                <span>
                  {new Date(request.created_at).toLocaleDateString("vi-VN")}
                </span>
              </div>
            </div>

            {/* Approval Form */}
            <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950">
              <h4 className="font-semibold text-green-700 dark:text-green-300">
                Duyệt yêu cầu
              </h4>
              <div>
                <Label htmlFor="days">Số ngày gia hạn</Label>
                <Input
                  id="days"
                  type="number"
                  value={approvalDays}
                  onChange={(e) => setApprovalDays(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor="questions">Số lượt hỏi</Label>
                <Input
                  id="questions"
                  type="number"
                  value={approvalQuestions}
                  onChange={(e) => setApprovalQuestions(e.target.value)}
                  placeholder={request.questions_count.toString()}
                />
              </div>
              <Button
                onClick={handleApprove}
                disabled={approving || rejecting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {approving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang duyệt...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Duyệt
                  </>
                )}
              </Button>
            </div>

            {/* Rejection Form */}
            <div className="space-y-4 p-4 border rounded-lg bg-red-50 dark:bg-red-950">
              <h4 className="font-semibold text-red-700 dark:text-red-300">
                Từ chối yêu cầu
              </h4>
              <div>
                <Label htmlFor="reason">Lý do từ chối</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Nhập lý do từ chối..."
                />
              </div>
              <Button
                onClick={handleReject}
                disabled={approving || rejecting}
                variant="destructive"
                className="w-full"
              >
                {rejecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang từ chối...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Từ chối
                  </>
                )}
              </Button>
            </div>

            {/* Close Button */}
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
              disabled={approving || rejecting}
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Screen Image Modal */}
      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={request.bill_image}
              alt="Bill full view"
              className="w-full h-full object-contain"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-4 right-4"
              onClick={() => setShowFullImage(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
