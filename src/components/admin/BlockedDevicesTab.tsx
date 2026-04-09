import { useState, useEffect } from "react";
import { db } from "@/lib/supabaseAny";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Unlock, RefreshCw, Shield, AlertTriangle } from "lucide-react";

interface BlockedDevice {
  id: string;
  fingerprint_hash: string;
  is_blocked: boolean;
  block_reason: string | null;
  block_expires_at: string | null;
  block_count: number;
  risk_score: number;
  accounts_count: number;
  first_seen_at: string;
  last_seen_at: string;
  last_block_date: string | null;
}

export function BlockedDevicesTab() {
  const [devices, setDevices] = useState<BlockedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const { data, error } = await db.from("device_fingerprints").select("*").order("last_seen_at", { ascending: false });
      if (error) throw error;
      setDevices((data || []) as BlockedDevice[]);
    } catch (error) {
      console.error("Fetch devices error:", error);
      toast.error("Không tải được danh sách thiết bị");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDevices(); }, []);

  const unlockDevice = async (fingerprintHash: string) => {
    setUnlocking(fingerprintHash);
    try {
      const { data, error } = await db.rpc("admin_unlock_device", { p_fingerprint_hash: fingerprintHash });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (result.success) { toast.success("Đã mở khóa thiết bị!"); fetchDevices(); }
      else toast.error(result.error || "Không thể mở khóa");
    } catch (error) {
      console.error("Unlock device error:", error);
      toast.error("Lỗi mở khóa thiết bị");
    } finally {
      setUnlocking(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getBlockStatus = (device: BlockedDevice) => {
    if (!device.is_blocked) return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Hoạt động</Badge>;
    if (!device.block_expires_at) return <Badge variant="destructive">Khóa vĩnh viễn</Badge>;
    const expiresAt = new Date(device.block_expires_at);
    if (expiresAt > new Date()) return <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/30">Đang khóa</Badge>;
    return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Hoạt động</Badge>;
  };

  const getBlockDuration = (device: BlockedDevice) => {
    if (!device.is_blocked || !device.block_expires_at) return null;
    const expiresAt = new Date(device.block_expires_at);
    const now = new Date();
    if (expiresAt <= now) return null;
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m còn lại`;
    return `${minutes}m còn lại`;
  };

  const blockedDevices = devices.filter(d => d.is_blocked);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Tổng thiết bị</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{devices.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" />Đang bị khóa</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{blockedDevices.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><RefreshCw className="w-4 h-4" />Reset hàng ngày</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Block count reset lúc 00:00 UTC</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="text-destructive">Thiết bị đang bị khóa</CardTitle><CardDescription>Admin có thể mở khóa thiết bị thủ công</CardDescription></div>
          <Button variant="outline" size="sm" onClick={fetchDevices} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Làm mới</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Fingerprint</TableHead><TableHead>Trạng thái</TableHead><TableHead>Lý do</TableHead><TableHead>Hết hạn</TableHead><TableHead>Số lần block</TableHead><TableHead>Risk Score</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {blockedDevices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Không có thiết bị nào đang bị khóa</TableCell></TableRow>
              ) : blockedDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-mono text-xs">{device.fingerprint_hash.slice(0, 16)}...</TableCell>
                  <TableCell>{getBlockStatus(device)}{getBlockDuration(device) && <p className="text-xs text-muted-foreground mt-1">{getBlockDuration(device)}</p>}</TableCell>
                  <TableCell className="text-sm">{device.block_reason === "too_many_failed_attempts" ? "Sai mật khẩu nhiều lần" : device.block_reason || "—"}</TableCell>
                  <TableCell className="text-sm">{device.block_expires_at ? formatDate(device.block_expires_at) : "Vĩnh viễn"}</TableCell>
                  <TableCell><Badge variant="secondary">{device.block_count}</Badge></TableCell>
                  <TableCell><Badge variant={device.risk_score >= 30 ? "destructive" : "outline"}>{device.risk_score}</Badge></TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => unlockDevice(device.fingerprint_hash)} disabled={unlocking === device.fingerprint_hash} className="gap-1"><Unlock className="w-4 h-4" />{unlocking === device.fingerprint_hash ? "Đang mở..." : "Mở khóa"}</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tất cả thiết bị</CardTitle><CardDescription>Danh sách tất cả thiết bị đã truy cập hệ thống</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Fingerprint</TableHead><TableHead>Trạng thái</TableHead><TableHead>Số tài khoản</TableHead><TableHead>Lần đầu</TableHead><TableHead>Lần cuối</TableHead><TableHead>Risk Score</TableHead></TableRow></TableHeader>
            <TableBody>
              {devices.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Chưa có thiết bị nào</TableCell></TableRow>
              ) : devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-mono text-xs">{device.fingerprint_hash.slice(0, 16)}...</TableCell>
                  <TableCell>{getBlockStatus(device)}</TableCell>
                  <TableCell><Badge variant="outline">{device.accounts_count}/3</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(device.first_seen_at)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(device.last_seen_at)}</TableCell>
                  <TableCell><Badge variant={device.risk_score >= 30 ? "destructive" : device.risk_score >= 10 ? "secondary" : "outline"}>{device.risk_score}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
