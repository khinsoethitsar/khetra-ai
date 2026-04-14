export function analyzeUrl(url: string) {
  return { url, title: "External Resource" };
}

export function formatUrlContext(analysis: any) {
  return `Context from URL (${analysis.url}): This is an external resource for reference.`;
}
