import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const ROOT = 'c:/Users/thaku/Desktop/Work/MFP';
const NEW_DATA_DIR = path.join(ROOT, 'data/new data');

function parseXLSX(filename, sheetIdx = 0) {
    console.log(`Parsing XLSX: ${filename}`);
    const workbook = XLSX.readFile(path.join(NEW_DATA_DIR, filename));
    console.log(`Sheets in ${filename}:`, workbook.SheetNames);
    const sheetName = workbook.SheetNames[sheetIdx];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    console.log(`Extracted ${data.length} rows from ${filename}`);
    return data;
}

// 1. Inflation Volatility
const infVolData = parseXLSX('Inflation Volatility.xlsx');
console.log('Inf Vol Sample:', infVolData.slice(0, 1));

// 2. Real Policy Rate
const realRateData = parseXLSX('US Real Policy Rate.xlsx');
console.log('Real Rate Sample:', realRateData.slice(0, 1));

// Save to temp JSONs for the consolidation script
fs.writeFileSync(path.join(NEW_DATA_DIR, 'extracted_inf_vol.json'), JSON.stringify(infVolData, null, 2));
fs.writeFileSync(path.join(NEW_DATA_DIR, 'extracted_real_rate.json'), JSON.stringify(realRateData, null, 2));
console.log('Extracted XLSX data to temp JSONs.');
