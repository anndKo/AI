import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChatMessage } from "./ChatMessage";
import logoImg from "@/assets/logo.png";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ChatSidebar } from "./ChatSidebar";
import { QuotaExhausted } from "./QuotaExhausted";
import { LoginRequiredDialog } from "./LoginRequiredDialog";
import { StudyModal } from "./StudyModal";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { useQuota } from "@/hooks/useQuota";
import { Bot, Sparkles, Trash2, RefreshCw, Shield, Square, BookOpen, Zap, MessageSquare, Image as ImageIcon, Send, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db } from "@/lib/supabaseAny";
import { toast } from "sonner";

export function ChatContainer() {
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage, clearChat, currentSessionId, selectSession, stopGeneration } = useChat();
  const { user, isAuthenticated } = useAuth();
  const { quota, isAdmin, canAsk, useOneQuestion, fetchQuota } = useQuota();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);

  useEffect(() => { if (!userScrolledUp) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading, userScrolledUp]);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    setUserScrolledUp(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  useEffect(() => { if (!isLoading) setUserScrolledUp(false); }, [isLoading]);

  const showWelcome = messages.length === 0;
  const handleNewChat = useCallback(() => clearChat(), [clearChat]);
  const handleReload = useCallback(() => window.location.reload(), []);

  const handleClearChat = useCallback(async () => {
    if (isAuthenticated && currentSessionId) {
      try {
        await db.from("chat_messages").delete().eq("session_id", currentSessionId);
        await db.from("chat_sessions").delete().eq("id", currentSessionId);
      } catch (error) { console.error("Error deleting chat:", error); }
    }
    clearChat();
    toast.success("Đã xóa cuộc trò chuyện");
  }, [isAuthenticated, currentSessionId, clearChat]);

  const handleSendMessage = useCallback(async (content: string, images?: string[], mode?: any) => {
    if (!isAuthenticated) { setLoginRequiredOpen(true); return; }
    const canSend = await useOneQuestion();
    if (!canSend) return;
    try {
      const { generateFingerprint } = await import("@/lib/deviceFingerprint");
      const fp = await generateFingerprint();
      await db.rpc("check_and_use_device_quota", { p_fingerprint_hash: fp.hash });
    } catch (e) { console.error("Device quota check error:", e); }
    sendMessage(content, images, mode);
  }, [isAuthenticated, useOneQuestion, sendMessage]);

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); setUserScrolledUp(false); }, []);

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar currentSessionId={currentSessionId} onSelectSession={selectSession} onNewChat={handleNewChat} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="flex items-center justify-between px-4 lg:px-6 py-2.5 bg-card/60 backdrop-blur-2xl border-b border-border/40 sticky top-0 z-10">
          <div className="flex items-center gap-3 ml-12 lg:ml-0">
            <div className="relative">
              <img src={logoImg} alt="Nurovi" className="w-9 h-9 rounded-xl object-contain" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm tracking-tight">Nurovi</h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block leading-none mt-0.5">
                {isAuthenticated && quota ? `${quota.remaining + quota.bonus} lượt còn lại` : "Trợ lý AI thông minh"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate("/learning")} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl" title="Học tập">
              <BookOpen className="w-4 h-4" />
            </Button>
            {isAuthenticated && quota ? (
              <div className="flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary gap-1" title="Số lượt hỏi còn lại">
                <Zap className="w-3 h-3" />{quota.remaining + quota.bonus}
              </div>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate("/auth")} className="text-xs rounded-xl h-7 px-3 text-[11px]">Đăng nhập</Button>
            )}
            {isAdmin && <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="h-8 w-8 text-muted-foreground hover:text-primary rounded-xl" title="Admin"><Shield className="w-4 h-4" /></Button>}
            <Button variant="ghost" size="icon" onClick={handleReload} className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl" title="Tải lại"><RefreshCw className="w-3.5 h-3.5" /></Button>
            <ThemeToggle />
            {messages.length > 0 && <Button variant="ghost" size="icon" onClick={handleClearChat} className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-xl" title="Xóa chat"><Trash2 className="w-3.5 h-3.5" /></Button>}
          </div>
        </header>

        <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-5">
            {showWelcome && (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="relative mb-8"><img src={logoImg} alt="Nurovi" className="w-20 h-20 rounded-3xl shadow-2xl shadow-primary/30 object-contain" /></div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 tracking-tight text-center">Xin chào! 👋</h2>
                <p className="text-muted-foreground text-center max-w-md mb-8 text-sm leading-relaxed">
                  {isAuthenticated ? "Tôi là trợ lý AI thông minh, sẵn sàng giúp bạn mọi lúc." : "Đăng nhập để bắt đầu trò chuyện với AI."}
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-10">
                  {[{ icon: <Zap className="w-3.5 h-3.5" />, label: "Siêu nhanh" }, { icon: <ImageIcon className="w-3.5 h-3.5" />, label: "Phân tích ảnh" }, { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Streaming" }, { icon: <BookOpen className="w-3.5 h-3.5" />, label: "Học tập" }].map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50 text-xs text-muted-foreground backdrop-blur-sm">{f.icon}<span>{f.label}</span></div>
                  ))}
                </div>
              </div>
            )}
            {messages.map(message => <ChatMessage key={message.id} message={message} />)}
            {isLoading && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {userScrolledUp && <Button variant="secondary" size="icon" onClick={scrollToBottom} className="absolute bottom-28 right-6 h-9 w-9 rounded-full shadow-lg border border-border/50 z-10 animate-in fade-in duration-200"><ArrowDown className="w-4 h-4" /></Button>}
        {isAuthenticated && !canAsk() && <QuotaExhausted />}

        <div className="px-4 lg:px-6 pb-4 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSendMessage} isLoading={isLoading} onStop={stopGeneration} disabled={isAuthenticated && !canAsk()} />
            <p className="text-[10px] text-muted-foreground/50 text-center mt-2">Enter gửi • Shift+Enter xuống dòng • Ctrl+V dán ảnh</p>
          </div>
        </div>

        <LoginRequiredDialog open={loginRequiredOpen} onClose={() => setLoginRequiredOpen(false)} onLogin={() => { setLoginRequiredOpen(false); navigate("/auth"); }} />
        <StudyModal open={studyOpen} onClose={() => setStudyOpen(false)} />
      </div>
    </div>
  );
}
