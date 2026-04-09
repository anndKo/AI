import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "./CodeBlock";

interface MessageContentProps {
  content: string;
}

export const MessageContent = memo(function MessageContent({ content }: MessageContentProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed
      prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
      prose-p:my-1.5 prose-p:leading-relaxed
      prose-ul:my-1.5 prose-ol:my-1.5
      prose-li:my-0.5
      prose-strong:text-foreground prose-strong:font-semibold
      prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
    ">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            
            if (match || codeString.includes("\n")) {
              return <CodeBlock code={codeString} language={match?.[1]} />;
            }
            
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
