// Utility functions for memory classification: Module Type & Rank detection

export type MemoryModuleType = 'RDIMM' | 'LRDIMM' | '3DS RDIMM';

/**
 * Accurately detects the server memory module type from title, capacity, generation, and part number.
 */
export function detectModuleType(
  title: string,
  capacityGB: number,
  generation: string,
  fallbackType?: string
): MemoryModuleType {
  const t = (title || '').toLowerCase();
  
  // 1. Explicit 3DS / TSV indicators
  if (/\b(?:3ds|tsv|3d[- ]stack|3ds[- ]rdimm)\b/i.test(t)) {
    return '3DS RDIMM';
  }

  // 2. Explicit LRDIMM indicators (Load Reduced DIMMs)
  // Check for LRDIMM keywords or LRDIMM part number standards
  const isExplicitLRDIMM = 
    /\b(?:lrdimm|lr-dimm|load[- ]reduced|loadreduced)\b/i.test(t) ||
    /\bpc[345][l]?-\d+[a-z]?l\b/i.test(t) || // e.g., PC4-2666V-L or PC3-14900L
    /\bm386[a-z0-9]+/i.test(t) || // Samsung LRDIMM standard prefix (M386 = LRDIMM, M393 = RDIMM, M321 = DDR5 RDIMM)
    /\bmta[0-9]+asq[0-9]+g72l[sz]/i.test(t) || // Micron LRDIMM
    /\bhma[a-z0-9]+l[a-z0-9]+/i.test(t); // SK Hynix LRDIMM

  const isNegatedLRDIMM = /\b(?:not|non|no)\s+lrdimm\b/i.test(t);

  if (isExplicitLRDIMM && !isNegatedLRDIMM) {
    return 'LRDIMM';
  }

  // 3. Generation & Density architectural constraints
  if (generation === 'DDR5') {
    if (capacityGB >= 256) return '3DS RDIMM';
    // 128GB DDR5: Check if explicitly 3DS or 4Rx4/8Rx4 TSV
    if (capacityGB === 128 && (/\b(?:3ds|tsv|8rx4|4rx4)\b/i.test(t) && !/\b(?:2s2rx4|2rx4|m321|hmct04ag)\b/i.test(t))) {
      return '3DS RDIMM';
    }
    return 'RDIMM';
  }

  if (generation === 'DDR4') {
    // If title explicitly contains RDIMM / ECC REG / PC4-xxxxR / M393, it is an RDIMM
    if (/\b(?:rdimm|ecc\s+reg|registered|pc4-\d+[a-z]?r|m393[a-z0-9]+)\b/i.test(t) && !isExplicitLRDIMM) {
      return 'RDIMM';
    }
    // High density 128GB DDR4 with 4Rx4 / 8Rx4 / Octal Rank without M393 is generally LRDIMM
    if (capacityGB >= 128 && (/\b(?:4rx4|8rx4|octal|quad\s+rank)\b/i.test(t) || !t.includes('rdimm'))) {
      if (/\bm393/i.test(t)) return 'RDIMM';
      return 'LRDIMM';
    }
    return 'RDIMM';
  }

  if (generation === 'DDR3') {
    if (isExplicitLRDIMM) return 'LRDIMM';
    return 'RDIMM';
  }

  // 4. Fallback if valid
  if (fallbackType === 'LRDIMM' || fallbackType === '3DS RDIMM' || fallbackType === 'RDIMM') {
    return fallbackType;
  }

  return 'RDIMM';
}

/**
 * Accurately extracts memory rank (e.g. 1Rx4, 2Rx4, 2Rx8, 4Rx4, 8Rx4) from title.
 */
export function extractMemoryRank(
  title: string,
  capacityGB: number,
  generation: string,
  fallbackRank?: string
): string {
  if (!title) return fallbackRank || '2Rx4';
  const rankMatch = title.match(/\b([1248]R\s*[x*]\s*(?:4|8|16))\b/i);
  if (rankMatch) {
    return rankMatch[1].replace(/\s+/g, '').replace('*', 'x').toUpperCase();
  }
  if (/\boctal\s*rank|8rx4|8r/i.test(title)) return '8Rx4';
  if (/\bquad\s*rank|4rx4|4r/i.test(title)) return '4Rx4';
  if (/\bdual\s*rank|2rx4|2rx8|2r/i.test(title)) return '2Rx4';
  if (/\bsingle\s*rank|1rx4|1rx8|1r/i.test(title)) return '1Rx4';

  if (fallbackRank) return fallbackRank;
  if (capacityGB >= 128 && generation === 'DDR4') return '4Rx4';
  if (capacityGB >= 128 && generation === 'DDR5') return '4Rx4';
  if (capacityGB <= 16 && generation === 'DDR4') return '1Rx4';
  return '2Rx4';
}
