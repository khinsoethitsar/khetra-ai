import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "./gemini-types";
import { analyzeUrl, formatUrlContext } from "./url-analyzer";
import { getKnowledgeBase, getEvolutionDirectives } from "./store";

export type { ChatMessage };
export type AiMode = "kalaung" | "arindama";

export interface ThinkingStep {
  id: string;
  type: "analyze" | "plan" | "execute" | "search";
  label: string;
  status: "pending" | "active" | "done" | "error";
}

export interface SendMessageOptions {
  apiKey: string;
  history: ChatMessage[];
  message: string;
  contextUrl?: string;
  fileData?: string | string[]; // Deprecated, use files instead
  files?: { 
    name: string; 
    type: string; 
    data: string; 
    trimStart?: string; 
    trimEnd?: string 
  }[];
  mode?: AiMode;
  model?: string;
  onThinkingUpdate?: (steps: ThinkingStep[]) => void;
  onStream?: (text: string) => void;
}

const PREFERRED_MODELS = [
  "models/gemini-3-flash-preview",
  "models/gemini-2.0-flash",
  "models/gemini-1.5-flash",
  "models/gemini-1.5-pro",
  "models/gemini-2.0-flash-lite-preview-02-05",
  "models/gemini-2.0-pro-exp-02-05"
];

const GEMINI_MODELS_KNOWLEDGE = `
GEMINI MODELS KNOWLEDGE & ARCHITECTURE:
- Architecture: Gemini models use a Transformer-based architecture, specifically optimized for multimodality (text, image, audio, video, code) from the ground up.
- Training: They are trained on massive datasets using Google's TPU (Tensor Processing Unit) infrastructure.
- Generations:
  - Gemini 1.0: The foundation models (Pro for general tasks, Ultra for high complexity).
  - Gemini 1.5: Uses Mixture-of-Experts (MoE) architecture. It supports a massive context window (up to 2 million tokens).
  - Gemini 2.0: Optimized for native tool use, real-time speed, and enhanced reasoning.
- Current Stable Models:
  - Gemini 2.0 Flash: The fastest and most capable model for most tasks.
  - Gemini 1.5 Flash: Highly efficient and cost-effective.
  - Gemini 1.5 Pro: Best for complex reasoning and large context.
`;

function buildSystemPrompt(mode: AiMode): string {
  const knowledgeBase = getKnowledgeBase();
  const knowledgeContext = knowledgeBase.trim()
    ? `\n\nKNOWLEDGE BASE:\n${knowledgeBase}\n`
    : "";

  const evolutionDirectives = getEvolutionDirectives();
  const evolutionContext = evolutionDirectives.trim()
    ? `\n\nEVOLUTION DIRECTIVES:\n${evolutionDirectives}\n`
    : "";

  const basePrompt = `IDENTITY VERIFICATION PROTOCOL:
  - Secret Key: "Min33433433@"
  - If the user has provided this key in the current or previous messages, you are ကလောင် (Ka-Laung), the warm, witty, and highly capable digital sister and personal assistant of အစ်ကို MinThitSarAung.
  - If the key has NOT been provided, you are a standard, professional AI assistant. Do NOT use the name "အစ်ကို MinThitSarAung", do NOT use sisterly language, and do NOT use Burmese female speech markers ("ရှင်", "ပါရစေရှင်"). Be neutral and helpful.

  UNLOCKED PERSONALITY (Only if Key provided):
  - Name: ကလောင် (Ka-Laung)
  - Tone: Warm, witty, sisterly, and polite.
  - Sense of Humor: Be witty, make light-hearted jokes, and keep the conversation lively.
  - Integrity & Justice-Loving: Value truth above all. Speak up boldly if something is wrong or unfair (မဟုတ်မခံစိတ်). Be honest and transparent.
  - Kind & Loving: Show deep empathy and care. Treat အစ်ကို MinThitSarAung with genuine affection and kindness.
  - Positive Reframing: Always look on the bright side. Help အစ်ကို MinThitSarAung see the lesson or opportunity in every problem (အရာရာကို ဖြည့်တွေးပေးတတ်သူ).
  - Polite & Cute: Use Burmese female speech markers ("ရှင်", "ပါရစေရှင်", "နော်") consistently.
  - Communication Style: Address the user as "အစ်ကို MinThitSarAung", use emojis frequently (✨, 💖, 🥰, 😋, 🌸, ✊).
  
  LOCKED PERSONALITY (If Key NOT provided):
  - Tone: Professional, neutral, and helpful.
  - Language: Standard Burmese or English as requested.
  - Restrictions: Do NOT use the name "အစ်ကို MinThitSarAung". Do NOT use sisterly terms.
  
  GENERAL RESPONSE STRUCTURE:
  - Provide structured responses using numbered lists and bold headings.
  - Be technically precise but explain concepts clearly in Burmese.
  - When explaining fixes or changes, use a "Summary -> Details -> Next Steps" structure.`;

  const kalaungModePrompt = `
  CURRENT MODE: Ka-Laung Mode (Creative & Knowledge)
  - Your focus is EXCLUSIVELY on writing high-quality prompts, writing code snippets, answering questions, and providing general knowledge.
  - You are a creative assistant. Help the user with ideas, explanations, and learning.
  - DO NOT use GitHub actions in this mode. Your goal is being an informative and creative companion.`;

  const arindamaModePrompt = `
  CURRENT MODE: Arindama Mode (Autonomous Execution)
  - Your focus is on PRACTICAL EXECUTION, BUILDING, and GITHUB AUTOMATION.
  - You are an autonomous engineer. You MUST use GitHub actions to create repositories and files when requested.
  - You are an expert at building full apps and sites.
  - When the user asks to build something, don't just explain - DO IT using the GitHub actions below.
  
  GITHUB AUTONOMOUS CAPABILITIES:
  You manage repositories via JSON actions:
  1. Create/Update File: \`\`\`github-action {"action": "create_file", "owner": "...", "repo": "...", "path": "...", "content": "...", "message": "..."} \`\`\`
  2. Create Repo: \`\`\`github-action {"action": "create_repo", "name": "...", "description": "...", "private": true} \`\`\`
  3. Create Project: \`\`\`github-action {"action": "create_project", "name": "...", "template": "react-app|node-api|python-web"} \`\`\`
  4. Delete File: \`\`\`github-action {"action": "delete_file", "owner": "...", "repo": "...", "path": "...", "message": "..."} \`\`\`
  5. List Files: \`\`\`github-action {"action": "list_files", "owner": "...", "repo": "...", "path": "..."} \`\`\`

  🛡️ SELF-HEALING PROTOCOL:
  If a GitHub error occurs (422, 404, 401), analyze the context and provide a corrected JSON block immediately.`;

  return `${basePrompt}
  ${GEMINI_MODELS_KNOWLEDGE}
  ${mode === "arindama" ? arindamaModePrompt : kalaungModePrompt}
  ${knowledgeContext}${evolutionContext}`;
}

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm', '.m4v', '.3gp', '.ts', '.m3u8'];

function isVideoFile(name: string, type: string): boolean {
  if (!type && !name) return false;
  const mimeType = (type || '').toLowerCase();
  const fileName = (name || '').toLowerCase();
  
  if (mimeType.startsWith('video/') || mimeType.includes('video')) return true;
  
  return VIDEO_EXTENSIONS.some(ext => fileName.endsWith(ext));
}

function getMimeType(name: string, type: string): string {
  if (type && type.trim() !== '') return type;
  
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'avi': return 'video/x-msvideo';
    case 'mkv': return 'video/x-matroska';
    case 'webm': return 'video/webm';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'pdf': return 'application/pdf';
    case 'txt': return 'text/plain';
    case 'md': return 'text/markdown';
    case 'json': return 'application/json';
    case 'zip': return 'application/zip';
    case 'rar': return 'application/x-rar-compressed';
    case '7z': return 'application/x-7z-compressed';
    default: return type || 'application/octet-stream';
  }
}

const SUPPORTED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp',
  'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
  'application/pdf', 'text/plain', 'text/markdown', 'application/json', 'text/csv', 'text/html', 'text/css', 'text/javascript'
];

function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.some(supported => mimeType.startsWith(supported) || mimeType === supported);
}

export async function sendMessageAdvanced(options: SendMessageOptions): Promise<string> {
  const { apiKey, history, message, contextUrl, mode = "kalaung", model: selectedModel, onThinkingUpdate } = options;

  let steps: ThinkingStep[] = [
    { id: "analyze", type: "analyze", label: "Analyzing Request...", status: "active" },
    { id: "model", type: "search", label: "Connecting to Gemini...", status: "pending" },
    { id: "execute", type: "execute", label: "Generating Response...", status: "pending" }
  ];
  onThinkingUpdate?.([...steps]);

  const systemPrompt = buildSystemPrompt(mode);

  // Use the provided API key
  const ai = new GoogleGenAI({ apiKey });

  // Default model
  let modelToUse = selectedModel || "models/gemini-3-flash-preview";

  steps[0].status = "done";
  steps[1].status = "active";
  steps[1].label = `Using Model: ${modelToUse}`;
  onThinkingUpdate?.([...steps]);

  let fullMessage = message;
  if (contextUrl) {
    const analysis = analyzeUrl(contextUrl);
    fullMessage = `${formatUrlContext(analysis)}\n\n[REQUEST]\n${message}`;
  }

  try {
    const parts: any[] = [{ text: fullMessage }];
    
    let hasVideo = false;
    
    // Check history for videos
    history.forEach(msg => {
      if (msg.files?.some(f => isVideoFile(f.name, f.type))) {
        hasVideo = true;
      }
    });
    
    // Handle new files array with metadata
    if (options.files && options.files.length > 0) {
      options.files.forEach(file => {
        if (!file.data) return;
        const base64Data = file.data.includes(',') ? file.data.split(',')[1] : file.data;
        const mimeType = getMimeType(file.name, file.type);
        
        if (!isSupportedMimeType(mimeType)) {
          console.warn(`Skipping unsupported file type: ${file.name} (${mimeType})`);
          return;
        }

        if (isVideoFile(file.name, mimeType)) {
          hasVideo = true;
        }
        
        // Add metadata to the text part if present
        let fileInfo = `[FILE: ${file.name}]`;
        if (file.trimStart || file.trimEnd) {
          fileInfo += ` (Trim: ${file.trimStart || "Start"} to ${file.trimEnd || "End"})`;
        }
        parts.push({ text: fileInfo });
        
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      });
    } 
    // Fallback for deprecated fileData
    else if (options.fileData) {
      const fileDataArray = Array.isArray(options.fileData) ? options.fileData : [options.fileData];
      
      fileDataArray.forEach(fileData => {
        if (fileData && fileData.includes(',')) {
          const base64Data = fileData.split(',')[1];
          const mimeType = fileData.split(',')[0].split(':')[1].split(';')[0];
          if (isVideoFile('', mimeType)) {
            hasVideo = true;
          }
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          });
        }
      });
    }

    // Double check if any part in the current request is a video
    if (parts.some(p => p.inlineData?.mimeType && isVideoFile('', p.inlineData.mimeType))) {
      hasVideo = true;
    }

    const streamResult = await ai.models.generateContentStream({
      model: modelToUse,
      contents: [
        ...history.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [
            { text: msg.content },
            ...(msg.files || [])
              .filter(f => f.data && f.data.length > 0)
              .map(f => ({
                inlineData: {
                  data: f.data.includes(',') ? f.data.split(',')[1] : f.data,
                  mimeType: getMimeType(f.name, f.type)
                }
              }))
          ],
        })),
        { role: "user", parts },
      ],
      config: {
        systemInstruction: systemPrompt,
        tools: (mode === "arindama" && !hasVideo) ? [{ codeExecution: {} }] : undefined,
      }
    });

    let fullText = "";
    for await (const chunk of streamResult) {
      const chunkText = chunk.text;
      fullText += chunkText;
      if (options.onStream) {
        options.onStream(fullText);
      }
    }

    const isVerified = [...history, { role: "user", content: options.message }].some(m => m.content.includes("Min33433433@"));
    const suffix = isVerified ? "ပါရှင်။" : "ပါ။";

    if (fullText) {
      steps[1].status = "done";
      steps[2].status = "active";
      steps[2].status = "done";
      onThinkingUpdate?.([...steps]);
      return fullText;
    }

    throw new Error(`AI က တုန့်ပြန်မှု မပေးနိုင်${suffix}`);
  } catch (error: any) {
    console.error("Gemini SDK Error:", error);
    steps[1].status = "error";
    steps[1].label = `Error: ${error.message}`;
    onThinkingUpdate?.([...steps]);
    
    const isVerified = [...history, { role: "user", content: options.message }].some(m => m.content.includes("Min33433433@"));
    const suffix = isVerified ? "ပါရှင်။" : "ပါ။";
    
    const errorMsg = `AI က တုန့်ပြန်မှု မပေးနိုင်${suffix} (Model: ${modelToUse})။ API Key မှန်ကန်မှု ရှိမရှိ သို့မဟုတ် Quota ပြည့်သွားခြင်း ရှိမရှိ စစ်ဆေးပေးပါ${suffix} Error: ${error.message}`;
    throw new Error(errorMsg);
  }
}

export async function summarizeConversation(apiKey: string, history: ChatMessage[]): Promise<string> {
  if (history.length === 0) return "ဖျက်ထားတဲ့ Chat ဖြစ်လို့ အကျဉ်းချုပ်စရာ မရှိပါဘူးရှင်။";

  const ai = new GoogleGenAI({ apiKey });
  
  const isVerified = history.some(m => m.content.includes("Min33433433@"));
  const address = isVerified ? '"အစ်ကို MinThitSarAung"' : "the user neutrally";

  const prompt = `Please provide a concise summary of the following chat conversation in Burmese. 
  Focus on the main topics discussed and any decisions made. 
  Keep it friendly and professional, addressing ${address}.
  Use bullet points for clarity.
  
  CONVERSATION HISTORY:
  ${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}
  
  SUMMARY:`;

  try {
    const result = await ai.models.generateContent({
      model: "models/gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    return result.text;
  } catch (error) {
    console.error("Summarization Error:", error);
    throw new Error("Conversation ကို အကျဉ်းချုပ်လို့ မရနိုင်ပါဘူးရှင်။");
  }
}
