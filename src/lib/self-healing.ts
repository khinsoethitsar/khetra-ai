import { GithubErrorDetail } from "./github-diagnostics";

export interface HealingPlan {
  explanation: string;
  suggestedPrompt: string;
  actionRequired: "retry" | "re-authenticate" | "modify-code" | "check-settings";
}

export function generateHealingPlan(diagnostic: GithubErrorDetail, context: any): HealingPlan {
  let action: HealingPlan["actionRequired"] = "modify-code";
  let explanation = diagnostic.analysis;

  if (diagnostic.httpStatus === 401) {
    action = "re-authenticate";
  } else if (diagnostic.httpStatus === 403) {
    action = "check-settings";
  } else if (diagnostic.httpStatus === 422) {
    action = "modify-code";
  }

  const suggestedPrompt = `I encountered a GitHub error. 
Status: ${diagnostic.httpStatus}
Summary: ${diagnostic.summary}
Analysis: ${diagnostic.analysis}
Failed Action Context: ${JSON.stringify(context)}

Please analyze this error and provide a CORRECTED version of the github-action JSON block to fix this. Explain the fix in Burmese.`;

  return {
    explanation,
    suggestedPrompt,
    actionRequired: action
  };
}
