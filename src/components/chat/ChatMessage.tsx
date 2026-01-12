import { useState, memo } from "react";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import type { Message } from "@/hooks/useChat";
import { ImageViewer } from "./ImageViewer";
import { MessageContent } from "./MessageContent";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [viewingImage, setViewingImage] = useState<string | null>(null);

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

        <div
          className={cn(
            "max-w-[80%] rounded-2xl px-4 py-3",
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
