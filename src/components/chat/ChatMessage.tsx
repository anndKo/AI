import { useState, memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Bot, User, Copy, Check } from "lucide-react";
import type { Message } from "@/hooks/useChat";
import { ImageViewer } from "./ImageViewer";
import { MessageContent } from "./MessageContent";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Đã sao chép!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Không thể sao chép");
    }
  }, [message.content]);

  return (
    <>
      <div
        className={cn(
          "flex gap-3 animate-fade-in",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            isUser
              ? "bg-chat-user text-chat-user-foreground"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        <div className="flex flex-col max-w-[80%]">
          <div
            className={cn(
              "rounded-2xl px-4 py-3",
              isUser
                ? "bg-chat-user text-chat-user-foreground rounded-tr-md"
                : "bg-chat-assistant text-chat-assistant-foreground rounded-tl-md shadow-sm border border-chat-border"
            )}
          >
            {message.images && message.images.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {message.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Uploaded ${index + 1}`}
                    className="max-w-full max-h-64 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setViewingImage(img)}
                  />
                ))}
              </div>
            )}
            {isUser ? (
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {message.content}
              </div>
            ) : (
              <MessageContent content={message.content} />
            )}
          </div>

          {/* Copy button for AI responses */}
          {!isUser && message.content && (
            <div className="flex justify-start mt-1.5 ml-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {viewingImage && (
        <ImageViewer
          src={viewingImage}
          alt="Full size image"
          onClose={() => setViewingImage(null)}
        />
      )}
    </>
  );
});
