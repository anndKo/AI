import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-chat-assistant text-chat-assistant-foreground rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-chat-border">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-typing-dot" style={{ animationDelay: "0s" }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-typing-dot" style={{ animationDelay: "0.2s" }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-typing-dot" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  );
}
