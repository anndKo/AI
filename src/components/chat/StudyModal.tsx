import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Brain, HelpCircle, Check, X, Loader2, BookOpen, ArrowLeft, Clock, Timer, Volume2, Square, Pause, Play, FileUp, Edit3, Keyboard } from "lucide-react";
import { StudyProcessingIndicator } from "./StudyProcessingIndicator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStudyQuota } from "@/hooks/useStudyQuota";
import { StudyPaymentModal } from "./StudyPaymentModal";
import { FloatingChatWidget } from "./FloatingChatWidget";
import { QuizUploader } from "./QuizUploader";

interface StudyModalProps {
  open: boolean;
  onClose: () => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  correctAnswers?: number[];
  explanation: string;
}

type RightPanel =
  | "actions"
  | "summarizing"
  | "summary"
  | "quiz-setup"
  | "quizzing"
  | "quiz-result"
  | "quiz-upload"
  | "quiz-upload-review";

export function StudyModal({ open, onClose }: StudyModalProps) {
  const { user, isAuthenticated } = useAuth();
  const { quota, useAction, fetchQuota } = useStudyQuota();

  const [hasFile, setHasFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("actions");
  const [summary, setSummary] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(10);
  const [totalRequested, setTotalRequested] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  // Timer state
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLine, setCurrentLine] = useState(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const summaryLinesRef = useRef<HTMLDivElement>(null);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentType, setPaymentType] = useState<string>("");

  // Quiz uploader
  const [showQuizUploader, setShowQuizUploader] = useState(false);

  // Quiz upload state (legacy, kept for hasFile mode)
  const [uploadedQuizText, setUploadedQuizText] = useState("");
  const [parsedUploadQuestions, setParsedUploadQuestions] = useState<QuizQuestion[]>([]);
  const [isParsingQuiz, setIsParsingQuiz] = useState(false);
  const [editingQuizIndex, setEditingQuizIndex] = useState<number | null>(null);
  // Timer countdown effect
  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            toast.info("⏰ Hết thời gian làm bài!");
            setRightPanel("quiz-result");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [timerActive]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const resetState = useCallback(() => {
    setHasFile(false);
    setUploadProgress(0);
    setIsUploading(false);
    setFileName("");
    setFileContent("");
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(null);
    setRightPanel("actions");
    setSummary("");
    setQuestions([]);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuestionCount(10);
    setTotalRequested(10);
    setIsProcessing(false);
    setIsLoadingMore(false);
    setTimerMinutes(0);
    setTimeRemaining(0);
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    stopSpeaking();
    setUploadedQuizText("");
    setParsedUploadQuestions([]);
    setEditingQuizIndex(null);
    setShowQuizUploader(false);
  }, [fileUrl]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  // ===== TTS =====
  const summaryLines = useMemo(() => summary.split("\n").filter(l => l.trim()), [summary]);

  const preprocessTextForTTS = (text: string): string => {
    // Expand abbreviations: ICT → "I C T", AI → "A I"
    return text.replace(/([A-Z]{2,})/g, match => match.split("").join(" "));
  };

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentLine(-1);
  }, []);

  const speakLine = useCallback((lineIndex: number) => {
    if (lineIndex >= summaryLines.length) {
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentLine(-1);
      return;
    }

    setCurrentLine(lineIndex);

    const lineEl = summaryLinesRef.current?.children[lineIndex] as HTMLElement;
    if (lineEl) lineEl.scrollIntoView({ behavior: "smooth", block: "center" });

    const processed = preprocessTextForTTS(summaryLines[lineIndex]);
    const utterance = new SpeechSynthesisUtterance(processed);
    utterance.lang = "vi-VN";
    utterance.rate = 1.0;

    // Try to pick a female Vietnamese voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVi = voices.find(v => v.lang.startsWith("vi") && /female|nữ/i.test(v.name));
    const anyVi = voices.find(v => v.lang.startsWith("vi"));
    if (femaleVi) utterance.voice = femaleVi;
    else if (anyVi) utterance.voice = anyVi;

    utterance.onend = () => speakLine(lineIndex + 1);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentLine(-1);
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [summaryLines]);

  const startSpeaking = useCallback(() => {
    if (!summary) return;
    stopSpeaking();
    setIsSpeaking(true);
    setIsPaused(false);
    speakLine(0);
  }, [summary, stopSpeaking, speakLine]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // ===== Quota check =====
  const checkQuota = (action: string): boolean => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để sử dụng tính năng học tập");
      return false;
    }
    if (quota?.is_admin) return true;
    if (!quota) return false;

    if (action === "file_upload" && quota.file_uploads_remaining <= 0) {
      setPaymentType("file_upload");
      setShowPayment(true);
      return false;
    }
    if (action === "summarize" && quota.summaries_remaining <= 0) {
      setPaymentType("summarize");
      setShowPayment(true);
      return false;
    }
    if (action === "quiz" && quota.quiz_questions_remaining <= 0) {
      setPaymentType("quiz");
      setShowPayment(true);
      return false;
    }
    return true;
  };

  // ===== File Upload =====
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!checkQuota("file_upload")) { e.target.value = ""; return; }

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".md")) {
      toast.error("Chỉ hỗ trợ PDF, Word, TXT");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File tối đa 20MB");
      return;
    }

    if (isAuthenticated && user) {
      const result = await useAction("file_upload");
      if (!result.allowed) {
        setPaymentType("file_upload");
        setShowPayment(true);
        e.target.value = "";
        return;
      }
    }

    setFileName(file.name);
    setIsUploading(true);
    setUploadProgress(0);

    const url = URL.createObjectURL(file);
    setFileUrl(url);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) { progress = 100; clearInterval(interval); }
      setUploadProgress(Math.min(progress, 100));
    }, 200);

    try {
      const text = await readFileContent(file);
      const estimatedPages = Math.ceil(text.length / 3000);
      if (estimatedPages > 100) {
        toast.info(`File có ~${estimatedPages} trang, chỉ đọc 100 trang đầu.`);
        setFileContent(text.slice(0, 300000));
      } else {
        setFileContent(text);
      }

      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setHasFile(true);
        setRightPanel("actions");
      }, 400);
    } catch {
      clearInterval(interval);
      toast.error("Không thể đọc file");
      setIsUploading(false);
      setUploadProgress(0);
    }

    e.target.value = "";
  };

  const readFileContent = async (file: File): Promise<string> => {
    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      return await file.text();
    }
    const buffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    const { data, error } = await supabase.functions.invoke("study-file", {
      body: { action: "extract", fileBase64: base64, fileName: file.name, fileType: file.type },
    });
    if (error) throw error;
    return data?.text || "";
  };

  // ===== Summarize =====
  const handleSummarize = async () => {
    if (!checkQuota("summarize")) return;

    if (isAuthenticated && user) {
      const result = await useAction("summarize");
      if (!result.allowed) {
        setPaymentType("summarize");
        setShowPayment(true);
        return;
      }
    }

    setRightPanel("summarizing");
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("study-file", {
        body: { action: "summarize", content: fileContent, fileName },
      });
      if (error) throw error;
      setSummary(data?.summary || "Không thể tóm tắt.");
      setRightPanel("summary");
    } catch {
      toast.error("Lỗi khi tóm tắt");
      setRightPanel("actions");
    } finally {
      setIsProcessing(false);
    }
  };

  // ===== Quiz Generation =====
  const generateBatch = async (count: number, startIndex: number): Promise<QuizQuestion[]> => {
    const { data, error } = await supabase.functions.invoke("study-file", {
      body: { action: "quiz", content: fileContent, fileName, questionCount: count, startIndex },
    });
    if (error) throw error;
    return (data?.questions as QuizQuestion[]) || [];
  };

  const handleCreateQuiz = async () => {
    if (!checkQuota("quiz")) return;

    if (isAuthenticated && user) {
      const result = await useAction("quiz");
      if (!result.allowed) {
        setPaymentType("quiz");
        setShowPayment(true);
        return;
      }
    }

    setRightPanel("quizzing");
    setIsProcessing(true);
    setTotalRequested(questionCount);
    try {
      const batchSize = Math.min(questionCount, 10);
      const batch = await generateBatch(batchSize, 0);
      if (!batch || batch.length === 0) throw new Error("No questions");
      setQuestions(batch);
      setCurrentQ(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setScore(0);

      if (timerMinutes > 0) {
        setTimeRemaining(timerMinutes * 60);
        setTimerActive(true);
      }
    } catch {
      toast.error("Lỗi khi tạo câu hỏi");
      setRightPanel("actions");
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-load more questions when approaching end
  useEffect(() => {
    if (rightPanel !== "quizzing" || isLoadingMore) return;
    if (questions.length >= totalRequested) return;

    const questionsLeft = questions.length - currentQ;
    if (questionsLeft <= 2 && questions.length < totalRequested) {
      setIsLoadingMore(true);
      const nextBatchSize = Math.min(10, totalRequested - questions.length);
      generateBatch(nextBatchSize, questions.length)
        .then(batch => {
          if (batch && batch.length > 0) {
            setQuestions(prev => [...prev, ...batch]);
          }
        })
        .catch(err => console.error("Error loading more questions:", err))
        .finally(() => setIsLoadingMore(false));
    }
  }, [currentQ, questions.length, totalRequested, rightPanel, isLoadingMore]);

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
    const q = questions[currentQ];
    const correctAnswers = q.correctAnswers || [q.correctIndex];
    if (correctAnswers.includes(index)) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQ + 1 >= questions.length && questions.length >= totalRequested) {
      setTimerActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRightPanel("quiz-result");
    } else if (currentQ + 1 >= questions.length) {
      toast.info("Đang tải thêm câu hỏi...");
    } else {
      setCurrentQ(q => q + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  // ===== Quiz Upload (kept for hasFile split-view mode) =====
  const handleParseQuizWithAI = async () => {
    if (!uploadedQuizText.trim()) {
      toast.error("Chưa có nội dung đề thi");
      return;
    }

    setIsParsingQuiz(true);
    try {
      const { data, error } = await supabase.functions.invoke("study-file", {
        body: { action: "parse-quiz", content: uploadedQuizText, questionCount: 50 },
      });
      if (error) throw error;
      const parsed = (data?.questions as QuizQuestion[]) || [];
      if (parsed.length === 0) {
        toast.error("Không tìm thấy câu hỏi trong nội dung");
        return;
      }
      setParsedUploadQuestions(parsed);
      setRightPanel("quiz-upload-review");
    } catch {
      toast.error("Lỗi khi phân tích đề thi");
    } finally {
      setIsParsingQuiz(false);
    }
  };

  const handleUpdateParsedQuestion = (index: number, field: string, value: any) => {
    setParsedUploadQuestions(prev => {
      const updated = [...prev];
      if (field === "correctIndex") {
        updated[index] = { ...updated[index], correctIndex: value, correctAnswers: [value] };
      } else if (field === "option") {
        const opts = [...updated[index].options];
        opts[value.idx] = value.text;
        updated[index] = { ...updated[index], options: opts };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleStartUploadedQuiz = () => {
    if (parsedUploadQuestions.length === 0) return;
    setQuestions(parsedUploadQuestions);
    setTotalRequested(parsedUploadQuestions.length);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);

    if (timerMinutes > 0) {
      setTimeRemaining(timerMinutes * 60);
      setTimerActive(true);
    }
    setRightPanel("quizzing");
  };

  const currentQuestion = questions[currentQ];

  if (!open) return null;

  // Show QuizUploader as full-screen overlay
  if (showQuizUploader) {
    return <QuizUploader onClose={() => setShowQuizUploader(false)} />;
  }
  const timerPercentage = timerMinutes > 0 ? (timeRemaining / (timerMinutes * 60)) * 100 : 0;
  const timerUrgent = timerActive && timeRemaining <= 60;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-muted-foreground hover:text-foreground flex-shrink-0 h-8 w-8">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
          <h1 className="font-semibold text-foreground text-sm sm:text-base">Học tập</h1>
          {fileName && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full max-w-32 sm:max-w-48 truncate">
              {fileName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Quota display */}
          {isAuthenticated && quota && !quota.is_admin && (
            <div className="flex items-center gap-1.5 sm:gap-3 text-[9px] sm:text-xs text-muted-foreground">
              <span title="Lượt tải file">📁 {quota.file_uploads_remaining}/{quota.file_uploads_limit}</span>
              <span title="Lượt tóm tắt">📝 {quota.summaries_remaining}/{quota.summaries_limit}</span>
              <span title="Lượt trắc nghiệm">❓ {quota.quiz_questions_remaining}/{quota.quiz_questions_limit}</span>
            </div>
          )}
          {hasFile && (
            <Button variant="outline" size="sm" onClick={resetState} className="text-xs h-7 px-2">
              Đổi tệp
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Upload screen */}
      {!hasFile && !isUploading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Upload className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Tải tệp lên để bắt đầu</h2>
            <p className="text-sm text-muted-foreground">Hỗ trợ PDF, Word, TXT — tối đa 20MB, 100 trang</p>
            {isAuthenticated && quota && !quota.is_admin && (
              <p className="text-xs text-muted-foreground mt-1">
                Còn {quota.file_uploads_remaining} lượt tải file • {quota.summaries_remaining} lượt tóm tắt • {quota.quiz_questions_remaining} lượt quiz
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => fileInputRef.current?.click()} size="lg" className="gap-2 px-8">
              <FileText className="w-5 h-5" />
              Chọn tệp học
            </Button>
            <Button variant="outline" onClick={() => setShowQuizUploader(true)} size="lg" className="gap-2 px-6">
              <FileUp className="w-5 h-5" />
              Làm trắc nghiệm
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={handleFileUpload} className="hidden" />
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <FileText className="w-16 h-16 text-primary animate-pulse" />
          <p className="text-sm font-medium text-foreground">{fileName}</p>
          <div className="w-64">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center mt-2">{Math.round(uploadProgress)}%</p>
          </div>
        </div>
      )}

      {/* Main split layout */}
      {hasFile && (
        <div className="flex-1 flex flex-col sm:flex-row min-h-0">
          {/* Left: File viewer */}
          <div className="h-[45%] sm:h-auto sm:w-[60%] border-b sm:border-b-0 sm:border-r border-border flex flex-col min-h-0 bg-muted/20">
            <div className="px-4 py-2 border-b border-border bg-card flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-foreground truncate">{fileName}</span>
            </div>
            <div className="flex-1 overflow-auto">
              {fileUrl && fileName.endsWith(".pdf") ? (
                <iframe src={fileUrl} className="w-full h-full border-0" title="File viewer" />
              ) : (
                <div className="p-4 whitespace-pre-wrap text-sm text-foreground leading-relaxed font-mono">
                  {fileContent}
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions & Results */}
          <div className="h-[55%] sm:h-auto sm:w-[40%] flex flex-col min-h-0 bg-card">
            {/* Timer display */}
            {timerActive && rightPanel === "quizzing" && (
              <div className={cn(
                "px-4 py-2 border-b border-border flex items-center justify-between",
                timerUrgent ? "bg-destructive/10" : "bg-primary/5"
              )}>
                <div className="flex items-center gap-2">
                  <Timer className={cn("w-4 h-4", timerUrgent ? "text-destructive animate-pulse" : "text-primary")} />
                  <span className={cn("text-sm font-mono font-bold", timerUrgent ? "text-destructive" : "text-primary")}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <div className="w-24">
                  <Progress value={timerPercentage} className={cn("h-1.5", timerUrgent && "[&>div]:bg-destructive")} />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {/* Action Selection */}
              {rightPanel === "actions" && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground text-sm">Chọn thao tác</h3>
                  <button
                    onClick={handleSummarize}
                    className="group w-full p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Brain className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">Tóm tắt chi tiết</h4>
                        <p className="text-xs text-muted-foreground">AI phân tích đầy đủ nội dung</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setRightPanel("quiz-setup")}
                    className="group w-full p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <HelpCircle className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">Tạo câu hỏi từ tài liệu</h4>
                        <p className="text-xs text-muted-foreground">AI tạo trắc nghiệm từ nội dung</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowQuizUploader(true)}
                    className="group w-full p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">Làm trắc nghiệm</h4>
                        <p className="text-xs text-muted-foreground">Dán đề hoặc upload file .docx/.txt</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Summarizing */}
              {rightPanel === "summarizing" && (
                <StudyProcessingIndicator type="summarize" />
              )}

              {/* Summary Result */}
              {rightPanel === "summary" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-sm">Tóm tắt chi tiết</h3>
                    <div className="flex items-center gap-1">
                      {!isSpeaking ? (
                        <Button variant="ghost" size="sm" onClick={startSpeaking} className="text-xs gap-1 text-primary hover:text-primary" title="Đọc văn bản">
                          <Volume2 className="w-3.5 h-3.5" /> Đọc
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={togglePause} className="h-7 w-7" title={isPaused ? "Tiếp tục" : "Tạm dừng"}>
                            {isPaused ? <Play className="w-3.5 h-3.5 text-primary" /> : <Pause className="w-3.5 h-3.5 text-primary" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={stopSpeaking} className="h-7 w-7" title="Dừng đọc">
                            <Square className="w-3 h-3 text-destructive" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { stopSpeaking(); setRightPanel("actions"); }} className="text-xs gap-1">
                        <ArrowLeft className="w-3 h-3" /> Quay lại
                      </Button>
                    </div>
                  </div>
                  <div ref={summaryLinesRef} className="p-4 rounded-xl bg-muted/30 border border-border text-sm text-foreground leading-relaxed space-y-1">
                    {summaryLines.map((line, idx) => (
                      <p
                        key={idx}
                        className={cn(
                          "px-2 py-0.5 rounded transition-all duration-300",
                          currentLine === idx && "bg-primary/20 font-medium border-l-2 border-primary"
                        )}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Quiz Setup */}
              {rightPanel === "quiz-setup" && (
                <div className="flex flex-col items-center py-6 gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <HelpCircle className="w-7 h-7 text-accent" />
                  </div>

                  <div className="w-full space-y-4">
                    <div className="text-center">
                      <h3 className="font-semibold text-foreground mb-1">Số câu hỏi</h3>
                      <p className="text-xs text-muted-foreground">Nhập 1-100 câu (tạo theo lô 10 câu)</p>
                    </div>
                    <div className="flex justify-center">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={questionCount}
                        onChange={e => setQuestionCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-20 text-center text-lg"
                      />
                    </div>

                    <div className="text-center">
                      <h3 className="font-semibold text-foreground mb-1 flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Thời gian (phút)
                      </h3>
                      <p className="text-xs text-muted-foreground">Để 0 nếu không giới hạn</p>
                    </div>
                    <div className="flex justify-center">
                      <Input
                        type="number"
                        min={0}
                        max={180}
                        value={timerMinutes}
                        onChange={e => setTimerMinutes(Math.min(180, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-20 text-center text-lg"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <Button variant="outline" size="sm" onClick={() => setRightPanel("actions")}>Quay lại</Button>
                    <Button size="sm" onClick={handleCreateQuiz} className="gap-1.5">
                      <Brain className="w-4 h-4" />
                      Tạo
                    </Button>
                  </div>
                </div>
              )}

              {/* Quiz Loading */}
              {rightPanel === "quizzing" && isProcessing && (
                <StudyProcessingIndicator type="quiz" />
              )}

              {/* Quiz Active */}
              {rightPanel === "quizzing" && !isProcessing && currentQuestion && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Câu {currentQ + 1}/{totalRequested}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      Điểm: {score}/{currentQ + (showResult ? 1 : 0)}
                    </span>
                  </div>
                  <Progress value={((currentQ + 1) / totalRequested) * 100} className="h-1.5" />

                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Đang tải thêm câu hỏi...
                    </div>
                  )}

                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {currentQuestion.question}
                  </p>

                  <div className="space-y-2">
                    {currentQuestion.options.map((opt, idx) => {
                      const correctAnswers = currentQuestion.correctAnswers || [currentQuestion.correctIndex];
                      const isCorrect = correctAnswers.includes(idx);
                      const isSelected = idx === selectedAnswer;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectAnswer(idx)}
                          disabled={showResult}
                          className={cn(
                            "w-full text-left p-3 rounded-xl border transition-all text-sm",
                            !showResult && "border-border hover:border-primary/50 hover:bg-primary/5",
                            showResult && isCorrect && "border-green-500 bg-green-500/10",
                            showResult && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                            showResult && !isSelected && !isCorrect && "border-border opacity-40"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                              !showResult && "bg-muted text-muted-foreground",
                              showResult && isCorrect && "bg-green-500 text-white",
                              showResult && isSelected && !isCorrect && "bg-red-500 text-white"
                            )}>
                              {showResult && isCorrect ? <Check className="w-3 h-3" /> :
                               showResult && isSelected && !isCorrect ? <X className="w-3 h-3" /> :
                               String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-foreground">{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {showResult && (
                    <div className={cn(
                      "p-3 rounded-xl text-sm",
                      selectedAnswer !== null && (questions[currentQ].correctAnswers || [questions[currentQ].correctIndex]).includes(selectedAnswer)
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-red-500/10 border border-red-500/20"
                    )}>
                      <p className={cn(
                        "font-medium mb-1 text-xs",
                        selectedAnswer !== null && (questions[currentQ].correctAnswers || [questions[currentQ].correctIndex]).includes(selectedAnswer)
                          ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {selectedAnswer !== null && (questions[currentQ].correctAnswers || [questions[currentQ].correctIndex]).includes(selectedAnswer) ? "✅ Chính xác!" : "❌ Sai rồi!"}
                      </p>
                      <p className="text-muted-foreground text-xs leading-relaxed">{currentQuestion.explanation}</p>
                    </div>
                  )}

                  {showResult && (
                    <Button onClick={handleNextQuestion} className="w-full" size="sm">
                      {currentQ + 1 >= questions.length && questions.length >= totalRequested ? "Xem kết quả" : "Câu tiếp →"}
                    </Button>
                  )}
                </div>
              )}

              {/* Quiz Result */}
              {rightPanel === "quiz-result" && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold",
                    score >= questions.length * 0.7 ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                  )}>
                    {score}/{currentQ + (showResult ? 1 : 0)}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {score >= (currentQ + 1) * 0.7 ? "🎉 Xuất sắc!" : score >= (currentQ + 1) * 0.5 ? "👍 Khá tốt!" : "📚 Cần ôn thêm!"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Đúng {score}/{currentQ + (showResult ? 1 : 0)} câu ({Math.round((score / Math.max(1, currentQ + (showResult ? 1 : 0))) * 100)}%)
                  </p>
                  {timerMinutes > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {timeRemaining <= 0 ? "⏰ Hết thời gian" : `⏱️ Còn lại: ${formatTime(timeRemaining)}`}
                    </p>
                  )}
                  <div className="flex gap-3 mt-2">
                    <Button variant="outline" size="sm" onClick={() => setRightPanel("actions")}>Quay lại</Button>
                    <Button size="sm" onClick={() => setRightPanel("quiz-setup")}>Làm lại</Button>
                  </div>
                </div>
              )}

              {/* Quiz Upload panels inside split view */}
              {rightPanel === "quiz-upload" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setRightPanel("actions"); setUploadedQuizText(""); }} className="h-8 w-8">
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="font-semibold text-foreground text-sm">Đề trắc nghiệm</h3>
                  </div>
                  <Textarea
                    value={uploadedQuizText}
                    onChange={e => setUploadedQuizText(e.target.value)}
                    className="min-h-[200px] text-sm font-mono"
                    placeholder="Nội dung đề thi..."
                  />
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      max={180}
                      value={timerMinutes}
                      onChange={e => setTimerMinutes(Math.min(180, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-16 text-center text-sm h-8"
                      placeholder="0"
                    />
                    <span className="text-xs text-muted-foreground">phút</span>
                  </div>
                  <Button onClick={handleParseQuizWithAI} disabled={isParsingQuiz || !uploadedQuizText.trim()} className="w-full gap-2" size="sm">
                    {isParsingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    {isParsingQuiz ? "Đang phân tích..." : "AI phân tích & trả lời"}
                  </Button>
                </div>
              )}

              {rightPanel === "quiz-upload-review" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setRightPanel("quiz-upload")} className="h-7 w-7">
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </Button>
                      <h3 className="font-semibold text-foreground text-sm">{parsedUploadQuestions.length} câu</h3>
                    </div>
                    <Button onClick={handleStartUploadedQuiz} size="sm" className="gap-1.5">
                      <Play className="w-3.5 h-3.5" /> Làm bài
                    </Button>
                  </div>
                  {parsedUploadQuestions.map((q, qi) => (
                    <div key={qi} className="p-3 border rounded-lg bg-muted/20 space-y-2">
                      <p className="text-xs font-medium"><span className="text-primary">Câu {qi + 1}.</span> {q.question}</p>
                      <div className="space-y-1">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateParsedQuestion(qi, "correctIndex", oi)}
                              className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0",
                                (q.correctAnswers || [q.correctIndex]).includes(oi) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                              )}
                            >
                              {String.fromCharCode(65 + oi)}
                            </button>
                            <span className="text-xs text-foreground">{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Study Payment Modal */}
      <StudyPaymentModal
        open={showPayment}
        onClose={() => { setShowPayment(false); fetchQuota(); }}
      />

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </div>
  );
}
