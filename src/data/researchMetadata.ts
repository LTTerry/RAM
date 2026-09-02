export interface ResearchMetadata {
  lastUpdatedDate: string; // e.g. "August 30, 2026"
  lastUpdatedDay: string;  // e.g. "Saturday"
  lastUpdatedTime: string; // e.g. "08:35 PM"
  timezone: string;        // e.g. "UTC-7 (PDT)"
  formattedFullTimestamp: string; // "Sunday, August 30, 2026 at 07:50 AM (UTC-7)"
  researchQuarter: string; // "Q3 2026"
  totalSkusAudited: number;
  marketScope: string;
}

export const CURRENT_RESEARCH_METADATA: ResearchMetadata = {
  lastUpdatedDate: "September 1, 2026",
  lastUpdatedDay: "Tuesday",
  lastUpdatedTime: "11:46 PM",
  timezone: "UTC+8 (Hong Kong Time)",
  formattedFullTimestamp: "Tuesday, September 1, 2026 at 11:46 PM (UTC+8)",
  researchQuarter: "Q3 2026",
  totalSkusAudited: 36,
  marketScope: "eBay (Completed & Verified Lots), ServerSupply, CPU Medics, TechyParts, Wholesale B2B Trays"
};

export const DEFAULT_CRON_INFO = {
  schedule: "0 0 * * *",
  scheduleDescription: "GitHub Actions workflow triggers daily at 08:00 AM UTC+8 (00:00 UTC)",
  lastRun: "2026-09-02T04:21:30.012Z",
  nextRun: "Managed by GitHub Actions schedule",
  isRefreshing: false,
  storageType: "Static JSON on GitHub Pages ($0 Hosting/DB Cost)",
  totalSkusAudited: 36,
  ebayRecordsSuccess: 36,
  jsonUpdated: true,
  dataSource: "eBay Production API (Realistic Search)",
  recentLogs: [
    {
      timestamp: "2026-09-02T04:21:30.012Z",
      type: "SCHEDULED" as const,
      status: "SUCCESS" as const,
      message: "Live market data sourced directly from real-time eBay Browse API (Production).",
      skusUpdated: 36,
      ebayRecordsSuccess: 36,
      jsonUpdated: true,
      dataSource: "eBay Production API (Realistic Search)"
    }
  ]
};

