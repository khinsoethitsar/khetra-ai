import { motion } from "motion/react";
import { CheckCircle2, Circle, Loader2, AlertCircle, Search, Brain, Zap } from "lucide-react";
import { ThinkingStep } from "../lib/gemini";
import { cn } from "../lib/utils";

interface ThinkingProcessProps {
  steps: ThinkingStep[];
  isActive: boolean;
}

export default function ThinkingProcess({ steps, isActive }: ThinkingProcessProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
        <Brain className="w-3 h-3" />
        <span>Thinking Process</span>
      </div>
      <div className="space-y-3">
        {steps.map((step) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="shrink-0">
              {step.status === "done" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
              ) : step.status === "active" ? (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              ) : step.status === "error" ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-500/80" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-white/10" />
              )}
            </div>
            <span className={cn(
              "text-[13px] transition-colors",
              step.status === "active" ? "text-white font-medium" : "text-white/40"
            )}>
              {step.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
