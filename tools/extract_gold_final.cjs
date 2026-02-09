const XLSX = require('xlsx');
const filePath = 'c:/Users/thaku/Desktop/Work/MFP/data/temp_extracted/Data For Model/GDT-Tables_Q325_EN.xlsx';
const workbook = XLSX.readFile(filePath);

const name = 'Gold Balance';
const sheet = workbook.Sheets[name];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const years = rows[1];
const quarters = rows[2];
const data = rows[21];

const goldPurchases = [];
let currentYear = null;

for (let i = 1; i < data.length; i++) {
    if (years[i]) currentYear = years[i];
    const q = quarters[i];
    const val = data[i];

    if (currentYear && q && typeof q === 'string' && q.startsWith('Q')) {
        goldPurchases.push({ year: currentYear, quarter: q, value: val });
    }
}

console.log('--- EXTRACTED GOLD PURCHASES (TONNES) ---');
console.log(JSON.stringify(goldPurchases.slice(0, 20)));
console.log('Total data points:', goldPurchases.length);
console.log('Earliest:', goldPurchases[0]);
console.log('Latest:', goldPurchases[goldPurchases.length - 1]);
