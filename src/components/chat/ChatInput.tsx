import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ImagePlus, X, Loader2, ChevronDown, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MAX_IMAGES = 12;

export type ResponseMode = "normal" | "answer_only" | "code_only";

interface ChatInputProps {
  onSend: (message: string, images?: string[], mode?: ResponseMode) => void;
  isLoading: boolean;
  onStop?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, onStop, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [responseMode, setResponseMode] = useState<ResponseMode>("normal");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed && images.length === 0) return;
    onSend(trimmed, images.length > 0 ? images : undefined, responseMode);
    setInput("");
    setImages([]);
  }, [input, images, onSend, responseMode]);

  const modeLabels: Record<ResponseMode, string> = {
    normal: "Thông thường",
    answer_only: "Chỉ đáp án",
    code_only: "Chỉ code",
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ hỗ trợ file ảnh");
      return;
    }
    
    if (images.length >= MAX_IMAGES) {
      toast.error(`Tối đa ${MAX_IMAGES} ảnh`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImages((prev) => {
        if (prev.length >= MAX_IMAGES) return prev;
        return [...prev, result];
      });
    };
    reader.readAsDataURL(file);
  }, [images.length]);

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = MAX_IMAGES - images.length;
    
    if (fileArray.length > remainingSlots) {
      toast.error(`Chỉ có thể thêm ${remainingSlots} ảnh nữa`);
    }
    
    fileArray.slice(0, remainingSlots).forEach(processFile);
  }, [images.length, processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) processFiles(files);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle paste (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItems: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageItems.push(file);
        }
      }

      if (imageItems.length > 0) {
        e.preventDefault();
        processFiles(imageItems);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [processFiles]);

  return (
    <div
      className={cn(
        "relative bg-chat-input-bg border border-chat-border rounded-2xl transition-all duration-200",
        isDragOver && "border-primary ring-2 ring-primary/20"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {images.length > 0 && (
        <div className="p-3 pb-0">
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={image}
                  alt={`Preview ${index + 1}`}
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-20 w-20 rounded-lg border-2 border-dashed border-chat-border hover:border-primary/50 flex items-center justify-center transition-colors"
              >
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {images.length}/{MAX_IMAGES} ảnh
          </p>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="h-9 w-9 text-muted-foreground hover:text-foreground flex-shrink-0"
          disabled={images.length >= MAX_IMAGES}
        >
          <ImagePlus className="w-5 h-5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn hoặc dán ảnh (Ctrl+V)..."
          className="min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm will-change-auto"
          rows={1}
          autoComplete="off"
          spellCheck={false}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 flex-shrink-0 gap-1 border-border bg-card hover:bg-accent"
            >
              <span className="text-xs hidden sm:inline max-w-24 truncate">{modeLabels[responseMode]}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-52 bg-popover border border-border shadow-lg z-50"
          >
            <DropdownMenuItem
              onClick={() => setResponseMode("normal")}
              className={cn(
                "flex flex-col items-start gap-0.5 py-2 cursor-pointer",
                responseMode === "normal" && "bg-primary/10 text-primary"
              )}
            >
              <div className="font-medium">Trả lời thông thường</div>
              <div className="text-xs text-muted-foreground">Giải thích kèm đáp án</div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setResponseMode("answer_only")}
              className={cn(
                "flex flex-col items-start gap-0.5 py-2 cursor-pointer",
                responseMode === "answer_only" && "bg-primary/10 text-primary"
              )}
            >
              <div className="font-medium">Chỉ đáp án</div>
              <div className="text-xs text-muted-foreground">Không giải thích</div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setResponseMode("code_only")}
              className={cn(
                "flex flex-col items-start gap-0.5 py-2 cursor-pointer",
                responseMode === "code_only" && "bg-primary/10 text-primary"
              )}
            >
              <div className="font-medium">Chỉ code</div>
              <div className="text-xs text-muted-foreground">Trả lời code không giải thích</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isLoading && onStop ? (
          <Button
            onClick={onStop}
            size="icon"
            variant="destructive"
            className="h-9 w-9 rounded-xl flex-shrink-0"
            title="Dừng trả lời"
          >
            <Square className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={disabled || (!input.trim() && images.length === 0)}
            size="icon"
            className="h-9 w-9 rounded-xl flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 rounded-2xl flex items-center justify-center pointer-events-none">
          <div className="text-primary font-medium">Thả ảnh vào đây</div>
        </div>
      )}
    </div>
  );
}
