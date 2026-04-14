import { CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import { cn } from "../lib/utils";

export interface ActivityLog {
  id: string;
  message: string;
  status: "loading" | "success" | "error";
  timestamp: string;
}

interface ActivityFeedProps {
  logs: ActivityLog[];
}

export default function ActivityFeed({ logs }: ActivityFeedProps) {
  if (logs.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/20 mb-3">
        <Clock className="w-3 h-3" />
        <span>Activity Log</span>
      </div>
      <div className="space-y-2.5">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 text-[13px]">
            <div className="mt-0.5">
              {log.status === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : log.status === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-500/80" />
              )}
            </div>
            <span className={cn(
              "flex-1 leading-relaxed",
              log.status === "error" ? "text-rose-500/80" : "text-white/40"
            )}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
