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
