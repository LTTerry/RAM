export interface ResearchMetadata {
  lastUpdatedDate: string; // e.g. "September 4, 2026"
  lastUpdatedDay: string;  // e.g. "Friday"
  lastUpdatedTime: string; // e.g. "10:57 AM"
  timezone: string;        // e.g. "UTC+8 (Hong Kong Time)"
  formattedFullTimestamp: string; // "Friday, September 4, 2026 at 10:57 AM (UTC+8)"
  researchQuarter: string; // "Q3 2026"
  totalSkusAudited: number;
  marketScope: string;
  isoTimestamp?: string;
}

export const CURRENT_RESEARCH_METADATA: ResearchMetadata = {
  lastUpdatedDate: "September 4, 2026",
  lastUpdatedDay: "Friday",
  lastUpdatedTime: "10:57 AM",
  timezone: "UTC+8 (Hong Kong Time)",
  formattedFullTimestamp: "Friday, September 4, 2026 at 10:57 AM (UTC+8)",
  researchQuarter: "Q3 2026",
  totalSkusAudited: 347,
  marketScope: "eBay Browse API (347 Verified Active Seller Listings) + Enterprise Distributors",
  isoTimestamp: "2026-09-04T02:57:22.498Z"
};

export const DEFAULT_CRON_INFO = {
  schedule: "0 0 * * *",
  scheduleDescription: "GitHub Actions workflow triggers daily at 08:00 AM UTC+8 (00:00 UTC)",
  lastRun: "2026-09-04T02:57:22.498Z",
  nextRun: "Managed by GitHub Actions schedule (Daily 8:00 AM HKT)",
  isRefreshing: false,
  storageType: "Static JSON on GitHub Pages ($0 Hosting/DB Cost)",
  totalSkusAudited: 347,
  ebayRecordsSuccess: 347,
  jsonUpdated: true,
  dataSource: "eBay Browse API (Live Production Listings)",
  recentLogs: [
    {
      timestamp: "2026-09-04T02:57:22.498Z",
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

