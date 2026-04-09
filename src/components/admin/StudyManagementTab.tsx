import { useState, useEffect } from "react";
import { db } from "@/lib/supabaseAny";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen, Zap } from "lucide-react";

interface StudyPackage { id: string; name: string; description: string | null; price: number; file_uploads: number; summaries: number; quiz_questions: number; is_active: boolean; }

export function StudyManagementTab() {
  const [aiCosts, setAiCosts] = useState({ cost_summary: "1", cost_quiz_10: "1", cost_file_analyze: "1" });
  const [studyPackages, setStudyPackages] = useState<StudyPackage[]>([]);
  const [newPkg, setNewPkg] = useState({ name: "", description: "", price: "", file_uploads: "", summaries: "", quiz_questions: "" });

  useEffect(() => { fetchAiCosts(); fetchStudyPackages(); }, []);

  const fetchAiCosts = async () => {
    const keys = ["ai_cost_summary", "ai_cost_quiz_10", "ai_cost_file_analyze"];
    const { data } = await db.from("app_settings").select("key,value").in("key", keys);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((d: any) => {
        if (d.key === "ai_cost_summary") map.cost_summary = String(d.value);
        if (d.key === "ai_cost_quiz_10") map.cost_quiz_10 = String(d.value);
        if (d.key === "ai_cost_file_analyze") map.cost_file_analyze = String(d.value);
      });
      setAiCosts(prev => ({ ...prev, ...map }));
    }
  };

  const fetchStudyPackages = async () => {
    const { data } = await db.from("study_packages").select("*").order("created_at", { ascending: false });
    if (data) setStudyPackages(data as StudyPackage[]);
  };

  const saveAiCosts = async () => {
    try {
      const updates = [
        { key: "ai_cost_summary", value: parseInt(aiCosts.cost_summary) },
        { key: "ai_cost_quiz_10", value: parseInt(aiCosts.cost_quiz_10) },
        { key: "ai_cost_file_analyze", value: parseInt(aiCosts.cost_file_analyze) },
      ];
      for (const u of updates) {
        // upsert: try update, if not found insert
        const { data } = await db.from("app_settings").select("key").eq("key", u.key).single();
        if (data) {
          await db.from("app_settings").update({ value: u.value }).eq("key", u.key);
        } else {
          await db.from("app_settings").insert({ key: u.key, value: u.value });
        }
      }
      toast.success("Đã lưu cài đặt chi phí AI!");
    } catch { toast.error("Lỗi lưu cài đặt"); }
  };

  const addStudyPackage = async () => {
    if (!newPkg.name || !newPkg.price) { toast.error("Vui lòng nhập tên gói và giá"); return; }
    try {
      const { error } = await db.from("study_packages").insert({ name: newPkg.name, description: newPkg.description || null, price: parseInt(newPkg.price), file_uploads: parseInt(newPkg.file_uploads) || 0, summaries: parseInt(newPkg.summaries) || 0, quiz_questions: parseInt(newPkg.quiz_questions) || 0 });
      if (error) throw error;
      toast.success("Đã thêm gói học tập!");
      setNewPkg({ name: "", description: "", price: "", file_uploads: "", summaries: "", quiz_questions: "" });
      fetchStudyPackages();
    } catch { toast.error("Lỗi thêm gói"); }
  };

  const deleteStudyPackage = async (id: string) => {
    try { await db.from("study_packages").delete().eq("id", id); toast.success("Đã xóa gói!"); fetchStudyPackages(); }
    catch { toast.error("Lỗi xóa gói"); }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5" />Chi phí lượt AI cho mỗi hành động</CardTitle>
          <CardDescription>Số lượt AI tiêu tốn khi người dùng thực hiện mỗi thao tác học tập</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Lượt cho 1 lần tóm tắt</Label>
              <Input type="number" min={1} value={aiCosts.cost_summary} onChange={e => setAiCosts(p => ({ ...p, cost_summary: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Mỗi lần bấm "Tóm tắt" tiêu tốn bao nhiêu lượt</p>
            </div>
            <div>
              <Label>Lượt cho 10 câu trắc nghiệm</Label>
              <Input type="number" min={1} value={aiCosts.cost_quiz_10} onChange={e => setAiCosts(p => ({ ...p, cost_quiz_10: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Mỗi 10 câu quiz tiêu tốn bao nhiêu lượt</p>
            </div>
            <div>
              <Label>Lượt cho tải & phân tích đề</Label>
              <Input type="number" min={1} value={aiCosts.cost_file_analyze} onChange={e => setAiCosts(p => ({ ...p, cost_file_analyze: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Mỗi lần tải file + tạo đề tiêu tốn bao nhiêu lượt</p>
            </div>
          </div>
          <Button onClick={saveAiCosts} className="mt-4">Lưu cài đặt</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" />Tạo gói học tập</CardTitle><CardDescription>Gói hiển thị khi người dùng hết lượt (trang học tập)</CardDescription></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Tên gói</Label><Input value={newPkg.name} onChange={e => setNewPkg(p => ({ ...p, name: e.target.value }))} placeholder="VD: Gói cơ bản" /></div>
            <div><Label>Giá (VND)</Label><Input type="number" value={newPkg.price} onChange={e => setNewPkg(p => ({ ...p, price: e.target.value }))} placeholder="30000" /></div>
            <div><Label>Số lượt tải file</Label><Input type="number" value={newPkg.file_uploads} onChange={e => setNewPkg(p => ({ ...p, file_uploads: e.target.value }))} placeholder="10" /></div>
            <div><Label>Số lượt tóm tắt</Label><Input type="number" value={newPkg.summaries} onChange={e => setNewPkg(p => ({ ...p, summaries: e.target.value }))} placeholder="10" /></div>
            <div><Label>Số lượt câu hỏi</Label><Input type="number" value={newPkg.quiz_questions} onChange={e => setNewPkg(p => ({ ...p, quiz_questions: e.target.value }))} placeholder="100" /></div>
            <div className="md:col-span-3"><Label>Mô tả</Label><Textarea value={newPkg.description} onChange={e => setNewPkg(p => ({ ...p, description: e.target.value }))} placeholder="Mô tả gói..." /></div>
          </div>
          <Button onClick={addStudyPackage} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Thêm gói</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Danh sách gói học tập</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Tên</TableHead><TableHead>Giá</TableHead><TableHead>File</TableHead><TableHead>Tóm tắt</TableHead><TableHead>Quiz</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {studyPackages.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Chưa có gói nào</TableCell></TableRow>
              ) : studyPackages.map(pkg => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>{formatPrice(pkg.price)}</TableCell>
                  <TableCell>{pkg.file_uploads}</TableCell>
                  <TableCell>{pkg.summaries}</TableCell>
                  <TableCell>{pkg.quiz_questions}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => deleteStudyPackage(pkg.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
