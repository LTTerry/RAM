const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'initialMemoryData.ts');
let content = fs.readFileSync(filePath, 'utf8');

const vendors = [
  { name: 'ServerSupply', type: 'ITAD / Refurbisher', domain: 'serversupply.com', urlPrefix: 'https://www.serversupply.com/memory/' },
  { name: 'CloudNinja', type: 'IT Refurbisher', domain: 'cloudninjas.com', urlPrefix: 'https://cloudninjas.com/collections/server-memory/' },
  { name: 'Memory.NET', type: 'Primary Distributor', domain: 'memory.net', urlPrefix: 'https://memory.net/product/' },
  { name: 'IT Creations', type: 'Enterprise Distributor', domain: 'itcreations.com', urlPrefix: 'https://www.itcreations.com/memory/' },
  { name: 'OEM Channels', type: 'OEM Distributor', domain: 'oem-distributor.net', urlPrefix: 'https://oem-distributor.net/parts/' }
];

let counter = 0;

// We need to parse the file or do string replacements.
// Since it's a TS file with objects, regex on the block might be easiest.
// A regex to match each object in the array.
const entryRegex = /(\{\s*id:.*?stockStatus: '.*?'\s*\})/gs;

content = content.replace(entryRegex, (match) => {
  const v = vendors[counter % vendors.length];
  counter++;

  // Replace vendor
  match = match.replace(/vendor:\s*'.*?'/, `vendor: '${v.name}'`);
  
  // Replace vendorType
  match = match.replace(/vendorType:\s*'.*?'/, `vendorType: '${v.type}'`);
  
  // Extract part number to make a somewhat realistic URL
  const partNumberMatch = match.match(/partNumber:\s*'([^']+)'/);
  let pn = 'generic-part';
  if (partNumberMatch) {
    pn = partNumberMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // Replace sourceDomain
  match = match.replace(/sourceDomain:\s*'.*?'/, `sourceDomain: '${v.domain}'`);
  
  // Replace sourceUrl
  match = match.replace(/sourceUrl:\s*'.*?'/, `sourceUrl: '${v.urlPrefix}${pn}'`);
  
  return match;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated vendors in initialMemoryData.ts!');
