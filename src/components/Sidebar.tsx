import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Brain,
  Folder,
  FileText,
  MoreVertical,
  Wand2,
  LogOut
} from "lucide-react";
import { type ChatSession } from "../lib/store";
import { cn } from "../lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { logout } from "../lib/firebase";

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onClearHistory: () => void;
  isOpen: boolean;
  onToggle: () => void;
  activeTab: "chats" | "files";
  onTabChange: (tab: "chats" | "files") => void;
  onOpenProfile: () => void;
  userProfile: any;
  mode: string;
}

export default function Sidebar({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onNewChat, 
  onDeleteSession,
  onClearHistory,
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  onOpenProfile,
  userProfile,
  mode
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock files for now - in a real app these would come from the store or GitHub
  const mockFiles = [
    { id: "1", name: "README.md", type: "file" },
    { id: "2", name: "src", type: "folder" },
    { id: "3", name: "package.json", type: "file" },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ 
          width: isOpen ? 280 : 0,
          x: isOpen ? 0 : -280
        }}
        className={cn(
          "fixed lg:relative z-50 h-full bg-[#0c0c0c] border-r border-white/5 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          !isOpen && "lg:w-0 border-none"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                mode === "kalaung" ? "bg-neon-violet/20" : "bg-primary/20"
              )}>
                {mode === "kalaung" ? (
                  <Sparkles className="w-3.5 h-3.5 text-neon-violet" />
                ) : (
                  <Brain className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
              <span className="text-sm font-bold text-white/90">
                {mode === "kalaung" ? "Ka-Laung" : "Arindama"}
              </span>
            </div>
          </div>

          <button 
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-medium text-white/90 hover:bg-white/10 transition-all group"
          >
            <Plus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            <span>New Chat</span>
          </button>

          {/* Tab Switcher */}
          {mode === "arindama" ? (
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
              <button 
                onClick={() => onTabChange("chats")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all",
                  activeTab === "chats" ? "bg-white/10 text-white shadow-sm" : "text-white/30 hover:text-white/50"
                )}
              >
                <MessageSquare size={14} />
                CHATS
              </button>
              <button 
                onClick={() => onTabChange("files")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all",
                  activeTab === "files" ? "bg-white/10 text-white shadow-sm" : "text-white/30 hover:text-white/50"
                )}
              >
                <Folder size={14} />
                FILES
              </button>
            </div>
          ) : (
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/20 border-b border-white/5 mb-2">
              Conversation History
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input 
              type="text" 
              placeholder={activeTab === "chats" ? "Search history..." : "Search files..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white/60 focus:outline-none focus:border-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 no-scrollbar">
          {activeTab === "chats" ? (
            <>
              <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>Recent Chats</span>
                </div>
                {sessions.length > 0 && (
                  <button 
                    onClick={onClearHistory}
                    className="hover:text-rose-500 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
              
              {filteredSessions.length === 0 ? (
                <div className="px-4 py-8 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-white/5 mx-auto" />
                  <div className="text-[11px] text-white/20">No history yet</div>
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div 
                    key={session.id}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                      currentSessionId === session.id 
                        ? "bg-primary/10 text-primary" 
                        : "text-white/40 hover:bg-white/5 hover:text-white/60"
                    )}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <MessageSquare className={cn(
                      "w-4 h-4 shrink-0",
                      currentSessionId === session.id ? "text-primary" : "text-white/20"
                    )} />
                    <span className="flex-1 text-xs font-medium truncate pr-6">
                      {session.title || "Untitled Chat"}
                    </span>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="absolute right-2 opacity-20 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-rose-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <div className="px-3 mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
                <Folder className="w-3 h-3" />
                <span>Project Files</span>
              </div>
              
              {mockFiles.map((file) => (
                <div 
                  key={file.id}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-white/40 hover:bg-white/5 hover:text-white/60 transition-all"
                >
                  {file.type === "folder" ? (
                    <Folder className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                  ) : (
                    <FileText className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                  )}
                  <span className="flex-1 text-xs font-medium truncate">{file.name}</span>
                  <MoreVertical className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
              
              <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 mx-2">
                <div className="text-[10px] text-primary/60 leading-relaxed">
                  Arindama Mode မှာ GitHub Repo တွေ ဆောက်လိုက်ရင် ဒီနေရာမှာ File တွေကို စီမံခန့်ခွဲနိုင်မှာ ဖြစ်ပါတယ်ရှင်။
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <button 
            onClick={onOpenProfile}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/60 hover:bg-white/5 transition-all"
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              mode === "kalaung" ? "bg-neon-violet/10" : "bg-primary/10"
            )}>
              {mode === "kalaung" ? (
                <Sparkles className="w-4 h-4 text-neon-violet" />
              ) : (
                <Brain className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-bold text-white/80 truncate">
                {userProfile?.displayName || (mode === "kalaung" ? "Ka-Laung Pro" : "Arindama Pro")}
              </div>
              <div className="text-[10px] text-white/20 truncate">{userProfile?.email || "User Account"}</div>
            </div>
          </button>
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/30 hover:bg-rose-500/10 hover:text-rose-500 transition-all text-xs font-medium"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Toggle Button (Floating when closed) */}
      {!isOpen && (
        <button 
          onClick={onToggle}
          className="fixed left-4 top-4 z-50 p-2.5 bg-[#161616] border border-white/10 rounded-xl text-white/40 hover:text-white transition-all shadow-xl lg:hidden"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </>
  );
}
