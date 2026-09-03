const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'initialMemoryData.ts');
let content = fs.readFileSync(filePath, 'utf8');

// We currently have INITIAL_RAM_LISTINGS which has the new vendors.
// We want to create INITIAL_EBAY_LISTINGS (with eBay) and INITIAL_CURATED_LISTINGS (with new vendors).
// Wait, the current file has INITIAL_RAM_LISTINGS with the NEW vendors (ServerSupply, etc).
// Let's create two arrays.

const vendors = [
  { name: 'ServerSupply', type: 'ITAD / Refurbisher', domain: 'serversupply.com', urlPrefix: 'https://www.serversupply.com/memory/' },
  { name: 'CloudNinja', type: 'IT Refurbisher', domain: 'cloudninjas.com', urlPrefix: 'https://cloudninjas.com/collections/server-memory/' },
  { name: 'Memory.NET', type: 'Primary Distributor', domain: 'memory.net', urlPrefix: 'https://memory.net/product/' },
  { name: 'IT Creations', type: 'Enterprise Distributor', domain: 'itcreations.com', urlPrefix: 'https://www.itcreations.com/memory/' },
  { name: 'OEM Channels', type: 'OEM Distributor', domain: 'oem-distributor.net', urlPrefix: 'https://oem-distributor.net/parts/' }
];

let counter = 0;

// Re-read or parse? 
// Let's just make a string replacement that replaces ALL current vendors back to eBay for the EBAY list.
let ebayContent = content.replace(/export const INITIAL_RAM_LISTINGS: RamListing\[\] = \[/, 'export const INITIAL_EBAY_LISTINGS: RamListing[] = [');

const entryRegex = /(\{\s*id:.*?stockStatus: '.*?'\s*\})/gs;

ebayContent = ebayContent.replace(entryRegex, (match) => {
  match = match.replace(/vendor:\s*'.*?'/, `vendor: 'eBay'`);
  match = match.replace(/vendorType:\s*'.*?'/, `vendorType: 'Marketplace'`);
  match = match.replace(/sourceDomain:\s*'.*?'/, `sourceDomain: 'ebay.com'`);
  match = match.replace(/sourceUrl:\s*'.*?'/, `sourceUrl: 'https://www.ebay.com/itm/server-memory-placeholder'`);
  
  // also change id to have -eb instead of -cur
  match = match.replace(/id:\s*'([^']+)'/, (m, p1) => {
    return `id: '${p1}-eb'`;
  });

  return match;
});

// For curated, we take the current content (which has the new vendors) and just rename it
let curatedContent = content.replace(/export const INITIAL_RAM_LISTINGS: RamListing\[\] = \[/, 'export const INITIAL_CURATED_LISTINGS: RamListing[] = [');
// Change IDs to have -cur
curatedContent = curatedContent.replace(entryRegex, (match) => {
  match = match.replace(/id:\s*'([^']+)'/, (m, p1) => {
    return `id: '${p1}-cur'`;
  });
  return match;
});

// The top of the file has imports. Let's combine.
const importsMatch = content.match(/import.*?;\n/g);
const imports = importsMatch ? importsMatch.join('') : "import { RamListing } from '../types';\n";

const newFileContent = imports + "\n" + ebayContent.replace(imports, '') + "\n\n" + curatedContent.replace(imports, '');

fs.writeFileSync(filePath, newFileContent, 'utf8');
console.log('Fixed initialMemoryData.ts!');
