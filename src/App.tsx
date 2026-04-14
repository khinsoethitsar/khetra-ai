import { useState, useEffect } from "react";
import ChatInterface from "./components/ChatInterface";
import Sidebar from "./components/Sidebar";
import SplashScreen from "./components/SplashScreen";
import ProfilePage from "./components/ProfilePage";
import { ChatMessage, type AiMode } from "./lib/gemini";
import { Settings, Github, Key, X, Brain, Sparkles, Database, Zap, Trash2, LogOut, Loader2, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  getApiKey, 
  setApiKey, 
  getGithubToken, 
  setGithubToken, 
  getChatHistory, 
  saveChatSession, 
  deleteChatSession,
  getKnowledgeBase,
  setKnowledgeBase,
  getEvolutionDirectives,
  setEvolutionDirectives,
  getAiMode,
  ChatSession 
} from "./lib/store";
import { v4 as uuidv4 } from "uuid";
import CommandPalette from "./components/CommandPalette";
import { auth, signInWithGoogle, logout, onAuthStateChanged, User, db, collection, doc, setDoc, query, where, orderBy, onSnapshot, deleteDoc } from "./lib/firebase";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeFirestoreData(data: any): any {
  // Deep clone and remove undefined values
  return JSON.parse(JSON.stringify(data));
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [geminiKey, setGeminiKey] = useState(getApiKey());
  const [githubToken, setGithubTokenState] = useState(getGithubToken());
  const [knowledgeBase, setKnowledgeBaseState] = useState(getKnowledgeBase());
  const [evolutionDirectives, setEvolutionDirectivesState] = useState(getEvolutionDirectives());
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"chats" | "files">("chats");
  const [mode, setMode] = useState<AiMode>(getAiMode());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showKeySetup, setShowKeySetup] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      // If user is logged in but hasn't set keys, show key setup
      if (currentUser && !getApiKey()) {
        setShowKeySetup(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync User Profile
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      } else {
        // Fallback to auth user info
        setUserProfile({
          displayName: user.displayName,
          photoURL: user.photoURL,
          email: user.email
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time Firestore sync
  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    const q = query(
      collection(db, "sessions"),
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreSessions = snapshot.docs.map(doc => doc.data() as ChatSession);
      setSessions(firestoreSessions);
      
      // Update current session if it changed in Firestore
      if (currentSessionId) {
        const current = firestoreSessions.find(s => s.id === currentSessionId);
        if (current && JSON.stringify(current.messages) !== JSON.stringify(messages)) {
          setMessages(current.messages);
        }
      }
    }, (error: any) => {
      if (error.code === 'resource-exhausted') {
        setQuotaExceeded(true);
      } else {
        handleFirestoreError(error, OperationType.LIST, "sessions");
      }
    });

    return () => unsubscribe();
  }, [user, currentSessionId]);

  useEffect(() => {
    if (mode === 'kalaung' && sidebarTab === 'files') {
      setSidebarTab('chats');
    }
  }, [mode, sidebarTab]);

  // Debounced save to Firestore
  useEffect(() => {
    if (!user || quotaExceeded) return;

    const timer = setTimeout(async () => {
      if (messages.length === 0) {
        if (currentSessionId) {
          const session = sessions.find(s => s.id === currentSessionId);
          if (session) {
            const updatedSession = { ...session, messages: [], updatedAt: new Date().toISOString() };
            try {
              await setDoc(doc(db, "sessions", currentSessionId), sanitizeFirestoreData(updatedSession));
            } catch (error: any) {
              if (error.code === 'resource-exhausted') {
                setQuotaExceeded(true);
              } else {
                handleFirestoreError(error, OperationType.WRITE, `sessions/${currentSessionId}`);
              }
            }
          }
        }
        return;
      }

      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = uuidv4();
        setCurrentSessionId(sessionId);
      }

      const firstUserMessage = messages.find(m => m.role === "user")?.content || "New Chat";
      const title = firstUserMessage.slice(0, 30) + (firstUserMessage.length > 30 ? "..." : "");

      const session: ChatSession & { userId: string } = {
        id: sessionId,
        userId: user.uid,
        title: title,
        messages: messages,
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, "sessions", sessionId), sanitizeFirestoreData(session));
      } catch (error: any) {
        if (error.code === 'resource-exhausted') {
          setQuotaExceeded(true);
        } else {
          handleFirestoreError(error, OperationType.WRITE, `sessions/${sessionId}`);
        }
      }
    }, 3000); // Increased debounce to 3s to save quota

    return () => clearTimeout(timer);
  }, [messages, currentSessionId, user, quotaExceeded]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSaveSettingsSuccess(false);
    
    try {
      setApiKey(geminiKey);
      setGithubToken(githubToken);
      setKnowledgeBase(knowledgeBase);
      setEvolutionDirectives(evolutionDirectives);
      
      setSaveSettingsSuccess(true);
      setTimeout(() => {
        setSaveSettingsSuccess(false);
        setShowSettings(false);
        setShowKeySetup(false);
      }, 1500);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleMessagesChange = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setMessages(session.messages);
      setCurrentSessionId(session.id);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteDoc(doc(db, "sessions", id));
      if (currentSessionId === id) {
        handleNewChat();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${id}`);
    }
  };

  const handleClearHistory = async () => {
    try {
      const deletePromises = sessions.map(s => deleteDoc(doc(db, "sessions", s.id)));
      await Promise.all(deletePromises);
      handleNewChat();
      setShowClearConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "sessions (batch)");
    }
  };

  if (isAuthLoading) return null;

  if (!user && !showSplash) {
    return (
      <div className="flex h-screen bg-[#0c0c0c] items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#161616] border border-white/10 rounded-[32px] p-8 shadow-2xl text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 mx-auto">
            <Sparkles className="text-primary w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Khetra Ai</h2>
          <p className="text-sm text-white/40 mb-8">
            The Future of Ancient Wisdom. Please sign in to continue.
          </p>
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-white text-black rounded-2xl py-4 font-bold text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (showKeySetup && !showSplash) {
    return (
      <div className="flex h-screen bg-[#0c0c0c] items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-[#161616] border border-white/10 rounded-[32px] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Key className="text-primary w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">Setup Your Access</h2>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-2">
                <Key className="w-3 h-3" /> Gemini API Key
              </label>
              <input 
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
              />
              <p className="text-[10px] text-white/20">Get yours from Google AI Studio</p>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-2">
                <Github className="w-3 h-3" /> GitHub Token (Optional)
              </label>
              <input 
                type="password"
                value={githubToken}
                onChange={(e) => setGithubTokenState(e.target.value)}
                placeholder="ghp_..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>

            <button 
              onClick={handleSaveSettings}
              disabled={!geminiKey}
              className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Chatting
            </button>
            
            <button 
              onClick={logout}
              className="w-full text-white/40 text-xs hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showProfile && user) {
    return <ProfilePage user={user} onBack={() => setShowProfile(false)} />;
  }

  return (
    <div className="flex h-screen bg-[#0c0c0c] text-foreground overflow-hidden">
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: showSplash ? 0 : 1, scale: showSplash ? 0.95 : 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex h-full w-full overflow-hidden"
      >
        <CommandPalette 
          onNewChat={handleNewChat}
          onToggleDarkMode={() => {}} // Dark mode is default, can add logic if needed
          onToggleAiMode={() => {
            let newMode: AiMode;
            if (mode === 'kalaung') newMode = 'arindama';
            else newMode = 'kalaung';
            
            setMode(newMode);
            if (newMode !== 'arindama') {
              setSidebarTab("chats");
            }
          }}
          onClearHistory={() => setShowClearConfirm(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenGithub={() => {
            setSidebarTab("files");
            setIsSidebarOpen(true);
          }}
          mode={mode}
        />
        <Sidebar 
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          onClearHistory={() => setShowClearConfirm(true)}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          onOpenProfile={() => setShowProfile(true)}
          userProfile={userProfile}
          mode={mode}
        />

        <main className="flex-1 overflow-hidden relative flex flex-col">
          {quotaExceeded && (
            <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 flex items-center justify-between gap-4 z-20">
              <div className="flex items-center gap-2 text-rose-500 text-xs font-medium">
                <AlertCircle className="w-4 h-4" />
                <span>Firestore Quota Exceeded. Chat history will not be saved until tomorrow.</span>
              </div>
              <button 
                onClick={() => setQuotaExceeded(false)}
                className="text-rose-500/60 hover:text-rose-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <ChatInterface 
            messages={messages} 
            onMessagesChange={handleMessagesChange} 
            onOpenSettings={() => setShowSettings(true)}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            onSwitchTab={setSidebarTab}
            mode={mode}
            onModeChange={setMode}
            userProfile={userProfile}
          />

          {showSettings && (
            <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
              <div className="w-full max-w-2xl bg-[#161616] border border-white/10 rounded-[32px] p-8 shadow-2xl my-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Settings className="text-primary w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Advanced Configuration</h2>
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-2">
                        <Key className="w-3 h-3" /> Gemini API Key
                      </label>
                      <input 
                        type="password"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>

                    {mode === "arindama" && (
                      <div className="space-y-3">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-2">
                          <Github className="w-3 h-3" /> GitHub Token
                        </label>
                        <input 
                          type="password"
                          value={githubToken}
                          onChange={(e) => setGithubTokenState(e.target.value)}
                          placeholder="ghp_..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-2">
                        <Database className="w-3 h-3" /> Knowledge Base
                      </label>
                      <textarea 
                        value={knowledgeBase}
                        onChange={(e) => setKnowledgeBaseState(e.target.value)}
                        placeholder={`Add custom knowledge for ${mode === 'kalaung' ? 'Ka-Laung' : 'Arindama'} to remember...`}
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-2">
                        <Zap className="w-3 h-3" /> Evolution Directives
                      </label>
                      <textarea 
                        value={evolutionDirectives}
                        onChange={(e) => setEvolutionDirectivesState(e.target.value)}
                        placeholder={`How should ${mode === 'kalaung' ? 'Ka-Laung' : 'Arindama'} evolve or behave?`}
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 mt-8 flex items-center justify-center gap-2"
                >
                  {isSavingSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : saveSettingsSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      Saved Successfully
                    </>
                  ) : (
                    "Save All Configurations"
                  )}
                </button>
              </div>
            </div>
          )}

          {showClearConfirm && (
            <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#161616] border border-white/10 rounded-[32px] p-8 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 mx-auto">
                  <Trash2 className="text-rose-500 w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white text-center mb-2">Clear All History?</h2>
                <p className="text-sm text-white/40 text-center mb-8">
                  Chat history အားလုံးကို ဖျက်ပစ်မှာ သေချာပါသလားရှင်? ဒီလုပ်ဆောင်ချက်ကို ပြန်ပြင်လို့ မရနိုင်ပါဘူးရှင်။
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/60 font-bold hover:bg-white/10 transition-all"
                  >
                    မဖျက်တော့ပါ
                  </button>
                  <button 
                    onClick={handleClearHistory}
                    className="flex-1 px-6 py-4 rounded-2xl bg-rose-500 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-rose-500/20"
                  >
                    ဖျက်မည်
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </motion.div>
    </div>
  );
}
