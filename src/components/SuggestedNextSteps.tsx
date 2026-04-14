import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";

export interface NextStep {
  label: string;
  prompt: string;
  description?: string;
  icon?: React.ReactNode;
}

interface SuggestedNextStepsProps {
  steps: NextStep[];
  onStepClick: (prompt: string) => void;
}

export default function SuggestedNextSteps({ steps, onStepClick }: SuggestedNextStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {steps.map((step, idx) => (
        <motion.button
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 25 }}
          onClick={() => onStepClick(step.prompt)}
          className="flex flex-col items-start gap-4 p-6 rounded-[28px] bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-primary/30 text-left transition-all group relative overflow-hidden shadow-xl hover:shadow-primary/5"
        >
          {/* Decorative background element */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300 shadow-inner">
            {step.icon || <Sparkles className="w-6 h-6" />}
          </div>
          
          <div className="space-y-1.5 pr-4 relative z-10">
            <h4 className="text-[15px] font-bold text-white/90 group-hover:text-primary transition-colors tracking-tight">
              {step.label}
            </h4>
            {step.description && (
              <div className="text-[12px] text-white/40 leading-relaxed font-medium">
                {step.description}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/30 group-hover:text-primary transition-all pt-3 mt-auto">
            <span className="group-hover:translate-x-1 transition-transform">Execute Action</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-2 transition-transform" />
          </div>
        </motion.button>
      ))}
    </div>
  );
}
