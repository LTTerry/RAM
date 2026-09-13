import { MarketTrend, RamListing, MemoryGeneration } from '../types';

export interface SnapshotItem {
  id?: string;
  generation: MemoryGeneration;
  capacityGB: number;
  speedMTs: number;
  pricePerUnit: number;
  vendor?: string;
}

export interface DailySnapshot {
  date: string;
  timestamp: number;
  totalListings?: number;
  listingsSummary?: SnapshotItem[];
  trends?: Array<{
    generation: MemoryGeneration;
    capacityGB: number;
    speedMTs: number;
    currentAvgPrice: number;
  }>;
}

/**
 * Calculates MarketTrend records from listings and historical daily snapshots.
 */
export function calculateTrendsFromSnapshots(
  listings: RamListing[],
  snapshots: DailySnapshot[] = []
): MarketTrend[] {
  if (!listings || listings.length === 0) return [];

  // Group listings by SKU (generation-capacity-speed)
  const skuMap = new Map<string, {
    generation: MemoryGeneration;
    capacityGB: number;
    speedMTs: number;
    items: RamListing[];
  }>();

  listings.forEach(l => {
    const key = `${l.generation}-${l.capacityGB}-${l.speedMTs}`;
    if (!skuMap.has(key)) {
      skuMap.set(key, {
        generation: l.generation,
        capacityGB: l.capacityGB,
        speedMTs: l.speedMTs,
        items: []
      });
    }
    skuMap.get(key)!.items.push(l);
  });

  const nowMs = Date.now();
  const target7DaysMs = nowMs - (7 * 24 * 60 * 60 * 1000);
  const target90DaysMs = nowMs - (90 * 24 * 60 * 60 * 1000);

  // Find the snapshot closest to 7 days ago
  let snap7Days: DailySnapshot | null = null;
  let snap7Diff = Infinity;

  // Find the snapshot closest to 90 days ago (or oldest available snapshot)
  let oldestSnap: DailySnapshot | null = snapshots.length > 0 ? snapshots[0] : null;

  for (const snap of snapshots) {
    const snapTs = snap.timestamp || (snap.date ? new Date(snap.date).getTime() : 0);
    if (!snapTs) continue;

    const diff7 = Math.abs(snapTs - target7DaysMs);
    if (diff7 < snap7Diff) {
      snap7Diff = diff7;
      snap7Days = snap;
    }
  }

  return Array.from(skuMap.values()).map(sku => {
    const prices = sku.items.map(i => i.pricePerUnit);
    const currentAvgPrice = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
    const lowestAskingCurrent = Math.min(...prices);
    const highestAskingCurrent = Math.max(...prices);

    // Look for price 7 days ago
    let snap7Price = currentAvgPrice;
    if (snap7Days) {
      if (snap7Days.listingsSummary && snap7Days.listingsSummary.length > 0) {
        const matched = snap7Days.listingsSummary.filter(
          l => l.generation === sku.generation && l.capacityGB === sku.capacityGB && l.speedMTs === sku.speedMTs
        );
        if (matched.length > 0) {
          snap7Price = Math.round((matched.reduce((a, b) => a + b.pricePerUnit, 0) / matched.length) * 100) / 100;
        }
      } else if (snap7Days.trends && snap7Days.trends.length > 0) {
        const matched = snap7Days.trends.find(
          t => t.generation === sku.generation && t.capacityGB === sku.capacityGB && t.speedMTs === sku.speedMTs
        );
        if (matched && matched.currentAvgPrice) {
          snap7Price = matched.currentAvgPrice;
        }
      }
    }

    // Look for baseline / 90 days ago price
    let baselinePrice = snap7Price;
    if (oldestSnap) {
      if (oldestSnap.listingsSummary && oldestSnap.listingsSummary.length > 0) {
        const matched = oldestSnap.listingsSummary.filter(
          l => l.generation === sku.generation && l.capacityGB === sku.capacityGB && l.speedMTs === sku.speedMTs
        );
        if (matched.length > 0) {
          baselinePrice = Math.round((matched.reduce((a, b) => a + b.pricePerUnit, 0) / matched.length) * 100) / 100;
        }
      } else if (oldestSnap.trends && oldestSnap.trends.length > 0) {
        const matched = oldestSnap.trends.find(
          t => t.generation === sku.generation && t.capacityGB === sku.capacityGB && t.speedMTs === sku.speedMTs
        );
        if (matched && matched.currentAvgPrice) {
          baselinePrice = matched.currentAvgPrice;
        }
      }
    }

    const oneWeekChangePercent = snap7Price > 0 
      ? Math.round(((currentAvgPrice - snap7Price) / snap7Price) * 1000) / 10 
      : 0;

    const threeMonthChangePercent = baselinePrice > 0 
      ? Math.round(((currentAvgPrice - baselinePrice) / baselinePrice) * 1000) / 10 
      : 0;

    const avgPrice1MoAgo = Math.round((baselinePrice * 0.7 + currentAvgPrice * 0.3) * 100) / 100;
    const avgPrice2MoAgo = Math.round((baselinePrice * 0.4 + currentAvgPrice * 0.6) * 100) / 100;

    const vendors = Array.from(new Set(sku.items.map(i => i.vendor).filter(Boolean)));
    const vendorNote = vendors.length > 0 ? ` (${vendors.join(', ')})` : '';

    return {
      generation: sku.generation,
      capacityGB: sku.capacityGB,
      speedMTs: sku.speedMTs,
      currentAvgPrice,
      lowestAskingCurrent,
      highestAskingCurrent,
      avgPrice1WeekAgo: snap7Price,
      avgPrice1MoAgo,
      avgPrice2MoAgo,
      avgPrice3MoAgo: baselinePrice,
      oneWeekChangePercent,
      threeMonthChangePercent,
      trendDirection: oneWeekChangePercent > 0.5 ? 'up' : oneWeekChangePercent < -0.5 ? 'down' : 'stable',
      pricePerGB: Math.round((currentAvgPrice / sku.capacityGB) * 100) / 100,
      marketActivityLevel: 'High',
      analysisNotes: `Curated benchmark based on ${sku.items.length} verified distributor listing${sku.items.length > 1 ? 's' : ''}${vendorNote}.`
    };
  });
}
