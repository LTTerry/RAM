export type MemoryGeneration = 'DDR3' | 'DDR4' | 'DDR5';

export interface RamListing {
  id: string;
  generation: MemoryGeneration;
  capacityGB: number;
  speedMTs: number;
  speedStandard: string; // e.g. PC4-25600R, PC5-38400R, PC3-12800R
  moduleType: 'RDIMM' | 'LRDIMM' | '3DS RDIMM';
  rank: string; // e.g. 1Rx4, 2Rx4, 2Rx8, 4Rx4, 8Rx4
  voltage?: string; // e.g. 1.1V, 1.2V, 1.35V, 1.5V
  vendor: string; // eBay, ServerSupply, CPU Medics, TechyParts, IT Creations, CloudNinjas, HardDriveDirect, Wholesale B2B
  vendorType: 'Marketplace' | 'IT Refurbisher' | 'Wholesale B2B' | 'Enterprise Spare';
  title: string;
  partNumber?: string;
  brand: 'Samsung' | 'SK Hynix' | 'Micron' | 'Kingston' | 'Dell OEM' | 'HPE OEM' | 'Lenovo OEM' | 'Generic/Mixed';
  pricePerUnit: number;
  totalLotPrice?: number;
  lotQuantity: number;
  currency: string;
  condition: 'Used (Tested)' | 'Refurbished' | 'System Pull' | 'Open Box' | 'New Surplus';
  testedWorking: boolean;
  warranty?: string;
  sourceUrl: string;
  sourceDomain: string;
  scrapedAt: string;
  notes?: string;
  stockStatus: 'In Stock' | 'Low Stock' | 'Sold Out / Archive' | 'Bulk Lot Available' | 'Verified Sold Record';
  isSoldRecord?: boolean;
  soldDate?: string;
  soldQuantity?: number;
}

export interface EbaySoldRecord {
  id: string;
  generation: MemoryGeneration;
  capacityGB: number;
  speedMTs: number;
  speedStandard: string;
  moduleType: 'RDIMM' | 'LRDIMM' | '3DS RDIMM';
  rank: string;
  brand: string;
  partNumber: string;
  highestSoldPricePerUnit: number;
  lotQuantity: number;
  totalTransactionPrice: number;
  soldDate: string; // e.g. "August 26, 2026"
  listingTitle: string;
  condition: string;
  sourceUrl: string;
  notes: string;
}

export interface MarketTrend {
  generation: MemoryGeneration;
  capacityGB: number;
  speedMTs: number;
  avgPrice3MoAgo: number;
  avgPrice2MoAgo: number;
  avgPrice1MoAgo: number;
  currentAvgPrice: number;
  lowestAskingCurrent: number;
  highestAskingCurrent: number;
  singleUnitRetailPrice?: number;
  wholesaleTrayPrice?: number;
  ebayHighestSoldPrice?: number;
  ebayHighestSoldDate?: string;
  ebayHighestSoldLotInfo?: string;
  threeMonthChangePercent: number;
  trendDirection: 'up' | 'down' | 'stable';
  pricePerGB: number;
  marketActivityLevel: 'High' | 'Very High' | 'Moderate' | 'Low/Decommissioning';
  analysisNotes: string;
}

export interface SearchFilterState {
  generation: MemoryGeneration | 'ALL';
  capacityGB: number | 'ALL';
  speedMTs: number | 'ALL';
  vendor: string | 'ALL';
  vendorType: string | 'ALL';
  condition: string | 'ALL';
  minPrice: number;
  maxPrice: number;
  searchQuery: string;
  onlyBulkLots: boolean;
  sortBy: 'priceAsc' | 'priceDesc' | 'pricePerGBAsc' | 'capacityDesc' | 'speedDesc' | 'dateDesc';
}

export interface LiveSearchRequest {
  generation?: MemoryGeneration;
  capacityGB?: number;
  speedMTs?: number;
  vendorCategory?: 'all' | 'ebay' | 'refurbishers' | 'wholesale';
  searchQuery?: string;
  includeBulkLots?: boolean;
}

export interface LiveSearchResponse {
  success: boolean;
  isFallback?: boolean;
  fallbackNotice?: string;
  querySummary: string;
  groundedSources: Array<{
    title: string;
    url: string;
  }>;
  listings: RamListing[];
  marketInsights: string;
  timestamp: string;
  totalFound: number;
}
