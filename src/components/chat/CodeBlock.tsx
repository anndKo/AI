import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock = memo(function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Đã sao chép code");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Không thể sao chép");
    }
  }, [code]);

  // Double-click to copy
  const handleDoubleClick = useCallback(() => {
    handleCopy();
  }, [handleCopy]);

  return (
    <div 
      ref={codeRef} 
      className="relative my-3 group"
      onDoubleClick={handleDoubleClick}
    >
      {/* Header with language label and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border border-b-0 border-border rounded-t-lg">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
            "hover:bg-accent",
            copied 
              ? "text-green-600 dark:text-green-400" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Đã sao chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <pre className="bg-zinc-900 dark:bg-zinc-950 border border-t-0 border-border rounded-b-lg p-4 overflow-x-auto cursor-text">
        <code className="text-sm font-mono text-zinc-100 whitespace-pre-wrap break-words">
          {code}
        </code>
      </pre>
      
      {/* Tooltip for double-click */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="text-[10px] text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded">
          Nhấp đúp để sao chép
        </span>
      </div>
    </div>
  );
});