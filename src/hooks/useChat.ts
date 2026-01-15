import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { ResponseMode } from "@/components/chat/ChatInput";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function useChat() {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadSession = useCallback(async (sessionId: string) => {
    if (!isAuthenticated) return;

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = (data || []).map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        images: msg.images || [],
        timestamp: new Date(msg.created_at),
      }));

      setMessages(loadedMessages);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error("Error loading session:", error);
      toast.error("Không thể tải cuộc trò chuyện");
    }
  }, [isAuthenticated]);

  const createSession = useCallback(async (firstMessage: string) => {
    if (!user) return null;

    try {
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
      
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          title,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error("Error creating session:", error);
      return null;
    }
  }, [user]);

  const saveMessage = useCallback(async (sessionId: string, message: Message) => {
    if (!user) return;

    try {
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        user_id: user.id,
        role: message.role,
        content: message.content,
        images: message.images || [],
      });

      // Update session timestamp
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  }, [user]);

  const sendMessage = useCallback(async (content: string, images?: string[], mode: ResponseMode = "normal") => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      images,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    let sessionId = currentSessionId;

    // Create session if authenticated and no current session
    if (isAuthenticated && !sessionId) {
      sessionId = await createSession(content);
      if (sessionId) {
        setCurrentSessionId(sessionId);
      }
    }

    // Save user message if authenticated
    if (isAuthenticated && sessionId) {
      await saveMessage(sessionId, userMessage);
    }

    // Build message content for API
    const apiMessages = [...messages, userMessage].map((msg) => {
      if (msg.images && msg.images.length > 0) {
        const contentParts: any[] = [
          { type: "text", text: msg.content || "Phân tích ảnh này" },
        ];
        msg.images.forEach((img) => {
          contentParts.push({ type: "image_url", image_url: { url: img } });
        });
        return {
          role: msg.role,
          content: contentParts,
        };
      }
      return { role: msg.role, content: msg.content };
    });

    let assistantContent = "";
    let assistantMessageId = crypto.randomUUID();

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: assistantContent,
            timestamp: new Date(),
          },
        ];
      });
    };

    try {
      abortControllerRef.current = new AbortController();
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages, mode }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {}
        }
      }

      // Save assistant message if authenticated
      if (isAuthenticated && sessionId && assistantContent) {
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: assistantContent,
          timestamp: new Date(),
        };
        await saveMessage(sessionId, assistantMessage);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
      // Remove the failed user message if no response
      if (assistantContent === "") {
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, isAuthenticated, currentSessionId, createSession, saveMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const selectSession = useCallback((sessionId: string | null) => {
    if (sessionId) {
      loadSession(sessionId);
    } else {
      clearChat();
    }
  }, [loadSession, clearChat]);

  return { 
    messages, 
    isLoading, 
    sendMessage, 
    clearChat, 
    currentSessionId, 
    selectSession,
    refreshSessions: loadSession,
    stopGeneration,
  };
}
