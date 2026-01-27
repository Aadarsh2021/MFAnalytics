/**
 * Fetch Indian Macro Data from RBI Database on Indian Economy
 * Run: node scripts/fetchIndianMacroData.mjs
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

// RBI DBIE API endpoints (CSV export format)
// Note: RBI doesn't have a pure REST API, so we'll use their CSV export URLs
const RBI_BASE = 'https://dbie.rbi.org.in/DBIE/dbie.rbi';

/**
 * Indian Macro Indicators Configuration
 */
const INDIAN_INDICATORS = {
    // Policy Rate (Repo Rate)
    repoRate: {
        url: `${RBI_BASE}?site=statistics`,
        tableCode: '2',
        seriesCode: 'Repo_Rate',
        description: 'RBI Repo Rate'
    },
    // GDP Growth (Quarterly, need to interpolate)
    gdpGrowth: {
        url: `${RBI_BASE}?site=statistics`,
        tableCode: '41',
        seriesCode: 'GDP_Growth_YoY',
        description: 'Real GDP Growth Rate'
    },
    // CPI Inflation
    cpiInflation: {
        url: `${RBI_BASE}?site=statistics`,
        tableCode: '36',
        seriesCode: 'CPI_Combined',
        description: 'Consumer Price Index'
    },
    // WPI Inflation
    wpiInflation: {
        url: `${RBI_BASE}?site=statistics`,
        tableCode: '38',
        seriesCode: 'WPI_All',
        description: 'Wholesale Price Index'
    },
    // 10Y G-Sec Yield
    gSecYield: {
        url: `${RBI_BASE}?site=statistics`,
        tableCode: '19',
        seriesCode: 'GSEC_10Y',
        description: '10-Year Government Securities Yield'
    },
    // Foreign Reserves
    forexReserves: {
        url: `${RBI_BASE}?site=statistics`,
        tableCode: '5',
        seriesCode: 'FX_Reserves',
        description: 'Foreign Exchange Reserves'
    },
    // INR/USD Exchange Rate
    inrUsd: {
        url: `${RBI_BASE}?site=statistics`,
        tableCode: '9',
        seriesCode: 'INR_USD',
        description: 'INR/USD Exchange Rate'
    },
    // Bank Credit Growth
    bankCredit: {
        url: `${RBI_BASE}?site=statistics`,
        tableCode: '14',
        seriesCode: 'Bank_Credit',
        description: 'Scheduled Commercial Banks Credit'
    }
};

/**
 * Alternative: Use data.gov.in APIs for some indicators
 * This is a more reliable programmatic approach
 */
const DATA_GOV_IN_APIS = {
    cpiInflation: 'https://api.data.gov.in/resource/...',  // Replace with actual resource ID
    // Add more as needed
};

console.log('⚠️  RBI Data Fetch Script');
console.log('='.repeat(60));
console.log('NOTE: RBI does not provide a public REST API for DBIE data.');
console.log('This script demonstrates the structure needed.');
console.log('');
console.log('👉 RECOMMENDED APPROACH:');
console.log('1. Manually download CSV files from https://dbie.rbi.org.in');
console.log('2. Place them in data/india/ folder');
console.log('3. Run consolidateIndianMacro.mjs to process them');
console.log('');
console.log('OR');
console.log('');
console.log('Use external API aggregators like:');
console.log('- tradingeconomics.com/india/indicators');
console.log('- quandl.com (CEIC India Data)');
console.log('='.repeat(60));

/**
 * For demonstration: Create a sample Indian macro dataset
 * In production, you would fetch this from APIs or process CSVs
 */
function generateSampleIndianData() {
    console.log('\\n📊 Generating sample Indian macro dataset...');

    const startDate = new Date('2002-01-01');
    const endDate = new Date('2025-12-01');
    const data = [];

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Simulate Indian economic cycles
        const cycle = Math.sin((year - 2002) * 0.5);
        const crisis2008 = (year === 2008 || year === 2009) ? -2 : 0;
        const covid2020 = (year === 2020) ? -5 : 0;
        const tightening2022 = (year >= 2022 && year <= 2023) ? 1.5 : 0;

        data.push({
            date: currentDate.toISOString().slice(0, 10),

            // Repo Rate (4% to 6.5% typical range)
            repoRate: 5.5 + cycle * 1.5 + tightening2022,

            // GDP Growth (3% to 8.5% range)
            gdpGrowth: 6.5 + cycle * 2 + crisis2008 + covid2020,

            // CPI Inflation (2% to 7% range)
            cpiInflation: 4.5 + cycle * 1.5 + (year >= 2022 ? 1 : 0),

            // WPI Inflation (can be more volatile)
            wpiInflation: 5.0 + cycle * 2.5 + (year >= 2021 ? 2 : 0),

            // 10Y G-Sec Yield (6% to 8% range)
            gSecYield: 7.0 + cycle * 1.0 + tightening2022 * 0.5,

            // Foreign Reserves (in billion USD, growing trend)
            forexReserves: 100 + (year - 2002) * 15 + cycle * 20,

            // INR/USD (40 to 83 range, depreciating trend)
            inrUsd: 45 + (year - 2002) * 1.5 + cycle * 2 + (crisis2008 * 2),

            // Bank Credit Growth (10% to 18% range)
            bankCredit: 14 + cycle * 3 + crisis2008 * -5 + covid2020 * -3
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return data;
}

// Generate sample data
const indianMacroData = generateSampleIndianData();

// Save to file
const outputPath = path.join(process.cwd(), 'src', 'data', 'indiaMacroHistorical.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(indianMacroData, null, 2));

console.log(`\\n✅ Sample Indian macro data generated: ${outputPath}`);
console.log(`📅 Date range: ${indianMacroData[0].date} to ${indianMacroData[indianMacroData.length - 1].date}`);
console.log(`📊 Total data points: ${indianMacroData.length} months`);
console.log(`\\n⚠️  IMPORTANT: This is SAMPLE DATA for development.`);
console.log(`   For production use, replace with actual RBI data.`);
