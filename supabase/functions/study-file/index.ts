import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 8192): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("AI error:", resp.status, errText);
    if (resp.status === 429) throw new Error("Rate limited");
    if (resp.status === 402) throw new Error("Credits exhausted");
    throw new Error("AI error");
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAIStructured(systemPrompt: string, userPrompt: string, toolDef: any, retries = 2): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 16384,
        tools: [{ type: "function", function: toolDef }],
        tool_choice: { type: "function", function: { name: toolDef.name } },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`AI structured error (attempt ${attempt + 1}):`, resp.status, errText);
      if (resp.status === 429) throw new Error("Rate limited");
      if (resp.status === 402) throw new Error("Credits exhausted");
      if (attempt === retries) throw new Error("AI error");
      continue;
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      try {
        return JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool arguments:", e);
        if (attempt === retries) throw new Error("Invalid AI response format");
        continue;
      }
    }

    // Fallback: try to extract JSON from content
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      console.log("No tool_calls, trying to parse content as JSON");
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Content JSON parse failed:", e);
      }
    }

    console.warn(`No structured response on attempt ${attempt + 1}, retrying...`);
    if (attempt < retries) await new Promise(r => setTimeout(r, 1000));
  }

  throw new Error("No structured response after retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "extract") {
      const { fileName, fileType, fileBase64 } = body;
      const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
      let text = "";
      
      if (fileType === "text/plain" || fileName.endsWith(".txt") || fileName.endsWith(".md")) {
        text = new TextDecoder().decode(bytes);
      } else {
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const rawText = decoder.decode(bytes);
        
        if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
          const textParts: string[] = [];
          const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
          let match;
          while ((match = streamRegex.exec(rawText)) !== null) {
            const streamContent = match[1];
            const textRegex = /\(([^)]*)\)/g;
            let textMatch;
            while ((textMatch = textRegex.exec(streamContent)) !== null) {
              if (textMatch[1].trim()) textParts.push(textMatch[1]);
            }
          }
          
          if (textParts.length > 0) {
            text = textParts.join(" ");
          } else {
            text = rawText.replace(/[^\x20-\x7E\n\r\t\u00C0-\u024F\u1E00-\u1EFF]/g, " ")
                         .replace(/\s{3,}/g, "\n")
                         .trim();
          }
        } else {
          const textParts: string[] = [];
          const xmlTextRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
          let match;
          while ((match = xmlTextRegex.exec(rawText)) !== null) {
            if (match[1].trim()) textParts.push(match[1]);
          }
          text = textParts.length > 0 ? textParts.join(" ") : 
                 rawText.replace(/[^\x20-\x7E\n\r\t\u00C0-\u024F\u1E00-\u1EFF]/g, " ")
                        .replace(/\s{3,}/g, "\n").trim();
        }
      }

      if (text.length > 300000) {
        text = text.slice(0, 300000);
      }

      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "summarize") {
      const { content, fileName } = body;
      const truncated = content.slice(0, 150000);

      const summary = await callAI(
        `Ban la tro ly hoc tap chuyen nghiep. Nhiem vu cua ban la TOM TAT CHI TIET va DAY DU noi dung tai lieu.

TUYET DOI KHONG DUOC DUNG:
- Dau ** hoac * (vi du: **tieu de** la SAI)
- Dau # de lam tieu de
- Bat ky markdown nao

CACH DINH DANG DUNG:
- Tieu de phan: VIET HOA toan bo, xuong dong 2 lan phia tren
- Tieu de phu: Viet thuong kem dau hai cham
- Danh sach: dung dau - hoac so 1. 2. 3.
- Nhan manh: viet HOA tu quan trong

QUY TAC TOM TAT:
- Tom tat THAT CHI TIET, DAY DU, khong bo sot y quan trong
- Phan tich sau, khong chi liet ke ma phai giai thich
- Chia thanh cac phan chinh ro rang voi tieu de VIET HOA
- Moi phan co nhieu y chi tiet
- Giu nguyen thuat ngu chuyen nganh
- Neu co so lieu, cong thuc, dinh nghia quan trong thi PHAI giu lai
- Neu tai lieu dai, tom tat theo tung chuong/phan
- Viet bang tieng Viet
- Chu dau cau PHAI viet hoa
- Cuoi cung co phan KET LUAN tong hop cac y chinh nhat`,
        `Tom tat THAT CHI TIET va DAY DU tai lieu "${fileName}". Phan tich ky luong tung phan, khong bo sot thong tin quan trong:\n\n${truncated}`,
        16384
      );

      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "quiz") {
      const { content, fileName, questionCount = 10, startIndex = 0 } = body;
      const truncated = content.slice(0, 100000);
      const actualCount = Math.min(questionCount, 10); // Max 10 per batch

      const result = await callAIStructured(
        `Ban la giao vien tao cau hoi trac nghiem tu tai lieu. Tao ${actualCount} cau hoi ly thuyet lien quan truc tiep den noi dung tai lieu. Cau hoi phai da dang, bao phu nhieu phan cua tai lieu. ${startIndex > 0 ? `Day la lot cau hoi tiep theo (bat dau tu cau ${startIndex + 1}), KHONG duoc lap lai cac cau hoi truoc do.` : ''}`,
        `Tao ${actualCount} cau hoi trac nghiem (4 dap an A/B/C/D) tu tai lieu "${fileName}":\n\n${truncated}`,
        {
          name: "create_quiz",
          description: "Create quiz questions from document content",
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string", description: "The question text" },
                    options: {
                      type: "array",
                      items: { type: "string" },
                      description: "4 answer options",
                    },
                    correctIndex: {
                      type: "number",
                      description: "0-based index of correct answer",
                    },
                    explanation: {
                      type: "string",
                      description: "Brief explanation of the correct answer in Vietnamese",
                    },
                  },
                  required: ["question", "options", "correctIndex", "explanation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        }
      );

      return new Response(JSON.stringify({ questions: result.questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "parse-quiz") {
      const { content, questionCount = 50 } = body;
      // Clean text: fix common OCR/encoding artifacts
      let cleaned = content
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\t/g, " ")
        .replace(/\u00A0/g, " ") // non-breaking space
        .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
        .replace(/\\\s/g, "") // stray backslashes before spaces
        .replace(/\\n/g, "\n") // literal \n
        .replace(/\s{3,}/g, "  ") // collapse excessive spaces
        .trim();
      
      const truncated = cleaned.slice(0, 150000);
      const actualCount = Math.min(questionCount, 50);

      const result = await callAIStructured(
        `Ban la giao vien chuyen phan tich de thi trac nghiem. Nhiem vu:
1. Doc KY noi dung de thi, COPY CHINH XAC tung cau hoi va dap an tu file goc
2. Tach CHINH XAC ${actualCount} cau hoi dau tien (neu co du)
3. Giu nguyen 100% noi dung goc, KHONG sua doi, KHONG dich, KHONG viet lai
4. Phan tich va xac dinh dap an dung cho moi cau
5. Giai thich ngan gon tai sao dap an do dung

QUAN TRONG:
- COPY NGUYEN VAN cau hoi va dap an tu de thi, tranh loi ki tu
- Neu gap ki tu la (vi du: F I\\ & \\ s) thi doc lai context va sua cho dung nghia
- Neu de co dap an san, uu tien dap an cua de
- Neu khong co dap an, dung kien thuc de tra loi CHINH XAC
- Phai tra ve DUNG ${actualCount} cau (neu de co du)
- Viet giai thich bang tieng Viet`,
        `Phan tich de thi trac nghiem sau. Tach CHINH XAC ${actualCount} cau hoi, copy nguyen van noi dung:\n\n${truncated}`,
        {
          name: "parse_quiz",
          description: `Parse exactly ${actualCount} quiz questions from uploaded exam content`,
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string", description: "The exact question text copied from the document" },
                    options: {
                      type: "array",
                      items: { type: "string" },
                      description: "Answer options exactly as in the document",
                    },
                    correctIndex: {
                      type: "number",
                      description: "0-based index of correct answer",
                    },
                    explanation: {
                      type: "string",
                      description: "Brief explanation in Vietnamese",
                    },
                  },
                  required: ["question", "options", "correctIndex", "explanation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        }
      );

      return new Response(JSON.stringify({ questions: result.questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Study function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
