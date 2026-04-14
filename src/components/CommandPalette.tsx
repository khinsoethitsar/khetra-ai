import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  Plus, 
  Moon, 
  Sun, 
  Brain, 
  Trash2, 
  Settings, 
  Github,
  Command as CommandIcon,
  X
} from "lucide-react";
import { cn } from "../lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  onNewChat: () => void;
  onToggleDarkMode: () => void;
  onToggleAiMode: () => void;
  onClearHistory: () => void;
  onOpenSettings: () => void;
  onOpenGithub: () => void;
  mode: string;
}

export default function CommandPalette({
  onNewChat,
  onToggleDarkMode,
  onToggleAiMode,
  onClearHistory,
  onOpenSettings,
  onOpenGithub,
  mode
}: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: "new-chat",
      label: "New Chat",
      description: "Start a fresh conversation",
      icon: <Plus className="w-4 h-4" />,
      shortcut: "N",
      action: onNewChat
    },
    {
      id: "toggle-ai-mode",
      label: "Change AI Mode",
      description: "Switch between Ka-Laung and Arindama",
      icon: <Brain className="w-4 h-4" />,
      shortcut: "M",
      action: onToggleAiMode
    },
    {
      id: "clear-history",
      label: "Clear History",
      description: "Delete all chat sessions",
      icon: <Trash2 className="w-4 h-4" />,
      action: onClearHistory
    },
    {
      id: "settings",
      label: "Open Settings",
      description: "Configure API keys and directives",
      icon: <Settings className="w-4 h-4" />,
      shortcut: ",",
      action: onOpenSettings
    },
    ...(mode === "arindama" ? [{
      id: "github",
      label: "GitHub Integration",
      description: "Manage repository settings",
      icon: <Github className="w-4 h-4" />,
      action: onOpenGithub
    }] : [])
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleAction(filteredCommands[selectedIndex].action);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-xl bg-[#161616] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative z-10 neon-glow"
          >
            <div className="flex items-center px-6 py-4 border-b border-white/5 bg-white/5">
              <Search className="w-5 h-5 text-white/20 mr-4" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search commands..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 text-sm"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                <CommandIcon className="w-3 h-3 text-white/40" />
                <span className="text-[10px] font-bold text-white/40">K</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={cmd.id}
                    onClick={() => handleAction(cmd.action)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left group",
                      selectedIndex === idx ? "bg-primary/20 text-primary" : "text-white/60 hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      selectedIndex === idx ? "bg-primary/20 text-primary" : "bg-white/5 text-white/40"
                    )}>
                      {cmd.icon}
                    </div>
                    <div className="flex-1">
                      <div className={cn(
                        "text-sm font-bold",
                        selectedIndex === idx ? "text-primary" : "text-white/90"
                      )}>
                        {cmd.label}
                      </div>
                      <div className="text-xs text-white/30 font-light">
                        {cmd.description}
                      </div>
                    </div>
                    {cmd.shortcut && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono text-white/20">
                        <span>ALT</span>
                        <span>+</span>
                        <span>{cmd.shortcut}</span>
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-white/10" />
                  </div>
                  <div className="text-sm text-white/20">No commands found for "{search}"</div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/40">↑↓</div>
                  <span className="text-[10px] text-white/20">Navigate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/40">ENTER</div>
                  <span className="text-[10px] text-white/20">Select</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/40">ESC</div>
                <span className="text-[10px] text-white/20">Close</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
