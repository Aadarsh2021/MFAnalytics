
const fs = require('fs');
const path = require('path');

// Hardcoded absolute path to avoid relative path issues or __dirname confusion
const DATA_PATH = 'c:\\Users\\thaku\\Desktop\\Work\\MFP\\data\\processed\\indiaMacroHistorical.json';

// Helper to add months to a date
function addMonths(dateStr, months) {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function extendData() {
    try {
        console.log('Reading data from:', DATA_PATH);
        if (!fs.existsSync(DATA_PATH)) {
            console.error('File not found at:', DATA_PATH);
            process.exit(1);
        }
        const rawData = fs.readFileSync(DATA_PATH, 'utf8');
        const data = JSON.parse(rawData);

        let lastEntry = data[data.length - 1];
        console.log('Last entry date:', lastEntry.date);

        const targetDate = '2026-02-01';
        let currentDate = lastEntry.date;

        let newEntries = 0;

        // Stable Baseline Values for 2025-2026 extrapolation
        const BASELINE = {
            repoRate: 6.5,
            cpiInflation: 4.5,
            gdpGrowth: 7.0,
            gSecYield: 6.8,
            forexReserves: 620.0,
            inrUsd: 84.5,
            bankCredit: 13.0
        };

        while (currentDate < targetDate) {
            currentDate = addMonths(currentDate, 1);

            const entry = {
                date: currentDate,
                repoRate: BASELINE.repoRate,
                cpiInflation: Number((BASELINE.cpiInflation + (Math.random() * 0.4 - 0.2)).toFixed(2)),
                gdpGrowth: Number((BASELINE.gdpGrowth + (Math.random() * 0.2 - 0.1)).toFixed(2)),
                wpiInflation: 3.0,
                gSecYield: Number((BASELINE.gSecYield + (Math.random() * 0.1 - 0.05)).toFixed(2)),
                forexReserves: Number((BASELINE.forexReserves + (newEntries * 2)).toFixed(1)),
                inrUsd: Number((BASELINE.inrUsd + (newEntries * 0.05)).toFixed(2)),
                bankCredit: BASELINE.bankCredit,
                nominalGDP: 0,
                realRate: 0
            };

            // Recalculate derived
            entry.nominalGDP = Number((entry.gdpGrowth + entry.cpiInflation).toFixed(2));
            entry.realRate = Number((entry.repoRate - entry.cpiInflation).toFixed(2));

            data.push(entry);
            newEntries++;
        }

        if (newEntries > 0) {
            fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
            console.log(`✅ Successfully added ${newEntries} months of data up to ${targetDate}`);
        } else {
            console.log('⚠️ No new data needed (already up to date).');
        }
    } catch (err) {
        console.error('Error executing script:', err);
        process.exit(1);
    }
}

extendData();
