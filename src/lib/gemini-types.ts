export interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: string;
  files?: {
    name: string;
    type: string;
    data: string;
    trimStart?: string;
    trimEnd?: string;
  }[];
}
