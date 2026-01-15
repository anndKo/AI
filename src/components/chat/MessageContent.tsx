import { memo, useMemo } from "react";
import { CodeBlock } from "./CodeBlock";

interface MessageContentProps {
  content: string;
}

interface ContentPart {
  type: "text" | "code";
  content: string;
  language?: string;
}

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text.trim()) {
        parts.push({ type: "text", content: text });
      }
    }

    // Add code block
    parts.push({
      type: "code",
      content: match[2].trim(),
      language: match[1] || undefined,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text.trim()) {
      parts.push({ type: "text", content: text });
    }
  }

  return parts.length > 0 ? parts : [{ type: "text", content }];
}

function renderHighlightedText(text: string) {
  // Highlight **keywords** with a subtle background for readability
  const chunks = text.split(/(\*\*[^*]+\*\*)/g);
  return chunks.map((chunk, index) => {
    const isBold = chunk.startsWith("**") && chunk.endsWith("**") && chunk.length >= 4;
    if (!isBold) return chunk;

    const keyword = chunk.slice(2, -2);
    if (!keyword.trim()) return chunk;

    return (
      <span key={index} className="bg-muted text-foreground px-1 rounded">
        {keyword}
      </span>
    );
  });
}

export const MessageContent = memo(function MessageContent({ content }: MessageContentProps) {
  const parts = useMemo(() => parseContent(content), [content]);

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.type === "code") {
          return <CodeBlock key={index} code={part.content} language={part.language} />;
        }

        return (
          <div key={index} className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {renderHighlightedText(part.content)}
          </div>
        );
      })}
    </div>
  );
});
