export interface GithubErrorDetail {
  summary: string;
  analysis: string;
  suggestions: string[];
  httpStatus: number;
}

export function formatDiagnosticMarkdown(diagnostic: GithubErrorDetail, includeSuggestions: boolean = true): string {
  const suggestionsList = includeSuggestions 
    ? `\n\n**Actionable Suggestions:**\n${diagnostic.suggestions.map(s => `- ${s}`).join('\n')}`
    : '';
  return `### ❌ GitHub API Error (${diagnostic.httpStatus})\n\n**Summary:** ${diagnostic.summary}\n\n**Analysis:** ${diagnostic.analysis}${suggestionsList}`;
}

export function analyzeGithubError(status: number, data: any): GithubErrorDetail {
  let summary = "GitHub API Error";
  let analysis = "An unexpected error occurred while communicating with GitHub.";
  let suggestions: string[] = ["Check your internet connection.", "Verify your GitHub Personal Access Token in Settings."];

  if (status === 401) {
    summary = "Unauthorized / Invalid Token";
    analysis = "The GitHub token provided is either invalid, expired, or has been revoked.";
    suggestions = [
      "Go to Settings and update your GitHub Token.",
      "Ensure the token has 'repo' and 'gist' scopes.",
      "Create a new token at github.com/settings/tokens if needed."
    ];
  } else if (status === 403) {
    const isRateLimit = data?.message?.includes("rate limit");
    summary = isRateLimit ? "Rate Limit Exceeded" : "Forbidden / Insufficient Scopes";
    analysis = isRateLimit 
      ? "You have made too many requests to GitHub in a short period." 
      : "Your token doesn't have the necessary permissions for this specific action.";
    suggestions = isRateLimit 
      ? ["Wait for a few minutes before trying again.", "Check your rate limit status on GitHub."]
      : ["Ensure your token has full 'repo' access.", "Check if you are trying to write to a repository you don't own."];
  } else if (status === 422) {
    const isAlreadyExists = data?.errors?.some((e: any) => e.code === "already_exists") || data?.message?.includes("already exists");
    summary = isAlreadyExists ? "Resource Already Exists" : "Validation Failed";
    analysis = isAlreadyExists 
      ? "The repository name or file path you are trying to create is already in use."
      : "The data sent to GitHub was rejected as invalid (e.g., invalid characters in repo name).";
    suggestions = isAlreadyExists
      ? ["Choose a different name for your repository.", "Check if the file already exists in the target path."]
      : ["Ensure the repository name only contains alphanumeric characters, hyphens, or underscores.", "Verify the file content is not empty."];
  } else if (status === 404) {
    summary = "Resource Not Found";
    analysis = "GitHub couldn't find the repository, owner, or file path specified.";
    suggestions = [
      "Double-check the repository owner and name.",
      "Verify that the file path is correct (case-sensitive).",
      "Ensure the repository is public or your token has access to private repos."
    ];
  } else if (status >= 500) {
    summary = "GitHub Server Error";
    analysis = "GitHub is currently experiencing internal issues.";
    suggestions = ["Check status.github.com for ongoing incidents.", "Try again in a few minutes."];
  }

  return { summary, analysis, suggestions, httpStatus: status };
}
