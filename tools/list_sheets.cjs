const XLSX = require('xlsx');
const filePath = 'c:/Users/thaku/Desktop/Work/MFP/data/temp_extracted/Data For Model/GDT-Tables_Q325_EN.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);
