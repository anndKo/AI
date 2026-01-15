import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LoginRequiredDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function LoginRequiredDialog({ open, onClose, onLogin }: LoginRequiredDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vui lòng đăng nhập</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn cần đăng nhập để gửi câu hỏi và sử dụng lượt hỏi của tài khoản.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Từ chối</AlertDialogCancel>
          <AlertDialogAction onClick={onLogin}>Đăng nhập</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
