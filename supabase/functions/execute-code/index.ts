import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TestCase { input: string; output: string; }

function translateError(stderr: string): string {
  if (!stderr) return "Lỗi không xác định";
  if (stderr.includes("SyntaxError")) return `Lỗi cú pháp: ${stderr.split("SyntaxError:")[1]?.trim().split("\n")[0] || stderr}`;
  if (stderr.includes("IndentationError")) return `Lỗi thụt lề: Kiểm tra khoảng trắng đầu dòng`;
  if (stderr.includes("NameError")) return `Lỗi tên biến: ${stderr.split("NameError:")[1]?.trim().split("\n")[0] || "Biến chưa được khai báo"}`;
  if (stderr.includes("TypeError")) return `Lỗi kiểu dữ liệu: ${stderr.split("TypeError:")[1]?.trim().split("\n")[0] || stderr}`;
  if (stderr.includes("IndexError")) return `Lỗi chỉ số: Truy cập phần tử ngoài phạm vi mảng`;
  if (stderr.includes("ZeroDivisionError")) return `Lỗi chia cho 0`;
  if (stderr.includes("ValueError")) return `Lỗi giá trị: ${stderr.split("ValueError:")[1]?.trim().split("\n")[0] || stderr}`;
  if (stderr.includes("ImportError") || stderr.includes("ModuleNotFoundError")) return `Lỗi import: Module không tồn tại`;
  if (stderr.includes("expected ';'")) return `Lỗi cú pháp: Thiếu dấu chấm phẩy (;)`;
  if (stderr.includes("undeclared identifier") || stderr.includes("was not declared")) return `Lỗi: Biến chưa được khai báo`;
  if (stderr.includes("expected '}'")) return `Lỗi cú pháp: Thiếu dấu ngoặc nhọn đóng (})`;
  if (stderr.includes("no matching function")) return `Lỗi: Hàm không tồn tại hoặc sai tham số`;
  if (stderr.includes("segmentation fault") || stderr.includes("Segmentation")) return `Lỗi bộ nhớ: Segmentation Fault`;
  if (stderr.includes("cannot find symbol")) return `Lỗi: Biến hoặc phương thức chưa được khai báo`;
  if (stderr.includes("NullPointerException")) return `Lỗi: Truy cập đối tượng null`;
  if (stderr.includes("ArrayIndexOutOfBoundsException")) return `Lỗi: Truy cập phần tử ngoài phạm vi mảng`;
  if (stderr.includes("timeout") || stderr.includes("Timeout") || stderr.includes("Time Limit")) return `Lỗi: Chương trình chạy quá thời gian (timeout)`;
  if (stderr.includes("runtime error")) return `Lỗi runtime: ${stderr.split("runtime error:")[1]?.trim().split("\n")[0] || stderr}`;
  return stderr.slice(0, 500);
}

function extractErrorLine(stderr: string): number | null {
  let m = stderr.match(/line (\d+)/);
  if (m) return parseInt(m[1]);
  m = stderr.match(/:(\d+):\d+:/);
  if (m) return parseInt(m[1]);
  m = stderr.match(/\.java:(\d+)/);
  if (m) return parseInt(m[1]);
  return null;
}

async function executeWithAI(code: string, language: string, stdin: string): Promise<{ stdout: string; stderr: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("Chưa cấu hình AI key");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a code execution engine. Execute the given ${language} code with the provided stdin input.
Return ONLY a JSON object with exactly this format, no other text:
{"stdout":"<exact output>","stderr":"<any errors or empty string>"}

Rules:
- Execute the code mentally step by step
- Return the EXACT output the program would produce (including newlines)
- If there are errors, put the error message in stderr and leave stdout empty
- Do NOT add any explanation or commentary
- The response must be valid JSON only`
          },
          {
            role: "user",
            content: `Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nStdin input:\n${stdin || "(no input)"}`
          }
        ],
        temperature: 0,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`AI service error (${resp.status}): ${errText.slice(0, 200)}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI không trả về kết quả hợp lệ");
    
    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language, testCases } = await req.json() as {
      code: string;
      language: string;
      testCases: TestCase[];
    };

    if (!code || !testCases || testCases.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Thiếu code hoặc test cases" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    for (const tc of testCases) {
      try {
        const { stdout, stderr } = await executeWithAI(code, language, tc.input);

        if (stderr && !stdout) {
          results.push({
            input: tc.input, expected: tc.output, actual: "",
            passed: false,
            error: translateError(stderr),
            errorLine: extractErrorLine(stderr),
            rawError: stderr.slice(0, 300),
          });
        } else {
          const output = (stdout || "").trim();
          results.push({
            input: tc.input, expected: tc.output, actual: output,
            passed: output === tc.output.trim(),
            errorLine: null,
          });
        }
      } catch (e) {
        results.push({
          input: tc.input, expected: tc.output, actual: "",
          passed: false,
          error: e instanceof Error ? e.message : "Lỗi không xác định",
          errorLine: null,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("execute-code error:", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
