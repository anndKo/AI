import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuota } from "@/hooks/useQuota";
import { Button } from "@/components/ui/button";
import { QrImageUploader } from "@/components/admin/QrImageUploader";
import { BillReviewModal } from "@/components/admin/BillReviewModal";
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
  Settings,
  Users,
  CreditCard,
  Package,
} from "lucide-react";

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
  bill_image: string;
  status: string;
  created_at: string;
  approved_at?: string;
  approved_days?: number;
  approved_questions?: number;
  rejection_reason?: string;
  profiles?: { email: string };
}

interface UserQuota {
  id: string;
  user_id: string;
  daily_limit: number;
  questions_used_today?: number;
  bonus_questions: number;
  profiles?: { email: string };
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
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [showBillReview, setShowBillReview] = useState(false);
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
    const { data } = await supabase
      .from("payment_requests")
      .select("*, profiles:user_id(email)")
      .order("created_at", { ascending: false });

    if (data) setRequests(data as any);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("user_quotas")
      .select("*, profiles:user_id(email)")
      .order("created_at", { ascending: false });

    if (data) setUsers(data as any);
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

      // Update all users with the new daily limit
      const { data: allUsers } = await supabase
        .from("user_quotas")
        .select("id, user_id");

      if (allUsers) {
        for (const user of allUsers) {
          await supabase
            .from("user_quotas")
            .update({ daily_limit: parseInt(defaultLimit) })
            .eq("user_id", user.user_id);
        }
      }

      toast.success("Đã lưu cài đặt và cập nhật tất cả người dùng!");
      fetchUsers();
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

  // Hàm deletePackage bị thiếu trong code cũ
  const deletePackage = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_packages")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Đã xóa gói!");
      fetchPackages();
    } catch (error) {
      toast.error("Lỗi xóa gói");
    }
  };

  const openBillReview = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setShowBillReview(true);
  };

  const handleBillApprovalComplete = () => {
    fetchRequests();
    fetchUsers();
    setShowBillReview(false);
    setSelectedRequest(null);
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

  // Hàm formatPrice bị thiếu trong code cũ
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
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
                <CardDescription>Duyệt hoặc từ chối yêu cầu với hình ảnh bill</CardDescription>
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
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {req.profiles?.email || req.user_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{formatPrice(req.amount)}</TableCell>
                        <TableCell>{req.questions_count}</TableCell>
                        <TableCell>
                          {req.bill_image ? (
                            <img
                              src={req.bill_image}
                              alt="Bill"
                              className="h-12 w-12 object-cover rounded cursor-pointer hover:opacity-80"
                              onClick={() => openBillReview(req)}
                            />
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              req.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : req.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openBillReview(req)}
                            >
                              Duyệt
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Quản lý người dùng</CardTitle>
                <CardDescription>Xem thông tin và điều chỉnh quota</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Giới hạn/ngày</TableHead>
                      <TableHead>Số lượt hỏi còn lại</TableHead>
                      <TableHead>Hôm nay</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      // Calculate remaining questions
                      const remaining = user.daily_limit - (user.questions_used_today || 0) + (user.bonus_questions || 0);
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.profiles?.email || user.user_id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            {user.daily_limit}
                          </TableCell>
                          <TableCell>
                            <span className={remaining <= 0 ? "text-red-600 font-semibold" : ""}>
                              {remaining}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-sm">
                              {user.questions_used_today || 0}/{user.daily_limit}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateUserQuota(user.user_id, "questions_used_today", 0)
                              }
                            >
                              Reset
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bill Review Modal */}
        <BillReviewModal
          open={showBillReview}
          request={selectedRequest}
          onClose={() => setShowBillReview(false)}
          onApprove={handleBillApprovalComplete}
        />
      </div>
    </div>
  );
}