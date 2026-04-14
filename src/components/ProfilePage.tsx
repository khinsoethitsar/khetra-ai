import { useState, useEffect } from "react";
import { User, db, doc, getDoc, setDoc, auth } from "../lib/firebase";
import { motion } from "motion/react";
import { User as UserIcon, Camera, Save, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

interface ProfilePageProps {
  user: User;
  onBack: () => void;
}

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  updatedAt: string;
}

export default function ProfilePage({ user, onBack }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [photoURL, setPhotoURL] = useState(user.photoURL || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          setDisplayName(data.displayName);
          setPhotoURL(data.photoURL);
        } else {
          // Initialize profile if it doesn't exist
          const initialProfile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || "User",
            photoURL: user.photoURL || "",
            email: user.email || "",
            updatedAt: new Date().toISOString()
          };
          setProfile(initialProfile);
          setDisplayName(initialProfile.displayName);
          setPhotoURL(initialProfile.photoURL);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updatedProfile: UserProfile = {
        uid: user.uid,
        displayName: displayName || "",
        photoURL: photoURL || "",
        email: user.email || "",
        updatedAt: new Date().toISOString()
      };
      
      // Sanitize data for Firestore (remove undefined)
      const sanitizedData = JSON.parse(JSON.stringify(updatedProfile));
      
      await setDoc(doc(db, "users", user.uid), sanitizedData);
      setProfile(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#0c0c0c] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0c0c0c] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#161616]/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">User Profile</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
            saveSuccess 
              ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20" 
              : "bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20"
          )}
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-12">
        <div className="max-w-2xl mx-auto space-y-12">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[40px] bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
                {photoURL ? (
                  <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={48} className="text-white/10" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[40px] cursor-pointer">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">{displayName || "Anonymous User"}</h2>
              <p className="text-sm text-white/20 font-mono tracking-wider uppercase">{user.email}</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="space-y-8">
            <div className="grid gap-6">
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-widest text-white/30 ml-1">Display Name</label>
                <input 
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-widest text-white/30 ml-1">Avatar URL</label>
                <input 
                  type="text"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10 font-mono"
                />
                <p className="text-[10px] text-white/20 ml-1 leading-relaxed">
                  Provide a direct link to an image. We recommend using a high-quality square image.
                </p>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-2">
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Account Status</div>
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active & Verified
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-2">
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Last Updated</div>
                <div className="text-sm font-medium text-white/60">
                  {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : "Never"}
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-12 border-t border-white/5">
            <div className="p-8 rounded-[32px] bg-rose-500/5 border border-rose-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-lg font-bold text-rose-500 mb-1">Account Management</h3>
                <p className="text-sm text-rose-500/40">Signing out will end your current session on this device.</p>
              </div>
              <button 
                onClick={() => auth.signOut()}
                className="px-8 py-3 rounded-2xl bg-rose-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-rose-500/20 whitespace-nowrap"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
