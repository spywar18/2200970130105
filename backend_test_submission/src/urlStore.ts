export interface ClickDetail {
  timestamp: string;
  source?: string;
  geo?: string;
}

export interface UrlEntry {
  originalUrl: string;
  shortcode: string;
  createdAt: string;
  expiry: string;
  clickCount: number;
  clickDetails: ClickDetail[];
}

// In-memory store: shortcode -> UrlEntry
export const urlStore: Record<string, UrlEntry> = {};
