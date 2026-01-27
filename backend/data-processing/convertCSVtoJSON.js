/**
 * CSV to JSON Converter for US Macro Data
 * Combines all CSV files from Data_For_Model into one comprehensive JSON
 */

const fs = require('fs');
const path = require('path');

// Helper to parse CSV
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',');

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((header, index) => {
            const value = values[index]?.trim();
            row[header.trim()] = value && !isNaN(value) ? parseFloat(value) : value;
        });
        if (row[headers[0]]) {  // Has date
            data.push(row);
        }
    }
    return data;
}

// Parse all files
const fedFunds = parseCSV('Data_For_Model/FED FUNDS EFFECTIVE RATE.csv');
const realGDP = parseCSV('Data_For_Model/Real GDP Raw Data.csv');
const sp500 = parseCSV('Data_For_Model/S&P 500 Historical Data.csv');
const bond10Y = parseCSV('Data_For_Model/United States 10-Year Bond Yield Historical Data.csv');
const debtGDP = parseCSV('Data_For_Model/FED DEBT to GDP.csv');
const cpiVol = parseCSV('Data_For_Model/US CPI Inflation Volatility.csv');

// Create unified monthly data structure
const combinedData = [];

// Use FED Funds as primary source (monthly data from 2002-2025)
fedFunds.forEach(row => {
    const date = row.Date;
    if (!date) return;

    // Parse date (format: 01-01-2002 or similar)
    const [month, day, year] = date.split('-');
    const isoDate = `${year}-${month.padStart(2, '0')}-01`;

    const entry = {
        date: isoDate,
        fedFundsRate: row.FEDFUNDS || row['USD Real Policy Rate'] || 0,
        cpiInflation: row.CPIAUCSL || 0,
        cpiChange: parseFloat((row['CPI Change'] || '0').replace('%', '')) || 0,
        realPolicyRate: row['USD Real Policy Rate'] || 0
    };

    // Find matching GDP (quarterly, so use closest)
    const gdpEntry = realGDP.find(g => {
        const gdpDate = new Date(g.observation_date);
        const entryDate = new Date(isoDate);
        return Math.abs(gdpDate - entryDate) < 90 * 24 * 60 * 60 * 1000; // Within 90 days
    });
    if (gdpEntry) {
        entry.realGDP = gdpEntry.GDPC1;
    }

    // Find S&P 500 data (might not have exact date, use closest)
    const spEntry = sp500.find(s => {
        if (!s.Date) return false;
        const spDate = s.Date.includes('-') ? s.Date : s.Date;
        return spDate.includes(isoDate.substring(0, 7)); // Match year-month
    });
    if (spEntry) {
        entry.sp500Close = spEntry.Close || spEntry.Price || 0;
        entry.sp500Volume = spEntry['Vol.'] || spEntry.Volume || 0;
    }

    // Find 10Y Bond Yield
    const bondEntry = bond10Y.find(b => {
        if (!b.Date) return false;
        return b.Date.includes(isoDate.substring(0, 7));
    });
    if (bondEntry) {
        entry.bond10YYield = bondEntry.Close || bondEntry.Price || 0;
    }

    combinedData.push(entry);
});

// Write to JSON
const outputPath = 'src/data/usMacroHistorical.json';
fs.writeFileSync(outputPath, JSON.stringify(combinedData, null, 2));

console.log(`✅ Created ${outputPath} with ${combinedData.length} monthly records`);
console.log(`📅 Date range: ${combinedData[0]?.date} to ${combinedData[combinedData.length - 1]?.date}`);
