import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface BillUploaderProps {
  currentImage: string;
  onImageChange: (url: string) => void;
  userId: string;
}

export function BillUploader({ currentImage, onImageChange, userId }: BillUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!currentImage) {
        setPreviewUrl("");
        return;
      }

      // Backwards-compatible: accept an already-absolute URL
      if (/^https?:\/\//i.test(currentImage)) {
        setPreviewUrl(currentImage);
        return;
      }

      const { data, error } = await supabase.storage
        .from("bills")
        .createSignedUrl(currentImage, 60 * 30);

      if (cancelled) return;

      if (error) {
        console.error("Signed URL error:", error);
        setPreviewUrl("");
        return;
      }

      setPreviewUrl(data.signedUrl);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [currentImage]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ hỗ trợ file ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File quá lớn, tối đa 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `bill-${Date.now()}.${fileExt}`;
      // Store bills under the user's folder so storage RLS can enforce ownership
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("bills")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Persist the storage object path (not a public URL)
      onImageChange(filePath);
      toast.success("Tải bill thành công!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Lỗi tải ảnh lên");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onImageChange("");
  };

  return (
    <div className="space-y-2">
      <Label>Bill chuyển khoản</Label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {currentImage ? (
        <div className="relative inline-block">
          <img
            src={previewUrl || currentImage}
            alt="Bill"
            className="w-full max-w-xs h-auto object-contain border rounded-lg bg-white"
          />
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
            title="Xóa ảnh"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full max-w-xs h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
        >
          <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">Bấm để tải bill</span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="gap-2"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {uploading ? "Đang tải..." : "Tải ảnh từ thiết bị"}
      </Button>
    </div>
  );
}
