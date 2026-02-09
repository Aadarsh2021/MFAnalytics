const XLSX = require('xlsx');
const filePath = 'c:/Users/thaku/Desktop/Work/MFP/data/temp_extracted/Data For Model/GDT-Tables_Q325_EN.xlsx';
const workbook = XLSX.readFile(filePath);

const name = 'Gold Prices';
const sheet = workbook.Sheets[name];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

rows.forEach((row, i) => {
    const s = JSON.stringify(row);
    if (s.includes('Q1')) console.log(`Price Sheet [${i}]: ${s.substring(0, 200)}`);
});
