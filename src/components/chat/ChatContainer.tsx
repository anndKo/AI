import { useEffect, useRef, useState, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ChatSidebar } from "./ChatSidebar";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { Bot, Sparkles, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export function ChatContainer() {
  const { messages, isLoading, sendMessage, clearChat, currentSessionId, selectSession } = useChat();
  const { isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const showWelcome = messages.length === 0;

  const handleNewChat = useCallback(() => {
    clearChat();
  }, [clearChat]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="flex h-screen bg-chat-bg">
      {/* Sidebar */}
      <ChatSidebar
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-chat-border">
          <div className="flex items-center gap-3 ml-12 lg:ml-0">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">AI Chat</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Trả lời siêu nhanh • Phân tích ảnh
                {!isAuthenticated && " • Đăng nhập để lưu lịch sử"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReload}
              className="text-muted-foreground hover:text-foreground"
              title="Tải lại trang"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <ThemeToggle />
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Xóa chat</span>
              </Button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {showWelcome && (
              <div className="flex flex-col items-center justify-center py-16 animate-slide-up">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Xin chào! 👋
                </h2>
                <p className="text-muted-foreground text-center max-w-md mb-8">
                  Tôi là AI Chat siêu nhanh. Hãy hỏi tôi bất cứ điều gì hoặc tải ảnh lên để phân tích!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {[
                    "Giải thích Machine Learning đơn giản",
                    "Viết email xin nghỉ phép",
                    "Tóm tắt nội dung một bài báo",
                    "Phân tích ảnh sản phẩm",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="text-left px-4 py-3 rounded-xl bg-card border border-chat-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <TypingIndicator />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
            <p className="text-xs text-muted-foreground text-center mt-2">
              Enter để gửi • Shift+Enter xuống dòng • Ctrl+V dán ảnh • Tối đa 12 ảnh
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
