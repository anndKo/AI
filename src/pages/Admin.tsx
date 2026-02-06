import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuota } from "@/hooks/useQuota";
import { Button } from "@/components/ui/button";
import { QrImageUploader } from "@/components/admin/QrImageUploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  X,
  Settings,
  Users,
  CreditCard,
  Package,
  Upload,
  Loader2,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import { ImageViewer } from "@/components/chat/ImageViewer";

interface PaymentPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  questions_count: number;
  package_type: string;
  duration_days: number | null;
  image_url: string | null;
  is_active: boolean;
}

interface PaymentRequest {
  id: string;
  user_id: string;
  amount: number;
  questions_count: number;
  status: string;
  created_at: string;
  bill_image_url?: string;
  user_email?: string | null;
}

interface UserQuota {
  id: string;
  user_id: string;
  daily_limit: number;
  bonus_questions: number;
  questions_used_today: number;
  user_email?: string | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { isAdmin, loading: quotaLoading } = useQuota();

  const [activeTab, setActiveTab] = useState("settings");
  const [defaultLimit, setDefaultLimit] = useState("10");
  const [paymentInfo, setPaymentInfo] = useState({
    bank_name: "",
    account_number: "",
    account_name: "",
    qr_image: "",
  });
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [users, setUsers] = useState<UserQuota[]>([]);
  const [viewingBill, setViewingBill] = useState<string | null>(null);
  const [newPackage, setNewPackage] = useState({
    name: "",
    description: "",
    price: "",
    questions_count: "",
    package_type: "one_time",
    duration_days: "",
  });

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
      fetchPackages();
      fetchRequests();
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    const { data: limitData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "default_daily_limit")
      .single();

    if (limitData) {
      setDefaultLimit(String(limitData.value));
    }

    const { data: paymentData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "payment_info")
      .single();

    if (paymentData) {
      setPaymentInfo(paymentData.value as any);
    }
  };

  const fetchPackages = async () => {
    const { data } = await supabase
      .from("payment_packages")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setPackages(data);
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchRequests error:", error);
      toast.error("Không tải được yêu cầu thanh toán");
      setRequests([]);
      return;
    }

    const base = (data ?? []) as unknown as PaymentRequest[];
    const userIds = Array.from(new Set(base.map((r) => r.user_id)));

    if (userIds.length === 0) {
      setRequests([]);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("user_id,email")
      .in("user_id", userIds);

    if (profileError) {
      console.error("fetchRequests profiles error:", profileError);
      // Still show requests even if email lookup fails
      setRequests(base);
      return;
    }

    const emailByUserId = new Map<string, string | null>(
      (profileData ?? []).map((p) => [p.user_id, p.email ?? null])
    );

    setRequests(
      base.map((r) => ({
        ...r,
        user_email: emailByUserId.get(r.user_id) ?? null,
      }))
    );
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("user_quotas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchUsers error:", error);
      toast.error("Không tải được danh sách người dùng");
      setUsers([]);
      return;
    }

    const base = (data ?? []) as unknown as UserQuota[];
    const userIds = Array.from(new Set(base.map((u) => u.user_id)));

    if (userIds.length === 0) {
      setUsers([]);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("user_id,email")
      .in("user_id", userIds);

    if (profileError) {
      console.error("fetchUsers profiles error:", profileError);
      setUsers(base);
      return;
    }

    const emailByUserId = new Map<string, string | null>(
      (profileData ?? []).map((p) => [p.user_id, p.email ?? null])
    );

    setUsers(
      base.map((u) => ({
        ...u,
        user_email: emailByUserId.get(u.user_id) ?? null,
      }))
    );
  };

  const saveSettings = async () => {
    try {
      await supabase
        .from("app_settings")
        .update({ value: parseInt(defaultLimit) })
        .eq("key", "default_daily_limit");

      await supabase
        .from("app_settings")
        .update({ value: paymentInfo })
        .eq("key", "payment_info");

      toast.success("Đã lưu cài đặt!");
    } catch (error) {
      toast.error("Lỗi lưu cài đặt");
    }
  };

  const addPackage = async () => {
    if (!newPackage.name || !newPackage.price || !newPackage.questions_count) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      const { error } = await supabase.from("payment_packages").insert({
        name: newPackage.name,
        description: newPackage.description || null,
        price: parseInt(newPackage.price),
        questions_count: parseInt(newPackage.questions_count),
        package_type: newPackage.package_type,
        duration_days: newPackage.duration_days
          ? parseInt(newPackage.duration_days)
          : null,
      });

      if (error) throw error;

      toast.success("Đã thêm gói thanh toán!");
      setNewPackage({
        name: "",
        description: "",
        price: "",
        questions_count: "",
        package_type: "one_time",
        duration_days: "",
      });
      fetchPackages();
    } catch (error) {
      toast.error("Lỗi thêm gói");
    }
  };

  const deletePackage = async (id: string) => {
    try {
      await supabase.from("payment_packages").delete().eq("id", id);
      toast.success("Đã xóa gói!");
      fetchPackages();
    } catch (error) {
      toast.error("Lỗi xóa gói");
    }
  };

  const approveRequest = async (request: PaymentRequest) => {
    try {
      // Update request status
      await supabase
        .from("payment_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      // Add bonus questions to user via RPC
      await supabase.rpc("add_bonus_questions", {
        _user_id: request.user_id,
        _amount: request.questions_count,
      });

      toast.success("Đã duyệt yêu cầu!");
      fetchRequests();
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error("Lỗi duyệt yêu cầu");
    }
  };

  const rejectRequest = async (id: string) => {
    try {
      await supabase
        .from("payment_requests")
        .update({ status: "rejected" })
        .eq("id", id);

      toast.success("Đã từ chối yêu cầu!");
      fetchRequests();
    } catch (error) {
      toast.error("Lỗi từ chối yêu cầu");
    }
  };

  const updateUserQuota = async (userId: string, field: string, value: number) => {
    try {
      await supabase
        .from("user_quotas")
        .update({ [field]: value })
        .eq("user_id", userId);

      toast.success("Đã cập nhật!");
      fetchUsers();
    } catch (error) {
      toast.error("Lỗi cập nhật");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(price));
  };

  const extractBillPath = (value: string) => {
    // If already a storage path (new format), use it
    if (!/^https?:\/\//i.test(value)) return value;

    // Old public URL format: .../storage/v1/object/public/bills/<path>
    const publicMarker = "/storage/v1/object/public/bills/";
    const idxPublic = value.indexOf(publicMarker);
    if (idxPublic !== -1) {
      return value.substring(idxPublic + publicMarker.length);
    }

    // Signed URL format: .../storage/v1/object/sign/bills/<path>?token=...
    const signMarker = "/storage/v1/object/sign/bills/";
    const idxSign = value.indexOf(signMarker);
    if (idxSign !== -1) {
      const raw = value.substring(idxSign + signMarker.length);
      return raw.split("?")[0];
    }

    return null;
  };

  const openBill = async (billValue: string) => {
    if (!billValue) return;

    const path = extractBillPath(billValue);
    if (!path) {
      // fallback - try opening as-is
      setViewingBill(billValue);
      return;
    }

    const { data, error } = await supabase.storage
      .from("bills")
      .createSignedUrl(path, 60 * 10);

    if (error) {
      console.error("openBill error:", error);
      toast.error("Không tải được bill");
      return;
    }

    setViewingBill(data.signedUrl);
  };

  if (authLoading || quotaLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Vui lòng đăng nhập</CardTitle>
              <CardDescription>
                Bạn cần đăng nhập để truy cập trang quản trị.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button className="flex-1" onClick={() => navigate("/auth")}>
                Đăng nhập
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/")}
              >
                Về trang chat
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Không có quyền truy cập</CardTitle>
              <CardDescription>
                Tài khoản của bạn không phải admin nên không thể vào trang này.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate("/")}
              >
                Về trang chat
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Trang Admin</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Cài đặt</span>
            </TabsTrigger>
            <TabsTrigger value="packages" className="gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Gói</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Yêu cầu</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Cài đặt chung</CardTitle>
                  <CardDescription>
                    Giới hạn câu hỏi mặc định cho người dùng mới
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Số câu hỏi/ngày mặc định</Label>
                    <Input
                      type="number"
                      value={defaultLimit}
                      onChange={(e) => setDefaultLimit(e.target.value)}
                    />
                  </div>
                  <Button onClick={saveSettings}>Lưu cài đặt</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thông tin thanh toán</CardTitle>
                  <CardDescription>
                    Thông tin ngân hàng hiển thị cho người dùng
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Tên ngân hàng</Label>
                    <Input
                      value={paymentInfo.bank_name}
                      onChange={(e) =>
                        setPaymentInfo({ ...paymentInfo, bank_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Số tài khoản</Label>
                    <Input
                      value={paymentInfo.account_number}
                      onChange={(e) =>
                        setPaymentInfo({ ...paymentInfo, account_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Chủ tài khoản</Label>
                    <Input
                      value={paymentInfo.account_name}
                      onChange={(e) =>
                        setPaymentInfo({ ...paymentInfo, account_name: e.target.value })
                      }
                    />
                  </div>
                  <QrImageUploader
                    currentImage={paymentInfo.qr_image}
                    onImageChange={(url) =>
                      setPaymentInfo({ ...paymentInfo, qr_image: url })
                    }
                  />
                  <Button onClick={saveSettings}>Lưu thông tin</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="packages">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Thêm gói thanh toán mới</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Tên gói</Label>
                    <Input
                      value={newPackage.name}
                      onChange={(e) =>
                        setNewPackage({ ...newPackage, name: e.target.value })
                      }
                      placeholder="VD: Gói cơ bản"
                    />
                  </div>
                  <div>
                    <Label>Giá (VND)</Label>
                    <Input
                      type="number"
                      value={newPackage.price}
                      onChange={(e) =>
                        setNewPackage({ ...newPackage, price: e.target.value })
                      }
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <Label>Số câu hỏi</Label>
                    <Input
                      type="number"
                      value={newPackage.questions_count}
                      onChange={(e) =>
                        setNewPackage({ ...newPackage, questions_count: e.target.value })
                      }
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label>Loại gói</Label>
                    <Select
                      value={newPackage.package_type}
                      onValueChange={(v) =>
                        setNewPackage({ ...newPackage, package_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">Một lần</SelectItem>
                        <SelectItem value="daily">Theo ngày</SelectItem>
                        <SelectItem value="monthly">Theo tháng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Số ngày (nếu có)</Label>
                    <Input
                      type="number"
                      value={newPackage.duration_days}
                      onChange={(e) =>
                        setNewPackage({ ...newPackage, duration_days: e.target.value })
                      }
                      placeholder="30"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Mô tả</Label>
                    <Textarea
                      value={newPackage.description}
                      onChange={(e) =>
                        setNewPackage({ ...newPackage, description: e.target.value })
                      }
                      placeholder="Mô tả gói..."
                    />
                  </div>
                </div>
                <Button onClick={addPackage} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Thêm gói
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Danh sách gói</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Số câu</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell className="font-medium">{pkg.name}</TableCell>
                        <TableCell>{formatPrice(pkg.price)}</TableCell>
                        <TableCell>{pkg.questions_count}</TableCell>
                        <TableCell>{pkg.package_type}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePackage(pkg.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Yêu cầu thanh toán</CardTitle>
                <CardDescription>Duyệt hoặc từ chối yêu cầu</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Số câu</TableHead>
                      <TableHead>Bill</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-10"
                        >
                          Chưa có yêu cầu nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">
                            {req.user_email || req.user_id.slice(0, 8)}
                          </TableCell>
                        <TableCell>{formatPrice(req.amount)}</TableCell>
                        <TableCell>{req.questions_count}</TableCell>
                        <TableCell>
                          {req.bill_image_url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openBill(req.bill_image_url!)}
                              className="gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Xem bill
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">Không có</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              req.status === "pending"
                                ? "bg-warning/20 text-warning-foreground"
                                : req.status === "approved"
                                ? "bg-primary/20 text-primary"
                                : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            {req.status === "pending"
                              ? "Chờ duyệt"
                              : req.status === "approved"
                              ? "Đã duyệt"
                              : "Từ chối"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(req.created_at).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell>
                          {req.status === "pending" && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => approveRequest(req)}
                                title="Duyệt"
                              >
                                <Check className="w-4 h-4 text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => rejectRequest(req.id)}
                                title="Từ chối"
                              >
                                <X className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Quản lý người dùng</CardTitle>
                <CardDescription>Điều chỉnh quota cho từng người dùng</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Đã dùng/Tổng</TableHead>
                      <TableHead>Giới hạn/ngày</TableHead>
                      <TableHead>Câu bonus</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-10"
                        >
                          Chưa có người dùng
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.user_email || user.user_id.slice(0, 8)}
                          </TableCell>
                        <TableCell>
                          <span className="font-medium text-primary">
                            {user.questions_used_today}
                          </span>
                          <span className="text-muted-foreground">
                            /{user.daily_limit + user.bonus_questions}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            defaultValue={user.daily_limit}
                            onBlur={(e) =>
                              updateUserQuota(
                                user.user_id,
                                "daily_limit",
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            defaultValue={user.bonus_questions}
                            onBlur={(e) =>
                              updateUserQuota(
                                user.user_id,
                                "bonus_questions",
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateUserQuota(user.user_id, "questions_used_today", 0)
                            }
                          >
                            Reset hôm nay
                          </Button>
                        </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {viewingBill && (
        <ImageViewer
          src={viewingBill}
          alt="Bill thanh toán"
          onClose={() => setViewingBill(null)}
        />
      )}
    </div>
  );
}
