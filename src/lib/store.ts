
import { ChatMessage } from "./gemini-types";

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

const PROMPTS_KEY = "kalaung_prompts";
const API_KEY_KEY = "kalaung_gemini_key";
const LANG_KEY = "kalaung_lang";
const KB_KEY = "kalaung_knowledge_base";
const MODE_KEY = "kalaung_ai_mode";
const EVOLUTION_KEY = "kalaung_evolution_directives";
const GITHUB_TOKEN_KEY = "kalaung_github_token";
const CHAT_HISTORY_KEY = "kalaung_chat_history";
const MODEL_KEY = "kalaung_model";
const REPO_INFO_KEY = "kalaung_repo_info";

const isStorageAvailable = () => {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
};

export function getChatHistory(): ChatSession[] {
  if (!isStorageAvailable()) return [];
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

export function saveChatSession(session: ChatSession) {
  if (!isStorageAvailable()) return;
  try {
    const history = getChatHistory();
    
    // Prune logic: LocalStorage limit is usually 5MB. 
    // We should be aggressive about removing large base64 data from history.
    
    // 1. Prune the current session's messages if they are too large
    session.messages.forEach(m => {
      if (m.files) {
        m.files.forEach(f => {
          if (f.data && f.data.length > 500 * 1024) {
            f.data = "";
          }
        });
      }
    });

    const index = history.findIndex(s => s.id === session.id);
    if (index !== -1) {
      history[index] = session;
    } else {
      history.unshift(session);
    }

    // 2. Aggressive pruning of all sessions
    let historyJson = JSON.stringify(history);
    
    if (historyJson.length > 3 * 1024 * 1024) {
      // If history > 3MB, strip ALL file data from ALL sessions
      history.forEach(s => {
        s.messages.forEach(m => {
          if (m.files) {
            m.files.forEach(f => {
              f.data = "";
            });
          }
        });
      });
    }

    // 3. Final safety check: if still too large, remove oldest sessions
    while (JSON.stringify(history).length > 4 * 1024 * 1024 && history.length > 1) {
      history.pop();
    }

    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
  } catch (e) { 
    console.error("Failed to save chat history:", e);
    // If it fails even after pruning, try clearing oldest history entirely
    try {
      const history = getChatHistory();
      if (history.length > 1) {
        // Remove half of the history if we hit a hard quota limit
        const half = Math.floor(history.length / 2);
        const pruned = history.slice(0, half);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(pruned));
      } else {
        // If even one session is too big, we have to clear it
        localStorage.removeItem(CHAT_HISTORY_KEY);
      }
    } catch (innerE) {
      console.error("Critical storage failure:", innerE);
    }
  }
}

export function deleteChatSession(id: string) {
  if (!isStorageAvailable()) return;
  try {
    const history = getChatHistory();
    const filtered = history.filter(s => s.id !== id);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(filtered));
  } catch (e) { console.error(e); }
}

export function getSavedPrompts(): SavedPrompt[] {
  if (!isStorageAvailable()) return [];
  try {
    const stored = localStorage.getItem(PROMPTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

export function savePrompt(prompt: SavedPrompt) {
  if (!isStorageAvailable()) return;
  try {
    const prompts = getSavedPrompts();
    prompts.unshift(prompt);
    localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
  } catch (e) { console.error(e); }
}

export function getApiKey(): string {
  if (!isStorageAvailable()) return "";
  try {
    // Check Vite env first
    const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (viteKey && viteKey !== "MY_GEMINI_API_KEY") return viteKey;

    // Check process.env (defined in vite.config.ts)
    // @ts-ignore
    const procKey = typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : undefined;
    if (procKey && procKey !== "MY_GEMINI_API_KEY") return procKey;

    return localStorage.getItem(API_KEY_KEY) || "";
  } catch {
    return "";
  }
}

export function setApiKey(key: string) {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(API_KEY_KEY, key);
  } catch (e) { console.error(e); }
}

export function getAiMode(): "kalaung" | "arindama" {
  if (!isStorageAvailable()) return "kalaung";
  try {
    return (localStorage.getItem(MODE_KEY) as "kalaung" | "arindama") || "kalaung";
  } catch {
    return "kalaung";
  }
}

export function setAiMode(mode: "kalaung" | "arindama") {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch (e) { console.error(e); }
}

export function getKnowledgeBase(): string {
  if (!isStorageAvailable()) return "";
  try {
    return localStorage.getItem(KB_KEY) || "";
  } catch {
    return "";
  }
}

export function setKnowledgeBase(kb: string) {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(KB_KEY, kb);
  } catch (e) { console.error(e); }
}

export function getEvolutionDirectives(): string {
  if (!isStorageAvailable()) return "";
  try {
    return localStorage.getItem(EVOLUTION_KEY) || "";
  } catch {
    return "";
  }
}

export function setEvolutionDirectives(directives: string) {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(EVOLUTION_KEY, directives);
  } catch (e) { console.error(e); }
}

export function getGithubToken(): string {
  if (!isStorageAvailable()) return "";
  try {
    return localStorage.getItem(GITHUB_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setGithubToken(token: string) {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
  } catch (e) { console.error(e); }
}

export function getModel(): string {
  if (!isStorageAvailable()) return "models/gemini-3-flash-preview";
  try {
    const model = localStorage.getItem(MODEL_KEY);
    if (model && !model.startsWith("models/")) return `models/${model}`;
    return model || "models/gemini-3-flash-preview";
  } catch {
    return "models/gemini-3-flash-preview";
  }
}

export function setModel(model: string) {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(MODEL_KEY, model);
  } catch (e) { console.error(e); }
}

export function getSavedRepoInfo(): { owner: string; repo: string } {
  if (!isStorageAvailable()) return { owner: "", repo: "" };
  try {
    const stored = localStorage.getItem(REPO_INFO_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return { owner: "", repo: "" };
  } catch {
    return { owner: "", repo: "" };
  }
}

export function saveRepoInfo(info: { owner: string; repo: string }) {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(REPO_INFO_KEY, JSON.stringify(info));
  } catch (e) { console.error(e); }
}
