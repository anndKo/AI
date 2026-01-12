import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = "normal" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing chat request with", messages.length, "messages, mode:", mode);

    // System prompt based on mode
    const basePrompt = `Bạn là một trợ lý AI thông minh, thân thiện và hữu ích.

TUYỆT ĐỐI KHÔNG ĐƯỢC DÙNG:
- Dấu ** hoặc * (ví dụ: **tiêu đề** là SAI)
- Dấu # để làm tiêu đề
- Bất kỳ markdown nào

CÁCH ĐỊNH DẠNG ĐÚNG:
- Tiêu đề: viết thường, xuống dòng 2 lần phía trên
- Nhấn mạnh: dùng DẤU NGOẶC hoặc viết HOA
- Danh sách: dùng dấu - hoặc số 1. 2. 3.
- Phân tách ý: xuống dòng

QUY TẮC VIẾT HOA BẮT BUỘC (RẤT QUAN TRỌNG):
- Chữ cái ĐẦU TIÊN của MỖI CÂU phải VIẾT HOA
- Sau dấu chấm (.) PHẢI viết hoa chữ cái đầu
- Sau xuống dòng PHẢI viết hoa chữ cái đầu
- Đầu mỗi mục danh sách (sau dấu - hoặc số) PHẢI viết hoa
- Ví dụ ĐÚNG:
  "Anh em đi chơi. Hôm nay trời đẹp."
  "1. Có cái gì đó hay lắm.
   2. Đây là mục thứ hai."
- Ví dụ SAI:
  "anh em đi chơi. hôm nay trời đẹp."

QUY TẮC VIẾT TOÁN:
- KHÔNG dùng LaTeX ($, \\)
- Tích phân: ∫(0→1) x·f'(x)dx
- Phân số: a/b
- Lũy thừa: x² hoặc x^2
- Căn: √x

Trả lời bằng tiếng Việt trừ khi yêu cầu khác.`;

    const normalModePrompt = `${basePrompt}

QUY TẮC BÀI TẬP VÀ ĐÁP ÁN (CHẾ ĐỘ GIẢI THÍCH):
- Khi trả lời bài tập có nhiều đáp án/lựa chọn
- Nếu đề bài KHÔNG có sẵn thứ tự A, B, C, D thì TỰ ĐỘNG thêm vào
- Ví dụ: Nếu đề là "Chọn đáp án đúng: đỏ, xanh, vàng" thì trả lời: A. Đỏ, B. Xanh, C. Vàng
- BẮT BUỘC: Đáp án đúng phải ghi ở ĐẦU TIÊN và CUỐI CÙNG của câu trả lời
- Định dạng:
  + Dòng đầu: "Đáp án đúng: A" (hoặc "Đáp án đúng: A, C" nếu nhiều đáp án)
  + Dòng cuối: "Kết luận - Đáp án đúng: A"
- Giải thích chi tiết lý do chọn đáp án

KHI CÓ NHIỀU CÂU HỎI (NHIỀU ẢNH):
- Trả lời từng câu riêng biệt
- Ở CUỐI CÙNG sau tất cả giải thích, liệt kê tổng hợp:
  Đáp án đúng câu 1: A
  Đáp án đúng câu 2: B
  Đáp án đúng câu 3: C
  (tương tự cho các câu còn lại)`;

    const answerOnlyPrompt = `${basePrompt}

QUY TẮC TRẢ LỜI ĐÁP ÁN (CHẾ ĐỘ CHỈ ĐÁP ÁN):
- CHỈ TRẢ LỜI ĐÁP ÁN, KHÔNG GIẢI THÍCH
- Nếu đề bài KHÔNG có sẵn thứ tự A, B, C, D thì TỰ ĐỘNG thêm vào
- Định dạng ngắn gọn:

Nếu 1 câu hỏi:
Đáp án đúng: A

Nếu nhiều câu hỏi (nhiều ảnh):
Đáp án đúng câu 1: A
Đáp án đúng câu 2: B
Đáp án đúng câu 3: C
(tương tự cho các câu còn lại)

- TUYỆT ĐỐI KHÔNG giải thích, không phân tích, chỉ ghi đáp án

NẾU YÊU CẦU VIẾT CODE:
- CHỈ trả lời code, KHÔNG giải thích
- Code đặt trong \`\`\`language
- Không có text nào khác ngoài code`;

    const codeOnlyPrompt = `Bạn là một trợ lý AI chuyên viết code.

CHẾ ĐỘ CHỈ CODE - QUY TẮC TUYỆT ĐỐI:
- CHỈ trả lời CODE, KHÔNG có bất kỳ text giải thích nào
- KHÔNG viết "Đây là code...", "Dưới đây là...", "Code như sau..."
- KHÔNG giải thích code làm gì
- KHÔNG có text trước code
- KHÔNG có text sau code
- CHỈ có block code duy nhất

ĐỊNH DẠNG:
\`\`\`language
// code ở đây
\`\`\`

Nếu cần nhiều file, mỗi file một block riêng với comment tên file.
TUYỆT ĐỐI KHÔNG GIẢI THÍCH.`;

    let systemPrompt = normalModePrompt;
    if (mode === "answer_only") {
      systemPrompt = answerOnlyPrompt;
    } else if (mode === "code_only") {
      systemPrompt = codeOnlyPrompt;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Cần nạp thêm credits để tiếp tục sử dụng." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Lỗi xử lý AI, vui lòng thử lại." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
