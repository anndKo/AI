import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Brain, FileText, HelpCircle, Sparkles } from "lucide-react";

interface StudyProcessingIndicatorProps {
  type: "summarize" | "quiz" | "parse-quiz";
  className?: string;
}

const CONFIG = {
  summarize: {
    icon: Brain,
    title: "Đang tóm tắt tài liệu",
    color: "text-primary",
    bgColor: "bg-primary/10",
    ringColor: "ring-primary/30",
    steps: ["Đọc nội dung tệp...", "Phân tích cấu trúc...", "Trích xuất ý chính...", "Tổng hợp tóm tắt..."],
  },
  quiz: {
    icon: HelpCircle,
    title: "Đang tạo câu hỏi",
    color: "text-accent",
    bgColor: "bg-accent/10",
    ringColor: "ring-accent/30",
    steps: ["Phân tích nội dung...", "Xác định điểm chính...", "Tạo câu hỏi...", "Kiểm tra đáp án..."],
  },
  "parse-quiz": {
    icon: FileText,
    title: "Đang phân tích đề thi",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    ringColor: "ring-green-500/30",
    steps: ["Đọc nội dung đề...", "Nhận diện câu hỏi...", "Bóc tách đáp án...", "Xác minh kết quả..."],
  },
};

export function StudyProcessingIndicator({ type, className }: StudyProcessingIndicatorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState("");
  const config = CONFIG[type];
  const Icon = config.icon;

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(s => (s + 1) % config.steps.length);
    }, 3000);
    const dotInterval = setInterval(() => {
      setDots(d => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => { clearInterval(stepInterval); clearInterval(dotInterval); };
  }, [config.steps.length]);

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 gap-6", className)}>
      {/* Animated icon with rings */}
      <div className="relative">
        <div className={cn("absolute inset-0 rounded-full animate-ping opacity-20", config.bgColor)} style={{ animationDuration: "2s" }} />
        <div className={cn("absolute -inset-3 rounded-full ring-2 animate-pulse opacity-40", config.ringColor)} style={{ animationDuration: "2.5s" }} />
        <div className={cn("relative w-16 h-16 rounded-2xl flex items-center justify-center", config.bgColor)}>
          <Icon className={cn("w-8 h-8 animate-pulse", config.color)} />
        </div>
        <Sparkles className={cn("absolute -top-1 -right-1 w-4 h-4 animate-bounce", config.color)} style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{config.title}</h3>
        <p className="text-xs text-muted-foreground">{config.steps[currentStep]}{dots}</p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {config.steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              i === currentStep ? cn("w-6", config.color.replace("text-", "bg-")) : "w-1.5 bg-muted-foreground/20"
            )}
          />
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/60">Có thể mất 30-60 giây</p>
    </div>
  );
}
