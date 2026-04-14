// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Link2, 
  X, 
  Globe, 
  User, 
  Bot, 
  Loader2, 
  Github, 
  Sparkles,
  AlertCircle,
  Wrench,
  Search,
  Flag,
  Mic,
  Plus,
  MoreVertical,
  ChevronRight,
  Settings,
  Copy,
  Check,
  Brain,
  Volume2,
  VolumeX,
  Lightbulb,
  Video,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Folder,
  FileText,
  Code,
  FileCode,
  FileJson,
  Hash,
  Terminal,
  Wand2,
  Scissors
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  sendMessageAdvanced, 
  summarizeConversation,
  type ThinkingStep, 
  type AiMode,
  type ChatMessage
} from "../lib/gemini";
import { 
  getApiKey, 
  getAiMode, 
  setAiMode, 
  getModel,
  setModel,
  getSavedRepoInfo,
  saveRepoInfo
} from "../lib/store";
import { cn } from "../lib/utils";
import { createGist, createRepo, createFile, createProject, deleteFile, listFiles, githubFetch, GithubApiError } from "../lib/github";
import { formatDiagnosticMarkdown } from "../lib/github-diagnostics";
import { generateHealingPlan } from "../lib/self-healing";
import ThinkingProcess from "./ThinkingProcess";
import ReactMarkdown from "react-markdown";
import ActivityFeed, { ActivityLog } from "./ActivityFeed";
import SuggestedNextSteps, { NextStep } from "./SuggestedNextSteps";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onSwitchTab: (tab: "chats" | "files") => void;
  mode: AiMode;
  onModeChange: (mode: AiMode) => void;
  userProfile: any;
}

// Simple Button component since shadcn is not initialized
const Button = ({ children, onClick, disabled, variant = "primary", size = "md", className = "" }: any) => {
  const variants: any = {
    primary: "bg-cyan-600 text-white hover:bg-cyan-700",
    ghost: "bg-transparent hover:bg-muted text-muted-foreground",
    outline: "border border-border hover:bg-muted",
  };
  const sizes: any = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2",
    icon: "p-2",
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`rounded-lg transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

export default function ChatInterface({ 
  messages, 
  onMessagesChange, 
  onOpenSettings,
  onToggleSidebar,
  isSidebarOpen,
  onSwitchTab,
  mode,
  onModeChange,
  userProfile
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [contextUrl, setContextUrl] = useState("");
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(getModel());
  const [isSharing, setIsSharing] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [nextSteps, setNextSteps] = useState<NextStep[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ name: string; type: string; data: string; preview?: string; trimStart?: string; trimEnd?: string }[]>([]);
  const [showFilePreview, setShowFilePreview] = useState<number | null>(null); // Index of file to preview
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = { toast: (opts: any) => console.log(opts) }; // Mock toast for now

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stagedFiles, setStagedFiles] = useState<{ path: string; content: string; lang: string }[]>([]);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [repoInfo, setRepoInfo] = useState(getSavedRepoInfo());
  const [isCommitting, setIsCommitting] = useState(false);

  const [showCreateRepoModal, setShowCreateRepoModal] = useState(false);
  const [newRepoData, setNewRepoData] = useState({ name: "", description: "", private: true });
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summary, setSummary] = useState("");

  const handleStageFile = (content: string, lang: string) => {
    const extension = lang === 'text' ? 'txt' : lang === 'typescript' ? 'ts' : lang === 'javascript' ? 'js' : lang;
    const path = `file-${Date.now()}.${extension}`;
    setStagedFiles(prev => [...prev, { path, content, lang }]);
  };

  const handleCreateRepo = async () => {
    if (!newRepoData.name) {
      alert("Please enter a repository name.");
      return;
    }

    setIsCreatingRepo(true);
    const logId = addActivityLog(`Creating repository "${newRepoData.name}"...`, "loading");
    
    try {
      const repo = await createRepo(newRepoData.name, newRepoData.description, newRepoData.private);
      updateActivityLog(logId, "success", `Repository "${newRepoData.name}" created successfully.`);
      
      // Update repoInfo and save to store
      const newInfo = { owner: repo.owner.login, repo: repo.name };
      setRepoInfo(newInfo);
      saveRepoInfo(newInfo);
      
      setShowCreateRepoModal(false);
      setNewRepoData({ name: "", description: "", private: true });
      
      // Add a message to the chat
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "model",
        content: `✅ **Repository Created Successfully!**\n\nI've created the repository **${repo.full_name}** for you.\n\n[View on GitHub](${repo.html_url})\n\nI've also updated your session to use this repository for future commits. ✨`,
        timestamp: new Date().toLocaleTimeString()
      };
      onMessagesChange([...messages, systemMessage]);
    } catch (e: any) {
      updateActivityLog(logId, "error", `Failed to create repository: ${e.message}`);
      alert(`Error: ${e.message}`);
    } finally {
      setIsCreatingRepo(false);
    }
  };

  const handleSummarize = async () => {
    if (messages.length === 0) {
      alert("အကျဉ်းချုပ်စရာ Chat မရှိသေးပါဘူးရှင်။");
      return;
    }
    
    setIsSummarizing(true);
    const logId = addActivityLog("Generating conversation summary...", "loading");
    
    try {
      const result = await summarizeConversation(getApiKey() || "", messages);
      setSummary(result);
      setShowSummaryModal(true);
      updateActivityLog(logId, "success", "Summary generated successfully.");
    } catch (error: any) {
      updateActivityLog(logId, "error", `Summarization failed: ${error.message}`);
      alert(error.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleStageAllFiles = async () => {
    if (!repoInfo.owner || !repoInfo.repo) {
      alert("Please ensure Repository Owner and Name are set in the Commit Modal first.");
      setShowCommitModal(true);
      return;
    }

    const logId = addActivityLog(`Fetching all files from ${repoInfo.owner}/${repoInfo.repo}...`, "loading");
    try {
      const files = await listFiles(repoInfo.owner, repoInfo.repo);
      const newStagedFiles: { path: string; content: string; lang: string }[] = [];
      
      for (const file of files) {
        if (file.type === 'file') {
          // Fetch content for each file
          const res = await githubFetch(`/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${file.path}`);
          const content = decodeURIComponent(escape(atob(res.content)));
          const ext = file.name.split('.').pop() || 'text';
          newStagedFiles.push({ path: file.path, content, lang: ext });
        }
      }
      
      setStagedFiles(newStagedFiles);
      updateActivityLog(logId, "success", `Staged ${newStagedFiles.length} files from repository.`);
    } catch (error: any) {
      updateActivityLog(logId, "error", `Failed to stage files: ${error.message}`);
    }
  };

  const handleCommit = async () => {
    if (!repoInfo.owner || !repoInfo.repo || !commitMessage) {
      alert("Please fill in all fields");
      return;
    }

    setIsCommitting(true);
    const logId = addActivityLog(`Committing ${stagedFiles.length} files to ${repoInfo.owner}/${repoInfo.repo}...`, "loading");
    
    try {
      for (const file of stagedFiles) {
        await createFile(repoInfo.owner, repoInfo.repo, file.path, file.content, commitMessage);
      }
      updateActivityLog(logId, "success", `Successfully committed ${stagedFiles.length} files.`);
      setStagedFiles([]);
      setShowCommitModal(false);
      setCommitMessage("");
    } catch (error: any) {
      updateActivityLog(logId, "error", `Commit failed: ${error.message}`);
      alert(`Commit failed: ${error.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Browser က Voice Recognition ကို Support မလုပ်ပါဘူးရှင်။");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        // Small delay to ensure the last transcript is processed
        setTimeout(() => {
          if (input.trim()) handleSend();
        }, 300);
      }
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'my-MM';
      recognition.continuous = false;
      recognition.interimResults = true; // Enable interim results for better UX

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert("Microphone သုံးခွင့်ကို ပိတ်ထားပါတယ်ရှင်။ Browser settings မှာ ခွင့်ပြုပေးပါဦး။");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          const lowerTranscript = finalTranscript.toLowerCase().trim();
          
          // Voice Commands
          if (lowerTranscript === "ပို့ပါ" || lowerTranscript === "send" || lowerTranscript === "message ပို့ပါ") {
            if (input.trim()) {
              handleSend();
              return;
            }
          }
          
          if (lowerTranscript === "mode ပြောင်းပါ" || lowerTranscript === "change mode" || lowerTranscript === "မုဒ်ပြောင်းပါ") {
            toggleMode();
            return;
          }

          if (lowerTranscript === "settings ဖွင့်ပါ" || lowerTranscript === "open settings" || lowerTranscript === "စက်တင်ဖွင့်ပါ") {
            onOpenSettings();
            return;
          }

          const newText = (input.trim() + " " + finalTranscript).trim();
          setInput(newText);
        }
      };

      recognition.start();
    } catch (error) {
      console.error('Speech recognition start failed:', error);
      setIsListening(false);
      alert("Voice Recognition စတင်ရာမှာ အခက်အခဲရှိနေပါတယ်ရှင်။");
    }
  };

  const speakText = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const getFileIcon = (fileName: string, type?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) {
      return <ImageIcon className="w-5 h-5" />;
    }

    if (type?.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov'].includes(ext || '')) {
      return <Video className="w-5 h-5 text-primary" />;
    }
    
    if (['json'].includes(ext || '')) {
      return <FileJson className="w-5 h-5 text-yellow-500" />;
    }
    
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext || '')) {
      return <FileCode className="w-5 h-5 text-blue-400" />;
    }
    
    if (['py', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php'].includes(ext || '')) {
      return <Code className="w-5 h-5 text-emerald-400" />;
    }

    if (['css', 'scss', 'less'].includes(ext || '')) {
      return <Hash className="w-5 h-5 text-pink-400" />;
    }

    if (['html'].includes(ext || '')) {
      return <Globe className="w-5 h-5 text-orange-400" />;
    }

    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) {
      return <Video className="w-5 h-5 text-purple-400" />;
    }
    
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) {
      return <Volume2 className="w-5 h-5 text-emerald-400" />;
    }

    if (['sh', 'bash', 'zsh', 'bat'].includes(ext || '')) {
      return <Terminal className="w-5 h-5 text-gray-400" />;
    }
    
    if (['md', 'txt', 'pdf', 'doc', 'docx'].includes(ext || '')) {
      return <FileText className="w-5 h-5 text-white/60" />;
    }
    
    return <FileText className="w-5 h-5 text-white/40" />;
  };

  const isVideo = (file: { name: string, type: string }) => {
    if (file.type.startsWith('video/')) return true;
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['mp4', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp', 'ts', 'm3u8'].includes(ext || '');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const unsupportedFiles: string[] = [];
      Array.from(files).forEach(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['zip', 'rar', '7z', 'exe', 'dll'].includes(ext || '')) {
          unsupportedFiles.push(file.name);
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
            const textReader = new FileReader();
            textReader.onload = () => {
              setSelectedFiles(prev => [...prev, {
                name: file.name,
                type: file.type,
                data: reader.result as string,
                preview: textReader.result as string
              }]);
            };
            textReader.readAsText(file);
          } else if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/') || file.type === 'application/pdf') {
            setSelectedFiles(prev => [...prev, {
              name: file.name,
              type: file.type,
              data: reader.result as string,
              preview: reader.result as string
            }]);
          } else {
            setSelectedFiles(prev => [...prev, {
              name: file.name,
              type: file.type,
              data: reader.result as string,
              preview: null
            }]);
          }
        };
        reader.readAsDataURL(file);
      });

      if (unsupportedFiles.length > 0) {
        alert(`အောက်ပါ ဖိုင်အမျိုးအစားများကို Gemini က လက်မခံပါဘူးရှင်- \n${unsupportedFiles.join(', ')}`);
      }
    }
  };

  const handleExplainCode = (code: string, lang: string) => {
    const prompt = `ဒီ code block လေးကို မြန်မာလို အသေးစိတ် ရှင်းပြပေးပါဦးရှင်။ ✨\n\n\`\`\`${lang}\n${code}\n\`\`\``;
    handleSend(prompt);
  };

  const MarkdownComponents = {
    p({ children }: any) {
      return <div className="mb-4 last:mb-0">{children}</div>;
    },
    strong({ children }: any) {
      return <span className="font-bold text-white">{children}</span>;
    },
    a({ href, children }: any) {
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-primary hover:underline underline-offset-4"
        >
          {children}
        </a>
      );
    },
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match ? match[1] : 'text';
      const codeContent = String(children).replace(/\n$/, '');
      const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

      if (!inline) {
        return (
          <div className="my-6 rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] group">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                {lang === 'text' ? 'Plaintext' : lang}
              </span>
              {mode === "arindama" && (
                <button
                  onClick={() => handleStageFile(codeContent, lang)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all flex items-center gap-2"
                  title="Stage File"
                >
                  <Plus size={14} />
                  <span className="text-[10px] font-bold uppercase">Stage</span>
                </button>
              )}
              <button
                onClick={() => handleExplainCode(codeContent, lang)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all flex items-center gap-2"
                title="Explain Code"
              >
                <Brain size={14} />
                <span className="text-[10px] font-bold uppercase">Explain</span>
              </button>
              <button
                onClick={() => handleCopy(codeContent, codeId)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all flex items-center gap-2"
                title="Copy Code"
              >
                {copiedId === codeId ? (
                  <>
                    <Check size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-500">COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span className="text-[10px] font-bold">COPY</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative group/code">
              <pre className={cn("overflow-x-auto p-5 font-mono text-sm leading-relaxed", className)} {...props}>
                <code>{children}</code>
              </pre>
              <button
                onClick={() => handleCopy(codeContent, codeId)}
                className="absolute top-3 right-3 p-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-white/40 hover:text-white opacity-0 group-hover/code:opacity-100 transition-all duration-200 flex items-center gap-2 shadow-xl"
                title="Copy Code"
              >
                {copiedId === codeId ? (
                  <>
                    <Check size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-500">COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span className="text-[10px] font-bold">COPY</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );
      }
      return (
        <code className={cn("bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-[0.9em]", className)} {...props}>
          {children}
        </code>
      );
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Shift + M to toggle mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMode();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [mode]);

  useEffect(() => {
    if (showCommitModal && (!repoInfo.owner || !repoInfo.repo)) {
      // Try to auto-detect from message history (newest first)
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        
        // 1. Check for github-action blocks
        const match = msg.content.match(/```(?:github-action|json)\n([\s\S]*?)\n```/);
        if (match) {
          try {
            const data = JSON.parse(match[1]);
            if (data.owner && data.repo) {
              const newInfo = { owner: data.owner, repo: data.repo };
              setRepoInfo(newInfo);
              saveRepoInfo(newInfo);
              break;
            }
          } catch (e) {}
        }

        // 2. Check for mentions like "owner/repo" in text
        const repoMentionMatch = msg.content.match(/([a-zA-Z0-9-._]+)\/([a-zA-Z0-9-._]+)/);
        if (repoMentionMatch && !msg.content.includes("http")) {
          const newInfo = { owner: repoMentionMatch[1], repo: repoMentionMatch[2] };
          setRepoInfo(newInfo);
          saveRepoInfo(newInfo);
          break;
        }
      }
    }
  }, [showCommitModal, messages]);

  const handleRepoInfoChange = (field: 'owner' | 'repo', value: string) => {
    const newInfo = { ...repoInfo, [field]: value };
    setRepoInfo(newInfo);
    saveRepoInfo(newInfo);
  };

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Check if user was near bottom before the update
      // We use a threshold of 200px to be safe
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + 200;
      
      const lastMessage = messages[messages.length - 1];
      const isUserMessage = lastMessage?.role === 'user';

      // Always scroll if user just sent a message
      // Otherwise only scroll if they were already near the bottom
      if (isUserMessage || isNearBottom) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages, thinkingSteps, activityLogs, nextSteps]);

  const addActivityLog = (message: string, status: "loading" | "success" | "error" = "loading") => {
    const id = Math.random().toString(36).substring(7);
    setActivityLogs(prev => [...prev, { id, message, status, timestamp: new Date().toISOString() }]);
    return id;
  };

  const updateActivityLog = (id: string, status: "success" | "error", message?: string) => {
    setActivityLogs(prev => prev.map(log => 
      log.id === id ? { ...log, status, message: message || log.message } : log
    ));
  };

  const generateNextSteps = (action: string, data: any): NextStep[] => {
    switch (action) {
      case "create_file":
        return [
          { 
            label: "Add Unit Tests", 
            description: "ဖိုင်အတွက် Unit Tests တွေကို အလိုအလျောက် ရေးသားပေးပါမယ်။",
            prompt: `Generate unit tests for ${data.path}.` 
          },
          { 
            label: "Refactor Code", 
            description: "Code ရဲ့ အရည်အသွေး ပိုကောင်းလာအောင် ပြန်လည် ပြင်ဆင်ပေးပါမယ်။",
            prompt: `Suggest some refactoring improvements for ${data.path}.` 
          }
        ];
      case "create_repo":
      case "create_project":
        return [
          { 
            label: "Add README", 
            description: "Project အကြောင်း ရှင်းပြထားတဲ့ README.md ဖိုင်ကို ဖန်တီးပေးပါမယ်။",
            prompt: "Generate a professional README.md for this project." 
          },
          { 
            label: "Setup CI/CD", 
            description: "GitHub Actions သုံးပြီး Automated Testing တွေ ထည့်သွင်းပေးပါမယ်။",
            prompt: "Create a GitHub Actions workflow for automated testing." 
          }
        ];
      default:
        return [];
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      alert("Settings ထဲမှာ Gemini API Key အရင်ထည့်ပေးပါရှင်။");
      return;
    }

    const userMessage = overrideInput || input.trim();
    if (!userMessage) return;

    const start = Date.now();
    setStartTime(start);
    setExecutionTime(0);

    const timer = setInterval(() => {
      setExecutionTime(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    const newMessages: ChatMessage[] = [
      ...messages,
      { 
        role: "user", 
        content: userMessage, 
        timestamp: new Date().toISOString(),
        files: selectedFiles.length > 0 ? selectedFiles.map(f => ({
          name: f.name,
          type: f.type,
          data: f.data,
          trimStart: f.trimStart,
          trimEnd: f.trimEnd
        })) : undefined
      }
    ];
    
    // Add a placeholder for the AI response to enable streaming
    const assistantMessage: ChatMessage = { role: "model", content: "", timestamp: new Date().toISOString() };
    onMessagesChange([...newMessages, assistantMessage]);
    
    setInput("");
    setSelectedFiles([]);
    setIsLoading(true);
    setThinkingSteps([]);
    setActivityLogs([]);
    setNextSteps([]);

    try {
      addActivityLog("Analyzing request and generating response...", "loading");
      
      let fullResponse = "";
      let displayedResponse = "";
      let streamFinished = false;
      
      const responsePromise = sendMessageAdvanced({
        apiKey,
        history: messages,
        message: userMessage,
        contextUrl: contextUrl || undefined,
        files: selectedFiles.map(f => ({
          name: f.name,
          type: f.type,
          data: f.data,
          trimStart: f.trimStart,
          trimEnd: f.trimEnd
        })),
        mode,
        model: selectedModel,
        onThinkingUpdate: (steps) => setThinkingSteps([...steps]),
        onStream: (text) => {
          fullResponse = text;
          onMessagesChange([...newMessages, { ...assistantMessage, content: text }]);
        }
      });

      const finalResponse = await responsePromise;
      await finalizeResponse(finalResponse);

      async function finalizeResponse(finalText: string) {
        setSelectedFiles([]);
        clearInterval(timer);
        setExecutionTime(Math.floor((Date.now() - start) / 1000));

        const githubActionMatch = finalText.match(/```(?:github-action|json)\n([\s\S]*?)\n```/);
        let actionResult = "";
        
        if (githubActionMatch && mode === "arindama") {
          let currentLogId = "";
          try {
            const actionData = JSON.parse(githubActionMatch[1]);
            if (actionData.action) {
              setNextSteps(generateNextSteps(actionData.action, actionData));
              
              if (actionData.action === "create_file") {
                currentLogId = addActivityLog(`Creating file: ${actionData.path}...`, "loading");
                await createFile(actionData.owner, actionData.repo, actionData.path, actionData.content, actionData.message);
                updateActivityLog(currentLogId, "success", `File "${actionData.path}" created successfully.`);
                actionResult = `\n\n✅ **GitHub Action Success**\nFile "${actionData.path}" has been created/updated.`;
              } else if (actionData.action === "create_repo") {
                currentLogId = addActivityLog(`Creating repository: ${actionData.name}...`, "loading");
                const repo = await createRepo(actionData.name, actionData.description, actionData.private);
                updateActivityLog(currentLogId, "success", `Repository "${actionData.name}" created.`);
                actionResult = `\n\n✅ **GitHub Action Success**\nRepository "${actionData.name}" created. [View Repo](${repo.html_url})`;
              } else if (actionData.action === "create_project") {
                currentLogId = addActivityLog(`Scaffolding project: ${actionData.name}...`, "loading");
                const result = await createProject(
                  actionData.name,
                  actionData.description || "",
                  actionData.template || "generic",
                  actionData.private !== false,
                  (step) => {
                    addActivityLog(step.detail, step.status === "error" ? "error" : step.status === "done" ? "success" : "loading");
                  }
                );
                updateActivityLog(currentLogId, "success", `Project setup complete.`);
                actionResult = `\n\n✅ **Project Setup Complete**\nProject "${actionData.name}" created!\n[View Repository](${result.repoUrl})`;
              } else if (actionData.action === "delete_file") {
                currentLogId = addActivityLog(`Deleting file: ${actionData.path}...`, "loading");
                await deleteFile(actionData.owner, actionData.repo, actionData.path, actionData.message);
                updateActivityLog(currentLogId, "success", `File "${actionData.path}" deleted.`);
                actionResult = `\n\n✅ **GitHub Action Success**\nFile "${actionData.path}" has been deleted.`;
              } else if (actionData.action === "list_files") {
                currentLogId = addActivityLog(`Listing files in: ${actionData.path || "root"}...`, "loading");
                const files = await listFiles(actionData.owner, actionData.repo, actionData.path);
                updateActivityLog(currentLogId, "success", `Found ${files.length} items.`);
                const fileList = files.map((f: any) => `- ${f.type === 'dir' ? '📁' : '📄'} ${f.name}`).join('\n');
                actionResult = `\n\n📂 **Repository Contents (${actionData.path || "root"}):**\n${fileList}`;
              }
            }
          } catch (e: any) {
            if (currentLogId) updateActivityLog(currentLogId, "error", `Failed: ${e.message}`);
            
            if (e instanceof GithubApiError) {
              const plan = generateHealingPlan(e.diagnostic, e.data);
              actionResult = `\n\n❌ **GitHub Action Failed**\n\n${formatDiagnosticMarkdown(e.diagnostic, false)}`;
              
              const healingSteps = e.diagnostic.suggestions.map(s => ({
                label: s,
                description: "ဒီအကြံပြုချက်အတိုင်း လုပ်ဆောင်ကြည့်ပါရှင်။",
                prompt: `I want to follow this suggestion to fix the GitHub error: ${s}. Please help me implement it.`,
                icon: <Lightbulb className="w-5 h-5 text-yellow-400" />
              }));

              setNextSteps([
                { 
                  label: "Auto-Fix Error (အလိုအလျောက်ပြင်မယ်)", 
                  description: "AI က အမှားကို အလိုအလျောက် စစ်ဆေးပြီး ပြင်ဆင်ပေးပါလိမ့်မယ်။",
                  prompt: plan.suggestedPrompt,
                  icon: <Wrench className="w-5 h-5 text-cyan-400" /> 
                },
                ...healingSteps,
                { 
                  label: "Explain Root Cause", 
                  description: "ဒီအမှား ဘာကြောင့်ဖြစ်ရသလဲဆိုတာကို အသေးစိတ် ရှင်းပြပေးပါမယ်။",
                  prompt: `Explain this error in detail: ${e.message}`,
                  icon: <AlertCircle className="w-5 h-5 text-amber-400" />
                }
              ]);
            } else {
              actionResult = `\n\n❌ Error: ${e.message}`;
            }
          }
        }

        const finalMessages: ChatMessage[] = [
          ...newMessages,
          { role: "model", content: finalText + actionResult, timestamp: new Date().toISOString() }
        ];
        onMessagesChange(finalMessages);
      }
    } catch (error: any) {
      const errorMessage = error.message || "Something went wrong";
      onMessagesChange([
        ...newMessages,
        { 
          role: "model", 
          content: `❌ **Error:** ${errorMessage}\n\nSettings ထဲမှာ API Key မှန်ကန်စွာ ထည့်ထားခြင်း ရှိမရှိ စစ်ဆေးပေးပါရှင်။`, 
          timestamp: new Date().toISOString() 
        }
      ]);
    } finally {
      setIsLoading(false);
      setThinkingSteps([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMode = () => {
    let newMode: AiMode;
    if (mode === "kalaung") newMode = "arindama";
    else newMode = "kalaung";
    
    onModeChange(newMode);
    setAiMode(newMode);
  };

  const handleShareToGist = async (content: string) => {
    setIsSharing(true);
    const logId = addActivityLog("Sharing output to GitHub Gist...", "loading");
    try {
      const fileName = mode === "kalaung" ? `kalaung_output_${Date.now()}.md` : `arindama_output_${Date.now()}.md`;
      const description = mode === "kalaung" ? "Shared from Ka-Laung AI" : "Shared from Arindama AI";
      await createGist({ [fileName]: { content } }, description, false);
      updateActivityLog(logId, "success", "Shared to Gist successfully.");
    } catch (error: any) {
      updateActivityLog(logId, "error", `Sharing failed: ${error.message}`);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-midnight relative overflow-hidden">
      {/* Background Aura Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-violet/10 rounded-full aura-effect z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-electric-cyan/5 rounded-full aura-effect z-0" style={{ animationDelay: '-2s' }} />

      {/* Minimal Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 glass-panel sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleSidebar}
            className="p-2 hover:bg-white/5 rounded-lg text-white/40 transition-colors"
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform", isSidebarOpen && "rotate-180")} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              setModel(e.target.value);
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/60 focus:outline-none focus:border-primary/30 transition-all cursor-pointer hover:bg-white/10"
          >
            <option value="models/gemini-3-flash-preview">Gemini 3 Flash (Preview)</option>
            <option value="models/gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="models/gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="models/gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="models/gemini-2.0-flash-lite-preview-02-05">Gemini 2.0 Flash Lite</option>
            <option value="models/gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro (Exp)</option>
          </select>
          <button 
            onClick={handleSummarize}
            disabled={isSummarizing || messages.length === 0}
            className="p-2 hover:bg-white/5 rounded-lg text-white/40 transition-colors disabled:opacity-30"
            title="Summarize Chat"
          >
            {isSummarizing ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
          </button>
          <button 
            onClick={() => {
              onSwitchTab("files");
              if (!isSidebarOpen) onToggleSidebar();
            }}
            className="p-2 hover:bg-white/5 rounded-lg text-white/40 transition-colors"
            title="Files & Folders"
          >
            <Folder className="w-4 h-4" />
          </button>
          {stagedFiles.length > 0 && (
            <button 
              onClick={() => setShowCommitModal(true)}
              className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-all flex items-center gap-2"
              title="Commit Staged Changes"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Commit ({stagedFiles.length})</span>
            </button>
          )}
          <button 
            onClick={onOpenSettings}
            className="p-2 hover:bg-white/5 rounded-lg text-white/40 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          
          <div className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-white/40 hidden sm:inline">
              {userProfile?.displayName || "User"}
            </span>
            <div className="w-6 h-6 rounded-lg bg-primary/20 border border-white/10 overflow-hidden flex items-center justify-center">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={12} className="text-primary" />
              )}
            </div>
          </div>
          
          <button className="p-2 hover:bg-white/5 rounded-lg text-white/40 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-10 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-lg mx-auto relative z-10">
            <div className="relative">
              <div className={cn(
                "absolute inset-0 blur-[40px] aura-effect",
                mode === "kalaung" ? "bg-neon-violet/20" : "bg-primary/20"
              )} />
              <div className={cn(
                "w-24 h-24 rounded-[32px] glass-panel flex items-center justify-center relative z-10 border-white/10",
                mode === "kalaung" ? "neon-glow" : mode === "amara" ? "neon-glow-purple" : "neon-glow-cyan"
              )}>
                {mode === "kalaung" ? (
                  <Sparkles className="w-10 h-10 text-neon-violet" />
                ) : mode === "amara" ? (
                  <Wand2 className="w-10 h-10 text-purple-500" />
                ) : (
                  <Brain className="w-10 h-10 text-primary" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-white/90">
                {mode === "kalaung" ? "Ka-Laung" : mode === "amara" ? "Amara" : "Arindama"}
              </h3>
              <div className="text-sm text-white/30 leading-relaxed font-light">
                {mode === "kalaung" 
                  ? "Creative & Knowledge Mode"
                  : mode === "amara"
                  ? "Creative Editing Engine"
                  : "Autonomous Execution Mode"}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={`${msg.timestamp}-${idx}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} relative z-10`}>
            <div className={`flex gap-6 w-full max-w-4xl ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-1 glass-panel border-white/10 overflow-hidden",
                msg.role === "user" ? "text-neon-violet neon-glow" : "text-electric-cyan neon-glow-cyan"
              )}>
                {msg.role === "user" ? (
                  userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={18} />
                  )
                ) : (
                  <Sparkles size={20} />
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-col gap-2">
                  <div className={cn(
                    "prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed text-[15px] glass-panel px-6 py-4 rounded-[24px] border-white/5",
                    msg.role === "user" ? "text-white/90 float-right" : "text-white/80"
                  )}>
                    <ReactMarkdown components={MarkdownComponents}>{msg.content}</ReactMarkdown>
                    
                    {msg.files && msg.files.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {msg.files.map((file, fIdx) => (
                          <div key={fIdx} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                            {file.type.startsWith('image/') && file.data ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                                <img src={file.data || null} alt={file.name} className="w-full h-full object-cover" />
                              </div>
                            ) : file.type.startsWith('image/') ? (
                              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white/40">
                                <ImageIcon size={20} />
                              </div>
                            ) : file.type.startsWith('video/') ? (
                              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <Video size={20} />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white/40">
                                {getFileIcon(file.name, file.type)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-white truncate">{file.name}</div>
                              <div className="text-[10px] text-white/40 uppercase tracking-widest">{file.type.split('/')[1] || 'FILE'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex justify-end pr-2">
                      <button 
                        onClick={() => handleCopy(msg.content, `msg-${idx}`)}
                        className="text-[10px] text-white/20 hover:text-white/40 transition-colors flex items-center gap-1.5 group"
                      >
                        {copiedId === `msg-${idx}` ? (
                          <Check size={10} className="text-emerald-500" />
                        ) : (
                          <Copy size={10} className="group-hover:scale-110 transition-transform" />
                        )}
                        <span>COPY PROMPT</span>
                      </button>
                      <button 
                        onClick={() => {
                          const updatedMessages = messages.filter((_, i) => i !== idx);
                          onMessagesChange(updatedMessages);
                        }}
                        className="text-[10px] text-white/20 hover:text-rose-500 transition-colors flex items-center gap-1.5 group"
                        title="Delete Message"
                      >
                        <Trash2 size={12} />
                        <span>DELETE</span>
                      </button>
                    </div>
                  )}
                </div>
                
                {msg.role === "model" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 text-[11px] text-white/30 font-medium">
                      <button className="flex items-center gap-1.5 hover:text-white/60 transition-colors">
                        <Flag className="w-3 h-3" />
                        <span>Checkpoint</span>
                      </button>
                      <button 
                        onClick={() => {
                          const updatedMessages = messages.filter((_, i) => i !== idx);
                          onMessagesChange(updatedMessages);
                        }}
                        className="flex items-center gap-1.5 hover:text-rose-500 transition-colors"
                        title="Delete Message"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                      <button 
                        className="hover:text-white/60 transition-colors flex items-center gap-1" 
                        onClick={() => handleCopy(msg.content, `msg-${idx}`)}
                      >
                        {copiedId === `msg-${idx}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{msg.content.includes('```') ? 'COPY ALL' : 'COPY PROMPT'}</span>
                      </button>
                      <button 
                        className={cn("hover:text-white/60 transition-colors flex items-center gap-1", isSpeaking && "text-primary")} 
                        onClick={() => speakText(msg.content)}
                      >
                        {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        <span>SPEAK</span>
                      </button>
                      {mode === "arindama" && (
                        <button className="hover:text-white/60 transition-colors" onClick={() => handleShareToGist(msg.content)}>
                          SHARE TO GIST
                        </button>
                      )}
                    </div>

                    {idx === messages.length - 1 && (
                      <>
                        <ActivityFeed logs={activityLogs} />
                        <SuggestedNextSteps steps={nextSteps} onStepClick={(prompt) => handleSend(prompt)} />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && thinkingSteps.length > 0 && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-lg bg-muted border flex items-center justify-center shrink-0"><Loader2 size={16} className="animate-spin text-cyan-500" /></div>
              <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 w-full space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/20 border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="w-3 h-3" />
                    <span>Processing with {selectedModel}</span>
                  </div>
                  <span>{executionTime}s</span>
                </div>
                <ThinkingProcess steps={thinkingSteps} isActive={isLoading} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 bg-transparent relative z-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence>
            {mode === "arindama" && stagedFiles.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-6 py-4 backdrop-blur-md shadow-lg shadow-emerald-500/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Github className="text-emerald-500 w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Staged Changes</div>
                    <div className="text-[11px] text-emerald-500/60 font-medium uppercase tracking-wider">{stagedFiles.length} file(s) ready to commit</div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCommitModal(true)}
                  className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <Plus size={14} />
                  <span>Commit Changes</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {mode === "arindama" && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowCreateRepoModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-[24px] bg-white/5 border border-white/10 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all group"
              >
                <Plus className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                <span>Create New Repo</span>
              </button>
              <button 
                onClick={handleStageAllFiles}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-[24px] bg-white/5 border border-white/10 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all group"
              >
                <Folder className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                <span>Stage All Files</span>
              </button>
              <button 
                onClick={() => {
                  if (stagedFiles.length > 0) setShowCommitModal(true);
                  else alert("Please stage some files first!");
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-[24px] bg-emerald-500/10 border border-emerald-500/20 text-sm font-bold text-emerald-500 hover:bg-emerald-500/20 transition-all group"
              >
                <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Commit All Staged</span>
              </button>
            </div>
          )}

          <div className="relative flex items-center gap-2 glass-panel rounded-[32px] p-2 border-white/10 focus-within:border-neon-violet/50 transition-all shadow-2xl neon-glow">
            <button 
              onClick={toggleMode}
              className={cn(
                "p-3 rounded-2xl transition-all border shrink-0",
                mode === "arindama" 
                  ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]" 
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
              )}
              title={mode === "kalaung" ? "Switch to Arindama Mode (Ctrl+Shift+M)" : "Switch to Ka-Laung Mode (Ctrl+Shift+M)"}
            >
              <Brain className={cn("w-5 h-5", mode === "arindama" ? "animate-pulse" : "")} />
            </button>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.json,.js,.ts,.tsx" 
              className="hidden" 
              multiple
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className={cn("p-3 rounded-2xl transition-all shrink-0", selectedFiles.length > 0 ? "text-neon-violet bg-neon-violet/10" : "text-white/40 hover:bg-white/5 hover:text-white")}
              title="Attach Files"
            >
              <Paperclip size={22} />
            </button>
            
            <div className="flex-1 flex flex-col gap-2 min-w-0 justify-center">
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-2 mb-1">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative flex flex-col gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 group min-w-[150px] max-w-[200px]">
                      <div className="flex items-center gap-2">
                        {file.type.startsWith('image/') ? (
                          <button 
                            onClick={() => setShowFilePreview(idx)}
                            className="w-6 h-6 rounded-md overflow-hidden shrink-0 hover:ring-2 ring-primary/50 transition-all"
                          >
                            <img src={file.data || null} alt="Selected" className="w-full h-full object-cover" />
                          </button>
                        ) : isVideo(file) ? (
                          <button 
                            onClick={() => setShowFilePreview(idx)}
                            className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center shrink-0 hover:bg-primary/30 transition-all"
                          >
                            <Video size={12} className="text-primary" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => setShowFilePreview(idx)}
                            className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/20 transition-all"
                          >
                            <FileText className="w-3 h-3 text-primary" />
                          </button>
                        )}
                        <span className="text-[10px] text-white/60 truncate flex-1">{file.name}</span>
                        <button 
                          onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="p-0.5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      
                      {isVideo(file) && (
                        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                          <Scissors size={10} className="text-white/30" />
                          <div className="flex items-center gap-1 flex-1">
                            <input 
                              type="text" 
                              placeholder="00:00"
                              value={file.trimStart || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedFiles(prev => prev.map((f, i) => i === idx ? { ...f, trimStart: val } : f));
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white/80 placeholder:text-white/20 outline-none focus:border-primary/50"
                            />
                            <span className="text-[9px] text-white/20">-</span>
                            <input 
                              type="text" 
                              placeholder="End"
                              value={file.trimEnd || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedFiles(prev => prev.map((f, i) => i === idx ? { ...f, trimEnd: val } : f));
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white/80 placeholder:text-white/20 outline-none focus:border-primary/50"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={handleKeyDown} 
                placeholder={isListening ? "Listening..." : "Ask anything..."} 
                className="bg-transparent border-none outline-none resize-none text-[15px] text-white/90 placeholder:text-white/20 py-2 px-2 w-full" 
                rows={1} 
              />
            </div>

            <div className="flex items-center gap-1 pr-1 shrink-0">
              <button 
                onClick={startListening}
                className={cn(
                  "p-3 rounded-2xl transition-all", 
                  isListening 
                    ? "text-neon-violet bg-neon-violet/10 animate-pulse" 
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
                title="Voice Input"
              >
                <Mic size={22} />
              </button>
              <button 
                onClick={() => handleSend()} 
                disabled={isLoading || !input.trim()} 
                className={cn(
                  "p-3 rounded-2xl transition-all",
                  isLoading || !input.trim() ? "text-white/10" : "text-white bg-primary/20 hover:bg-primary/30 text-primary"
                )}
              >
                <Send size={22} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      <AnimatePresence>
        {showFilePreview !== null && selectedFiles[showFilePreview] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl max-h-[80vh] bg-[#161616] border border-white/10 rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    {getFileIcon(selectedFiles[showFilePreview].name, selectedFiles[showFilePreview].type)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedFiles[showFilePreview].name}</h2>
                    <div className="text-xs text-white/40 uppercase tracking-widest">{selectedFiles[showFilePreview].type || 'Unknown Type'}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFilePreview(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-8 bg-black/20">
                {selectedFiles[showFilePreview].type.startsWith('image/') ? (
                  <div className="flex items-center justify-center h-full">
                    <img src={selectedFiles[showFilePreview].data || null} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                  </div>
                ) : selectedFiles[showFilePreview].type.startsWith('video/') ? (
                  <div className="flex items-center justify-center h-full">
                    <video src={selectedFiles[showFilePreview].data || null} controls className="max-w-full max-h-full rounded-xl shadow-2xl" />
                  </div>
                ) : (
                  <pre className="font-mono text-sm text-white/70 leading-relaxed whitespace-pre-wrap bg-white/5 p-6 rounded-2xl border border-white/5">
                    {selectedFiles[showFilePreview].preview || "No preview available for this file type."}
                  </pre>
                )}
              </div>

              <div className="px-8 py-6 border-t border-white/5 bg-white/5 flex justify-end">
                <button 
                  onClick={() => setShowFilePreview(null)}
                  className="px-8 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commit Modal */}
      <AnimatePresence>
        {showCommitModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#161616] border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <Github className="text-emerald-500 w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Commit Changes</h2>
                </div>
                <button 
                  onClick={() => setShowCommitModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 flex items-center gap-1">
                    Repository Owner
                    <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    value={repoInfo.owner}
                    onChange={(e) => handleRepoInfoChange('owner', e.target.value)}
                    placeholder="e.g. octocat"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 flex items-center gap-1">
                    Repository Name
                    <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    value={repoInfo.repo}
                    onChange={(e) => handleRepoInfoChange('repo', e.target.value)}
                    placeholder="e.g. my-awesome-project"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 flex items-center gap-1">
                    Commit Message
                    <span className="text-rose-500">*</span>
                  </label>
                  <textarea 
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="What did you change?"
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
                  />
                </div>

                <div className="pt-6 space-y-4">
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Ready to Commit</span>
                    </div>
                    <div className="text-[13px] text-white/50 leading-relaxed">
                      You have <span className="text-white font-bold">{stagedFiles.length} file(s)</span> staged and ready to be pushed to your repository.
                    </div>
                  </div>

                  {stagedFiles.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {stagedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-primary transition-colors">
                            {getFileIcon(file.path)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-white/80 truncate">{file.path}</div>
                            <div className="text-[9px] text-white/20 uppercase tracking-widest">{file.lang}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between px-1">
                    <button 
                      onClick={() => {
                        setStagedFiles([]);
                        setShowCommitModal(false);
                      }}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                    >
                      <X size={12} />
                      Clear All
                    </button>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setShowCommitModal(false)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl py-4 font-bold text-sm transition-all border border-white/5"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleCommit}
                      disabled={isCommitting || !repoInfo.owner || !repoInfo.repo || !commitMessage}
                      className="flex-[2] bg-emerald-500 text-white rounded-2xl py-4 font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isCommitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Committing...</span>
                        </>
                      ) : (
                        <>
                          <Github className="w-4 h-4" />
                          <span>Push to GitHub</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateRepoModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-[#0A0A0B] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Plus className="text-primary w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Create New Repository</h2>
                </div>
                <button 
                  onClick={() => setShowCreateRepoModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 flex items-center gap-1">
                    Repository Name
                    <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    value={newRepoData.name}
                    onChange={(e) => setNewRepoData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. my-awesome-project"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                    Description
                  </label>
                  <textarea 
                    value={newRepoData.description}
                    onChange={(e) => setNewRepoData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What is this project about?"
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-white/40" />
                    <div>
                      <div className="text-sm font-bold text-white">Private Repository</div>
                      <div className="text-[11px] text-white/30">Only you can see this repository</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setNewRepoData(prev => ({ ...prev, private: !prev.private }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      newRepoData.private ? "bg-primary" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      newRepoData.private ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowCreateRepoModal(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl py-4 font-bold text-sm transition-all border border-white/5"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateRepo}
                    disabled={isCreatingRepo || !newRepoData.name}
                    className="flex-[2] bg-primary text-white rounded-2xl py-4 font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreatingRepo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Create Repository</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSummaryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-[#161616] border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-neon-violet" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Brain className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Conversation Summary</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">AI Generated Overview</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSummaryModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-2xl p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button 
                  onClick={() => {
                    handleCopy(summary, "summary");
                  }}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/60 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  {copiedId === "summary" ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowSummaryModal(false)}
                  className="flex-1 px-6 py-4 rounded-2xl bg-primary text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  Got it, thanks!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
