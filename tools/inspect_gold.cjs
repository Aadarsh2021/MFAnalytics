const XLSX = require('xlsx');
const filePath = 'c:/Users/thaku/Desktop/Work/MFP/data/temp_extracted/Data For Model/GDT-Tables_Q325_EN.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('Sheets:', workbook.SheetNames);
const priceSheet = workbook.Sheets['Gold Prices'];
if (priceSheet) {
    const rows = XLSX.utils.sheet_to_json(priceSheet, { header: 1 });
    console.log('First 20 rows of Gold Prices:');
    rows.slice(0, 20).forEach((r, i) => console.log(`${i}:`, r));
}
