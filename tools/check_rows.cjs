const XLSX = require('xlsx');
const filePath = 'c:/Users/thaku/Desktop/Work/MFP/data/temp_extracted/Data For Model/GDT-Tables_Q325_EN.xlsx';
const workbook = XLSX.readFile(filePath);

const name = 'Gold Prices';
const sheet = workbook.Sheets[name];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Row 1 (Headers):', JSON.stringify(rows[1].slice(50, 100)));
console.log('Row 2 (?) :', JSON.stringify(rows[2].slice(50, 100)));
console.log('Row 3 (?) :', JSON.stringify(rows[3].slice(50, 100)));
