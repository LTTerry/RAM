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
  lastUpdatedDate: "August 30, 2026",
  lastUpdatedDay: "Sunday",
  lastUpdatedTime: "08:35 PM",
  timezone: "UTC-7 (PDT)",
  formattedFullTimestamp: "Sunday, August 30, 2026 at 08:35 PM (UTC-7)",
  researchQuarter: "Q3 2026",
  totalSkusAudited: 53,
  marketScope: "eBay (Completed & Verified Lots), ServerSupply, CPU Medics, TechyParts, Wholesale B2B Trays"
};
