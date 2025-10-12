// Script to remove duplicate keys from coingecko.ts mapping
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'coingecko.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Find the mapping object
const mappingStart = content.indexOf('const SYMBOL_TO_COINGECKO_ID');
const mappingEnd = content.indexOf('}', content.indexOf('export function symbolToCoinGeckoId'));

const beforeMapping = content.substring(0, mappingStart);
const mappingSection = content.substring(mappingStart, mappingEnd + 1);
const afterMapping = content.substring(mappingEnd + 1);

// Extract all key-value pairs
const regex = /'([^']+)':\s*'([^']+)',?\s*(?:\/\/.*)?/g;
const pairs = [];
const seen = new Set();
let match;

while ((match = regex.exec(mappingSection)) !== null) {
  const [, key, value] = match;
  if (!seen.has(key)) {
    pairs.push({ key, value, line: match[0] });
    seen.add(key);
    console.log(`✅ Keeping: ${key} -> ${value}`);
  } else {
    console.log(`❌ Removing duplicate: ${key} -> ${value}`);
  }
}

// Reconstruct mapping
const newMapping = `const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {\n  // ===== CLEANED MAPPING (${pairs.length} unique symbols) =====\n` +
  pairs.map(p => `  '${p.key}': '${p.value}',`).join('\n') +
  '\n}';

// Reconstruct file
const newContent = beforeMapping + newMapping + '\n\n' + afterMapping;

// Write back
fs.writeFileSync(filePath, newContent, 'utf8');

console.log(`\n✅ Cleaned! Total unique symbols: ${pairs.length}`);
console.log(`📝 File saved: ${filePath}`);
