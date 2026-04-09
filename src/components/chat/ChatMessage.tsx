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
          isUser ? "flex-row-reverse" : "flex-row max-sm:flex-col"
        )}
      >
        {isUser ? (
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-chat-user text-chat-user-foreground">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground">
            <Bot className="w-4 h-4" />
          </div>
        )}

        <div className={cn("flex flex-col", isUser ? "max-w-[80%]" : "max-w-[80%] max-sm:max-w-full")}>
          <div
            className={cn(
              isUser
                ? "rounded-2xl px-4 py-3 bg-chat-user text-chat-user-foreground rounded-tr-md"
                : "px-1 py-1 text-chat-assistant-foreground"
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
              <div className="ai-response-clean">
                <MessageContent content={message.content} />
              </div>
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
