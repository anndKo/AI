import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, ArrowRight, Upload, FileText, Check, X, Edit3, Image as ImageIcon,
  Keyboard, Play, RotateCcw, Shuffle, ChevronLeft, ChevronRight, Clock, Trash2,
  History, Save, Eye, Trophy, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import mammoth from "mammoth";
import { ImageViewer } from "./ImageViewer";
import { FloatingChatWidget } from "./FloatingChatWidget";
import { db } from "@/lib/supabaseAny";
import { useAuth } from "@/hooks/useAuth";

// ========================
// TYPES
// ========================
interface ParsedQuestion {
  question: string;
  options: string[];
  correct: string | null;
  image: string | null;
}

type Phase = "input" | "editor" | "quiz" | "history";

// ========================
// PARSE FUNCTIONS
// ========================
function parseQuestions(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalized.split(/(?=Câu\s+\d+\s*[.:]\s*)/i);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(/^Câu\s+\d+\s*[.:]\s*(.*)/is);
    if (!headerMatch) continue;

    const body = headerMatch[1].trim();
    const options: string[] = [];

    const bodyForOptions = "\n" + body;
    const optRegex2 = /\n\s*([A-Z])\s*[.)]\s*/gi;
    const optPositions: { letter: string; start: number }[] = [];

    let m: RegExpExecArray | null;
    while ((m = optRegex2.exec(bodyForOptions)) !== null) {
      optPositions.push({ letter: m[1].toUpperCase(), start: m.index + m[0].length });
    }

    let questionText = body;
    if (optPositions.length > 0) {
      const firstOptMatch = body.match(/\n?\s*[A-Z]\s*[.)]\s*/i);
      if (firstOptMatch && firstOptMatch.index !== undefined) {
        questionText = body.substring(0, firstOptMatch.index).trim();
      }
    }

    for (let i = 0; i < optPositions.length; i++) {
      const startIdx = optPositions[i].start;
      const nextOptMatch = i + 1 < optPositions.length
        ? bodyForOptions.substring(0, optPositions[i + 1].start).lastIndexOf("\n")
        : bodyForOptions.length;
      const optText = bodyForOptions.substring(startIdx, i + 1 < optPositions.length ? nextOptMatch : bodyForOptions.length).trim();
      options.push(optText);
    }

    if (questionText && options.length >= 2) {
      questions.push({ question: questionText, options, correct: null, image: null });
    }
  }

  return questions;
}

function detectCorrectFromHighlight(html: string, questions: ParsedQuestion[]): ParsedQuestion[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const allElements = doc.querySelectorAll("*");
  const highlightedTexts: string[] = [];
  allElements.forEach(el => {
    const style = (el as HTMLElement).getAttribute("style") || "";
    const isHighlighted =
      style.includes("background-color: yellow") ||
      style.includes("background-color:#ffff00") ||
      style.includes("background-color: #ffff00") ||
      style.includes("background: yellow") ||
      el.tagName === "MARK" ||
      (el as HTMLElement).classList?.contains("highlight");
    if (isHighlighted && el.textContent?.trim()) {
      highlightedTexts.push(el.textContent.trim());
    }
  });
  if (highlightedTexts.length === 0) return questions;

  return questions.map(q => {
    if (q.correct) return q;
    for (let i = 0; i < q.options.length; i++) {
      const optText = q.options[i].trim();
      for (const hl of highlightedTexts) {
        if (optText.includes(hl) || hl.includes(optText)) {
          return { ...q, correct: String.fromCharCode(65 + i) };
        }
      }
    }
    return q;
  });
}

// ========================
// COMPONENT
// ========================
export function QuizUploader({ onClose }: { onClose: () => void }) {
  const { user, isAuthenticated } = useAuth();

  const [phase, setPhase] = useState<Phase>("input");
  const [inputText, setInputText] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [manualAnswerText, setManualAnswerText] = useState("");
  const [showManualAnswer, setShowManualAnswer] = useState(false);

  // Quiz state
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answeredMap, setAnsweredMap] = useState<Record<number, { selected: string; correct: boolean }>>({});
  const [shuffled, setShuffled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageTargetIdx, setImageTargetIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Image viewer
  const [viewImage, setViewImage] = useState<string | null>(null);

  // History
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  // Timer
  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            clearInterval(timerRef.current!);
            setQuizFinished(true);
            toast.info("⏰ Hết thời gian!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [timerActive]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ========================
  // HISTORY (DB) - save with images & answers
  // ========================
  const loadHistory = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await db
        .from("study_history")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "quiz_upload")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setHistoryList(data || []);
    } catch (e) {
      console.error("Load history error:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated, user]);

  const saveToHistory = useCallback(async (qs: ParsedQuestion[], title?: string, extraData?: any) => {
    if (!isAuthenticated || !user) return;
    const historyTitle = title || (qs.length > 0 ? qs[0].question.slice(0, 60) : "Đề trắc nghiệm");
    // Save full data including images and answers
    const saveData = {
      questions: qs,
      inputText,
      ...extraData,
    };

    try {
      if (currentHistoryId) {
        await db.from("study_history").update({
          title: historyTitle,
          data: saveData as any,
          updated_at: new Date().toISOString(),
        }).eq("id", currentHistoryId);
      } else {
        const { data, error } = await db.from("study_history").insert({
          user_id: user.id,
          type: "quiz_upload",
          title: historyTitle,
          data: saveData as any,
        }).select().single();
        if (!error && data) setCurrentHistoryId(data.id);
      }
    } catch (e) {
      console.error("Save history error:", e);
    }
  }, [isAuthenticated, user, currentHistoryId, inputText]);

  const loadFromHistory = useCallback((item: any) => {
    const data = item.data as any;
    if (data?.questions) {
      setQuestions(data.questions as ParsedQuestion[]);
      setInputText(data.inputText || "");
      setCurrentHistoryId(item.id);
      setPhase("editor");
      toast.success("Đã mở đề từ lịch sử");
    }
  }, []);

  const deleteHistory = useCallback(async (id: string) => {
    try {
      await db.from("study_history").delete().eq("id", id);
      setHistoryList(prev => prev.filter(h => h.id !== id));
      toast.success("Đã xóa");
    } catch (e) {
      console.error(e);
    }
  }, []);

  // ========================
  // FILE UPLOAD
  // ========================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "txt" || ext === "md") {
        const text = await file.text();
        setInputText(text);
        toast.success(`Đã đọc ${file.name}`);
      } else if (ext === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
        const textResult = await mammoth.extractRawText({ arrayBuffer });
        setInputText(textResult.value);

        let parsed = parseQuestions(textResult.value);
        if (parsed.length > 0) {
          parsed = detectCorrectFromHighlight(htmlResult.value, parsed);
          const highlightCount = parsed.filter(q => q.correct).length;
          setQuestions(parsed);
          setPhase("editor");
          // Auto-save on parse
          setTimeout(() => saveToHistory(parsed), 500);
          toast.success(`Đã nhận diện ${parsed.length} câu hỏi` +
            (highlightCount > 0 ? `, ${highlightCount} đáp án từ highlight` : ""));
        } else {
          toast.info("Đã đọc file, hãy bấm 'Phân tích đề' để trích xuất câu hỏi");
        }
      } else {
        toast.error("Chỉ hỗ trợ .txt và .docx");
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể đọc file");
    }
    e.target.value = "";
  };

  // ========================
  // PARSE — auto-save after parsing
  // ========================
  const handleParse = () => {
    if (!inputText.trim()) { toast.error("Chưa có nội dung đề"); return; }
    const parsed = parseQuestions(inputText);
    if (parsed.length === 0) {
      toast.error("Không tìm thấy câu hỏi. Đảm bảo format: Câu 1: ... A. ... B. ...");
      return;
    }
    setQuestions(parsed);
    setPhase("editor");
    toast.success(`Đã phân tích ${parsed.length} câu hỏi`);
    // Auto-save to history
    setTimeout(() => saveToHistory(parsed), 500);
  };

  // ========================
  // MANUAL ANSWERS
  // ========================
  const toggleManualAnswer = () => {
    if (!showManualAnswer && questions.length > 0 && !manualAnswerText.trim()) {
      const template = questions.map((_, i) => `Câu ${i + 1}:`).join("\n");
      setManualAnswerText(template);
    }
    setShowManualAnswer(!showManualAnswer);
  };

  const handleApplyManualAnswers = () => {
    if (!manualAnswerText.trim()) { toast.error("Chưa nhập đáp án"); return; }
    const answerMap = new Map<number, string>();
    const lines = manualAnswerText.split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const match = line.match(/(?:c[aâ]u\s*)?(\d+)\s*[:.)\-]\s*([A-Za-z])/i);
      if (match) answerMap.set(parseInt(match[1]), match[2].toUpperCase());
    }
    if (answerMap.size === 0) { toast.error("Không tìm thấy đáp án. Dùng format: Câu 1: B"); return; }

    const updated = questions.map((q, i) => {
      const manual = answerMap.get(i + 1);
      if (manual && !q.correct) return { ...q, correct: manual };
      return q;
    });
    setQuestions(updated);
    setShowManualAnswer(false);
    setManualAnswerText("");
    toast.success(`Đã áp dụng ${answerMap.size} đáp án`);
    // Auto-save after applying answers
    setTimeout(() => saveToHistory(updated), 500);
  };

  // ========================
  // IMAGE UPLOAD
  // ========================
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || imageTargetIdx === null) return;
    const reader = new FileReader();
    reader.onload = () => {
      setQuestions(prev => {
        const updated = [...prev];
        updated[imageTargetIdx] = { ...updated[imageTargetIdx], image: reader.result as string };
        return updated;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setImageTargetIdx(null);
  };

  // ========================
  // EDITOR ACTIONS
  // ========================
  const updateQuestion = (idx: number, field: keyof ParsedQuestion, value: any) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    setQuestions(prev => {
      const updated = [...prev];
      const opts = [...updated[qIdx].options];
      opts[oIdx] = text;
      updated[qIdx] = { ...updated[qIdx], options: opts };
      return updated;
    });
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  // ========================
  // QUIZ
  // ========================
  const startQuiz = (doShuffle: boolean) => {
    if (questions.length === 0) return;
    let quizQs = [...questions];
    if (doShuffle) {
      for (let i = quizQs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [quizQs[i], quizQs[j]] = [quizQs[j], quizQs[i]];
      }
      quizQs = quizQs.map(q => {
        const indices = q.options.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const newOptions = indices.map(i => q.options[i]);
        let newCorrect = q.correct;
        if (q.correct) {
          const oldIdx = q.correct.charCodeAt(0) - 65;
          const newIdx = indices.indexOf(oldIdx);
          newCorrect = String.fromCharCode(65 + newIdx);
        }
        return { ...q, options: newOptions, correct: newCorrect };
      });
      setShuffled(true);
    } else {
      setShuffled(false);
    }

    setQuestions(quizQs);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setConfirmed(false);
    setScore(0);
    setAnsweredCount(0);
    setAnsweredMap({});
    setQuizFinished(false);
    if (timerMinutes > 0) { setTimeRemaining(timerMinutes * 60); setTimerActive(true); }
    setPhase("quiz");
  };

  const handleConfirm = () => {
    if (!selectedAnswer || confirmed) return;
    const q = questions[currentQ];
    const isCorrect = q.correct === selectedAnswer;
    if (isCorrect) setScore(s => s + 1);
    setAnsweredCount(c => c + 1);
    setAnsweredMap(prev => ({ ...prev, [currentQ]: { selected: selectedAnswer, correct: isCorrect } }));
    setConfirmed(true);
  };

  const goToQuestion = (idx: number) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentQ(idx);
    const prev = answeredMap[idx];
    if (prev) { setSelectedAnswer(prev.selected); setConfirmed(true); }
    else { setSelectedAnswer(null); setConfirmed(false); }
  };

  const handleFinish = () => {
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setQuizFinished(true);
    // Auto-save quiz results to history
    const total = Object.keys(answeredMap).length + (confirmed ? 0 : (selectedAnswer ? 1 : 0));
    const finalScore = score + (confirmed ? 0 : (selectedAnswer && questions[currentQ]?.correct === selectedAnswer ? 1 : 0));
    saveToHistory(questions, undefined, {
      quizResult: {
        score: finalScore,
        total,
        answeredMap,
        finishedAt: new Date().toISOString(),
      }
    });
  };

  const currentQuestion = questions[currentQ];
  const timerUrgent = timerActive && timeRemaining <= 60;

  // ========================
  // RENDER: HISTORY
  // ========================
  if (phase === "history") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setPhase("input")} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <History className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-foreground">Lịch sử đề trắc nghiệm</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="w-4 h-4" /></Button>
        </header>

        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto p-4 space-y-3">
            {historyLoading && <p className="text-center text-muted-foreground text-sm py-8">Đang tải...</p>}
            {!historyLoading && historyList.length === 0 && (
              <div className="text-center py-16 space-y-3">
                <History className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">Chưa có lịch sử đề nào</p>
              </div>
            )}
            {historyList.map(item => {
              const data = item.data as any;
              const qCount = data?.questions?.length || 0;
              const hasResult = !!data?.quizResult;
              const resultPct = hasResult && data.quizResult.total > 0
                ? Math.round((data.quizResult.score / data.quizResult.total) * 100) : null;

              return (
                <div key={item.id} className="group p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadFromHistory(item)}>
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {qCount} câu hỏi
                        </span>
                        {hasResult && resultPct !== null && (
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            resultPct >= 70 ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : resultPct >= 50 ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                          )}>
                            <Trophy className="w-3 h-3 inline mr-0.5" />
                            {resultPct}% ({data.quizResult.score}/{data.quizResult.total})
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.updated_at).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => loadFromHistory(item)} className="h-8 w-8" title="Chỉnh sửa">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteHistory(item.id)} className="h-8 w-8 text-destructive hover:text-destructive" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <FloatingChatWidget />
      </div>
    );
  }

  // ========================
  // RENDER: INPUT PHASE
  // ========================
  if (phase === "input") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-foreground">Nhập đề trắc nghiệm</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Button variant="outline" size="sm" onClick={() => { loadHistory(); setPhase("history"); }} className="gap-1.5 text-xs h-8">
                <History className="w-3.5 h-3.5" /> Lịch sử
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="w-4 h-4" /></Button>
          </div>
        </header>

        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 sm:p-6 gap-4 overflow-auto">
          <div
            className="border-2 border-dashed border-border rounded-2xl p-6 sm:p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Tải file đề lên</p>
            <p className="text-xs text-muted-foreground">Hỗ trợ .txt, .docx — Tự nhận diện đáp án tô vàng từ .docx</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".txt,.docx,.md" onChange={handleFileUpload} className="hidden" />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">HOẶC DÁN TRỰC TIẾP</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="flex-1 min-h-[250px] text-sm font-mono resize-none"
            placeholder={`Dán đề trắc nghiệm vào đây...\n\nVí dụ:\nCâu 1: Thủ đô của Việt Nam là gì?\nA. TP.HCM\nB. Hà Nội\nC. Đà Nẵng\nD. Huế\n\nCâu 2: 2 + 2 = ?\nA. 3\nB. 4\nC. 5\nD. 6`}
          />

          <div className="flex items-center gap-3">
            <Button onClick={handleParse} disabled={!inputText.trim()} className="flex-1 gap-2 h-11" size="lg">
              <Check className="w-5 h-5" />
              Phân tích đề ({inputText.trim() ? parseQuestions(inputText).length : 0} câu)
            </Button>
          </div>
        </div>
        <FloatingChatWidget />
      </div>
    );
  }

  // ========================
  // RENDER: EDITOR PHASE
  // ========================
  if (phase === "editor") {
    const answeredQs = questions.filter(q => q.correct).length;
    const totalQs = questions.length;

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setPhase("input")} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Edit3 className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-foreground text-sm sm:text-base">
              Chỉnh sửa ({totalQs} câu • {answeredQs} có đáp án)
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Button variant="outline" size="sm" onClick={() => { saveToHistory(questions); toast.success("Đã lưu đề"); }} className="gap-1.5 text-xs h-8">
                <Save className="w-3.5 h-3.5" /> Lưu
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="w-4 h-4" /></Button>
          </div>
        </header>

        {showManualAnswer && (
          <div className="border-b border-border bg-muted/30 p-4 space-y-3 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Nhập đáp án có sẵn</span>
              <Button variant="ghost" size="icon" onClick={() => setShowManualAnswer(false)} className="h-6 w-6 ml-auto">
                <X className="w-3 h-3" />
              </Button>
            </div>
            <Textarea
              value={manualAnswerText}
              onChange={e => setManualAnswerText(e.target.value)}
              className="min-h-[100px] text-sm font-mono"
              placeholder={"Câu 1: B\nCâu 2: C\nCâu 3: A\n..."}
            />
            <Button onClick={handleApplyManualAnswers} size="sm" className="gap-1.5">
              <Check className="w-3.5 h-3.5" /> Áp dụng
            </Button>
          </div>
        )}

        <div className="px-4 py-2 border-b border-border bg-card flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={toggleManualAnswer} className="gap-1.5 text-xs">
            <Keyboard className="w-3.5 h-3.5" /> Nhập đáp án
          </Button>
          <div className="flex items-center gap-1.5 ml-auto">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="number" min={0} max={180} value={timerMinutes}
              onChange={e => setTimerMinutes(Math.min(180, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-16 text-center text-xs h-8"
            />
            <span className="text-xs text-muted-foreground">phút</span>
          </div>
          <Button onClick={() => startQuiz(false)} size="sm" className="gap-1.5 text-xs">
            <Play className="w-3.5 h-3.5" /> Làm bài
          </Button>
          <Button variant="secondary" onClick={() => startQuiz(true)} size="sm" className="gap-1.5 text-xs">
            <Shuffle className="w-3.5 h-3.5" /> Trộn đề
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-4 space-y-4">
            {questions.map((q, qi) => (
              <div
                key={qi}
                className={cn(
                  "p-4 rounded-2xl border transition-all",
                  q.correct ? "border-green-500/30 bg-green-500/5" : "border-border bg-card"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Câu {qi + 1}</span>
                      {q.correct && (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                          Đáp án: {q.correct}
                        </span>
                      )}
                    </div>
                    {editingIdx === qi ? (
                      <Textarea value={q.question} onChange={e => updateQuestion(qi, "question", e.target.value)} className="text-sm mt-1" rows={3} />
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{q.question}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setImageTargetIdx(qi); imageInputRef.current?.click(); }} className="h-7 w-7" title="Thêm ảnh">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingIdx(editingIdx === qi ? null : qi)} className="h-7 w-7" title="Chỉnh sửa">
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(qi)} className="h-7 w-7 text-destructive hover:text-destructive" title="Xóa câu">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {q.image && (
                  <div className="mb-3 relative group cursor-pointer" onClick={() => setViewImage(q.image)}>
                    <img src={q.image} alt="Câu hỏi" className="max-h-40 rounded-lg border border-border hover:opacity-90 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/50 text-white text-xs px-2 py-1 rounded-lg">Bấm để xem</div>
                    </div>
                    <Button
                      variant="destructive" size="icon"
                      onClick={(e) => { e.stopPropagation(); updateQuestion(qi, "image", null); }}
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const letter = String.fromCharCode(65 + oi);
                    const isCorrect = q.correct === letter;
                    return (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuestion(qi, "correct", isCorrect ? null : letter)}
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all",
                            isCorrect ? "bg-green-500 text-white shadow-sm shadow-green-500/30 scale-110" : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary"
                          )}
                        >
                          {isCorrect ? <Check className="w-3.5 h-3.5" /> : letter}
                        </button>
                        {editingIdx === qi ? (
                          <Input value={opt} onChange={e => updateOption(qi, oi, e.target.value)} className="text-sm h-8 flex-1" />
                        ) : (
                          <span className={cn("text-sm flex-1", isCorrect ? "text-green-600 dark:text-green-400 font-medium" : "text-foreground")}>
                            {opt}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        {viewImage && <ImageViewer src={viewImage} alt="Ảnh câu hỏi" onClose={() => setViewImage(null)} />}
        <FloatingChatWidget />
      </div>
    );
  }

  // ========================
  // RENDER: QUIZ RESULT
  // ========================
  if (phase === "quiz" && quizFinished) {
    const total = Object.keys(answeredMap).length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setPhase("editor")} className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
            <h1 className="font-semibold text-foreground">Kết quả</h1>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <div className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold border-4 shadow-lg",
            pct >= 70 ? "border-green-500 text-green-500 bg-green-500/10 shadow-green-500/20"
            : pct >= 50 ? "border-yellow-500 text-yellow-500 bg-yellow-500/10 shadow-yellow-500/20"
            : "border-red-500 text-red-500 bg-red-500/10 shadow-red-500/20"
          )}>
            {pct}%
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {pct >= 70 ? "🎉 Xuất sắc!" : pct >= 50 ? "👍 Khá tốt!" : "📚 Cần ôn thêm!"}
            </h2>
            <p className="text-muted-foreground">Đúng {score}/{total} câu ({pct}%)</p>
            {questions.length > total && <p className="text-xs text-muted-foreground">Chưa trả lời: {questions.length - total} câu</p>}
          </div>
          <div className="flex gap-3 mt-4 flex-wrap justify-center">
            <Button variant="outline" onClick={() => setPhase("editor")} className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Quay lại</Button>
            <Button onClick={() => startQuiz(false)} className="gap-1.5"><RotateCcw className="w-4 h-4" /> Làm lại</Button>
            <Button variant="secondary" onClick={() => startQuiz(true)} className="gap-1.5"><Shuffle className="w-4 h-4" /> Trộn đề</Button>
          </div>
        </div>
        <FloatingChatWidget />
      </div>
    );
  }

  // ========================
  // RENDER: QUIZ ACTIVE
  // ========================
  if (phase === "quiz" && currentQuestion) {
    const answered = answeredMap[currentQ];
    const isConfirmed = confirmed || !!answered;
    const selected = selectedAnswer;

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setPhase("editor")} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-foreground">
              Câu {currentQ + 1}/{questions.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {timerActive && (
              <span className={cn("text-sm font-mono font-bold px-2.5 py-1 rounded-lg", timerUrgent ? "text-destructive bg-destructive/10 animate-pulse" : "text-primary bg-primary/10")}>
                ⏱️ {formatTime(timeRemaining)}
              </span>
            )}
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {score}/{answeredCount}
            </span>
            <Button variant="outline" size="sm" onClick={handleFinish} className="text-xs h-7">Nộp bài</Button>
          </div>
        </header>

        <Progress value={((currentQ + 1) / questions.length) * 100} className="h-1.5 rounded-none" />

        <div className="px-4 py-2 border-b border-border bg-muted/30 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {questions.map((_, i) => {
              const ans = answeredMap[i];
              return (
                <button
                  key={i}
                  onClick={() => goToQuestion(i)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-[11px] font-bold transition-all flex-shrink-0",
                    i === currentQ && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    ans?.correct && "bg-green-500 text-white shadow-sm",
                    ans && !ans.correct && "bg-red-500 text-white shadow-sm",
                    !ans && i !== currentQ && "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
            <div className="space-y-3">
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h2 className="text-base sm:text-lg font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                  <span className="text-primary mr-2 font-bold">Câu {currentQ + 1}.</span>
                  {currentQuestion.question}
                </h2>
              </div>
              {currentQuestion.image && (
                <div className="cursor-pointer" onClick={() => setViewImage(currentQuestion.image)}>
                  <img src={currentQuestion.image} alt="" className="max-h-56 rounded-xl border border-border hover:opacity-90 transition-opacity mx-auto" />
                  <p className="text-center text-xs text-muted-foreground mt-1">Bấm để xem phóng to</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isCorrectOpt = currentQuestion.correct === letter;
                const isSelected = selected === letter;

                let optClass = "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer hover:shadow-sm";
                if (isConfirmed) {
                  if (isCorrectOpt) optClass = "border-green-500 bg-green-500/10 shadow-sm shadow-green-500/10";
                  else if (isSelected && !isCorrectOpt) optClass = "border-red-500 bg-red-500/10 shadow-sm shadow-red-500/10";
                  else optClass = "border-border opacity-40";
                } else if (isSelected) {
                  optClass = "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => { if (!isConfirmed) setSelectedAnswer(letter); }}
                    disabled={isConfirmed}
                    className={cn("w-full text-left p-4 rounded-2xl border-2 transition-all text-sm sm:text-base", optClass)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all",
                        isConfirmed && isCorrectOpt && "bg-green-500 text-white",
                        isConfirmed && isSelected && !isCorrectOpt && "bg-red-500 text-white",
                        !isConfirmed && isSelected && "bg-primary text-primary-foreground",
                        !isConfirmed && !isSelected && "bg-muted text-muted-foreground"
                      )}>
                        {isConfirmed && isCorrectOpt ? <Check className="w-4 h-4" /> :
                         isConfirmed && isSelected && !isCorrectOpt ? <X className="w-4 h-4" /> : letter}
                      </span>
                      <span className="text-foreground flex-1">{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {isConfirmed && (
              <div className={cn(
                "p-4 rounded-2xl text-sm animate-in slide-in-from-bottom-2 duration-300 border",
                (answered?.correct || (selectedAnswer && currentQuestion.correct === selectedAnswer))
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-red-500/10 border-red-500/20"
              )}>
                <p className={cn(
                  "font-bold",
                  (answered?.correct || (selectedAnswer && currentQuestion.correct === selectedAnswer))
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {(answered?.correct || (selectedAnswer && currentQuestion.correct === selectedAnswer))
                    ? "✅ Chính xác!" : `❌ Sai! Đáp án đúng: ${currentQuestion.correct}`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border bg-card flex items-center justify-between flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => goToQuestion(currentQ - 1)} disabled={currentQ === 0} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Trước
          </Button>

          {!isConfirmed ? (
            <Button onClick={handleConfirm} disabled={!selectedAnswer} size="sm" className="gap-1.5 min-w-[120px] h-10">
              <Check className="w-4 h-4" /> Xác nhận
            </Button>
          ) : (
            <Button
              onClick={() => { if (currentQ + 1 >= questions.length) handleFinish(); else goToQuestion(currentQ + 1); }}
              size="sm" className="gap-1.5 min-w-[120px] h-10"
            >
              {currentQ + 1 >= questions.length ? "Xem kết quả" : "Câu tiếp"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => goToQuestion(currentQ + 1)} disabled={currentQ >= questions.length - 1} className="gap-1.5">
            Sau <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {viewImage && <ImageViewer src={viewImage} alt="Ảnh câu hỏi" onClose={() => setViewImage(null)} />}
        <FloatingChatWidget />
      </div>
    );
  }

  return null;
}
