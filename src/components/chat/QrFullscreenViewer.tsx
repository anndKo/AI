import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface QrFullscreenViewerProps {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
}

export function QrFullscreenViewer({
  open,
  imageUrl,
  onClose,
}: QrFullscreenViewerProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-code-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading QR code:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/90">
        <div className="relative w-full h-[90vh] flex items-center justify-center">
          <img
            src={imageUrl}
            alt="QR Code Fullscreen"
            className="max-w-full max-h-full object-contain"
          />

          <Button
            size="icon"
            variant="destructive"
            className="absolute top-4 right-4 rounded-full"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>

          <Button
            size="lg"
            className="absolute bottom-4 left-4 gap-2 bg-white hover:bg-gray-100 text-black"
            onClick={handleDownload}
          >
            <Download className="w-5 h-5" />
            Tải về
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
