/**
 * Export Indian Macro Data to CSV
 * Run: node scripts/exportIndianMacroToCSV.mjs
 */

import fs from 'fs';
import path from 'path';

// Read the JSON data
const jsonPath = path.join(process.cwd(), 'src', 'data', 'indiaMacroHistorical.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// Convert to CSV
const headers = [
    'date',
    'repoRate',
    'gdpGrowth',
    'cpiInflation',
    'wpiInflation',
    'gSecYield',
    'forexReserves',
    'inrUsd',
    'bankCredit'
];

let csv = headers.join(',') + '\n';

data.forEach(row => {
    const values = headers.map(header => row[header] || '');
    csv += values.join(',') + '\n';
});

// Save CSV
const outputPath = path.join(process.cwd(), 'data', 'india', 'indiaMacroHistorical.csv');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, csv);

console.log(`✅ CSV exported to: ${outputPath}`);
console.log(`📊 Total rows: ${data.length}`);
