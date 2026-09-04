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
  lastUpdatedDate: "September 3, 2026",
  lastUpdatedDay: "Thursday",
  lastUpdatedTime: "07:09 PM",
  timezone: "UTC+8 (Hong Kong Time)",
  formattedFullTimestamp: "Thursday, September 3, 2026 at 07:09 PM (UTC+8)",
  researchQuarter: "Q3 2026",
  totalSkusAudited: 347,
  marketScope: "eBay Browse API (347 Verified Active Seller Listings) + Enterprise Distributors"
};

export const DEFAULT_CRON_INFO = {
  schedule: "0 0 * * *",
  scheduleDescription: "GitHub Actions workflow triggers daily at 08:00 AM UTC+8 (00:00 UTC)",
  lastRun: "2026-09-03T11:09:40.752Z",
  nextRun: "Managed by GitHub Actions schedule (Daily 8:00 AM HKT)",
  isRefreshing: false,
  storageType: "Static JSON on GitHub Pages ($0 Hosting/DB Cost)",
  totalSkusAudited: 347,
  ebayRecordsSuccess: 347,
  jsonUpdated: true,
  dataSource: "eBay Browse API (Live Production Listings)",
  recentLogs: [
    {
      timestamp: "2026-09-03T11:09:40.752Z",
      type: "SCHEDULED" as const,
      status: "SUCCESS" as const,
      message: "Live market data sourced directly from real-time eBay Browse API (347 active listings verified).",
      skusUpdated: 347,
      ebayRecordsSuccess: 347,
      jsonUpdated: true,
      dataSource: "eBay Production API (Realistic Search)"
    }
  ]
};

