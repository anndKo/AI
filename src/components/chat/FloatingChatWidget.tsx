import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Loader2, Minimize2, Maximize2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuota } from "@/hooks/useQuota";
import { toast } from "sonner";
import { MessageContent } from "./MessageContent";
import logoImg from "@/assets/logo.png";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const MAX_IMAGES = 12;

export function FloatingChatWidget() {
  const { user, isAuthenticated } = useAuth();
  const { quota, isAdmin, useOneQuestion, fetchQuota } = useQuota();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Paste handler for Ctrl+V images
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const f = items[i].getAsFile();
          if (f) imageFiles.push(f);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        processFiles(imageFiles);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [isOpen, images.length]);

  const processFiles = useCallback((files: File[]) => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) { toast.error(`Tối đa ${MAX_IMAGES} ảnh`); return; }
    files.slice(0, remaining).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => prev.length >= MAX_IMAGES ? prev : [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, [images.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const remainingQuestions = isAdmin ? 999 : (quota ? quota.remaining + quota.bonus : 0);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text && images.length === 0) return;
    if (isLoading) return;

    if (!isAuthenticated) { toast.error("Vui lòng đăng nhập để sử dụng chat"); return; }
    if (!isAdmin && remainingQuestions <= 0) { toast.error("Bạn đã hết lượt hỏi. Vui lòng mua thêm."); return; }

    if (!isAdmin) {
      const allowed = await useOneQuestion();
      if (!allowed) { toast.error("Hết lượt hỏi hôm nay"); return; }
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text, images: images.length > 0 ? [...images] : undefined };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setImages([]);
    setIsLoading(true);

    // Build API messages - include images as base64 in content
    const apiMessages = [...messages, userMsg].map(m => {
      if (m.images && m.images.length > 0) {
        return {
          role: m.role,
          content: [
            { type: "text", text: m.content || "Hãy phân tích ảnh này" },
            ...m.images.map(img => ({ type: "image_url", image_url: { url: img } })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    let assistantContent = "";
    const assistantId = crypto.randomUUID();

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === assistantId) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { id: assistantId, role: "assistant", content: assistantContent }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {}
        }
      }
      await fetchQuota();
    } catch (error) {
      console.error("Chat widget error:", error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
      if (!assistantContent) setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
    }
  }, [input, images, isLoading, messages, isAuthenticated, isAdmin, remainingQuestions, useOneQuestion, fetchQuota]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[60] group"
        title="Chat AI"
      >
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center">
          <img src={logoImg} alt="Nurovi AI" className="w-9 h-9 rounded-full object-contain" />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
        </div>
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed z-[60] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200",
      isMaximized
        ? "bottom-2 right-2 left-2 top-16 sm:bottom-4 sm:right-4 sm:left-auto sm:top-20 sm:w-[520px] sm:h-[650px]"
        : "bottom-4 right-4 w-[380px] h-[560px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Nurovi" className="w-7 h-7 rounded-lg object-contain" />
          <span className="text-sm font-semibold text-foreground">Nurovi AI</span>
          {isAuthenticated && !isAdmin && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {remainingQuestions} lượt
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsMaximized(!isMaximized)} className="h-7 w-7">
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-7 w-7">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <img src={logoImg} alt="Nurovi" className="w-14 h-14 rounded-2xl shadow-lg shadow-primary/20 object-contain" />
            <p className="text-sm font-medium text-foreground">Xin chào! 👋</p>
            <p className="text-xs text-muted-foreground">Hỏi AI bất cứ điều gì!</p>
            <p className="text-[10px] text-muted-foreground/60">Hỗ trợ gửi ảnh (tối đa 12)</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
              msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
            )}>
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {msg.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1">
                  <MessageContent content={msg.content} />
                </div>
              ) : (
                msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-1.5">
          {images.map((img, i) => (
            <div key={i} className="relative">
              <img src={img} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[8px]">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          <span className="self-end text-[9px] text-muted-foreground">{images.length}/{MAX_IMAGES}</span>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-2">
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
        <div className="flex items-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <ImagePlus className="w-4 h-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi hoặc dán ảnh..."
            className="min-h-[36px] max-h-[100px] text-sm resize-none border-0 bg-muted/50 rounded-xl focus-visible:ring-1"
            rows={1}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={(!input.trim() && images.length === 0) || isLoading}
            className="h-8 w-8 rounded-xl flex-shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
