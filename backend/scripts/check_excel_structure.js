import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath1 = 'c:/Users/thaku/Desktop/Work/MFP/Data_For_Model/GDT Tables_Q424_EN.xlsx';
const filePath2 = 'c:/Users/thaku/Desktop/Work/MFP/Data_For_Model/GDT-Tables_Q325_EN.xlsx';

try {
    const workbook1 = XLSX.readFile(filePath1);
    console.log('Sheets in Q424:', workbook1.SheetNames);

    // Check for "Gold" in sheet names
    const goldSheet = workbook1.SheetNames.find(s => s.toLowerCase().includes('gold'));
    if (goldSheet) {
        const data = XLSX.utils.sheet_to_json(workbook1.Sheets[goldSheet], { header: 1 });
        console.log('First 5 rows of Gold sheet in Q424:');
        console.log(JSON.stringify(data.slice(0, 5), null, 2));
    }

    const workbook2 = XLSX.readFile(filePath2);
    console.log('Sheets in Q325:', workbook2.SheetNames);
} catch (e) {
    console.error('Error reading Excel:', e);
}
