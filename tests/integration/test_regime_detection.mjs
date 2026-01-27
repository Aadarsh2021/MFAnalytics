import { detectRegime } from '../src/utils/regimeDetector.js';
import { normalizeDataset } from '../src/utils/macroDataProcessor.js';
import fs from 'fs';

const usMacroHistorical = JSON.parse(fs.readFileSync('./src/data/usMacroHistorical.json', 'utf8'));

// Normalize the entire dataset
const normalizedData = normalizeDataset(usMacroHistorical, 60);

const keyDates = [
    { date: '2008-09-01', event: 'Lehman Collapse (Regime D Expected)' },
    { date: '2012-01-01', event: 'Recovery / Stable Growth (Regime A/B Expected)' },
    { date: '2020-04-01', event: 'COVID Lockdown (Regime D Expected)' },
    { date: '2021-06-01', event: 'Post-COVID Stimulus (Regime B Expected)' },
    { date: '2022-10-01', event: 'Tightening Cycle (Regime C/D Expected)' }
];

console.log('--- Historical Regime Validation (Full Indicators) ---');

keyDates.forEach(k => {
    const dataPoint = normalizedData.find(d => d.date >= k.date);
    if (dataPoint) {
        const detection = detectRegime(dataPoint);
        console.log(`\nDate: ${dataPoint.date} (${k.event})`);
        console.log(`Detected: ${detection.dominant}`);
        console.log(`Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
        console.log(`Indicator Z-Scores:`);
        Object.entries(dataPoint).forEach(([key, val]) => {
            if (key !== 'date') console.log(`  ${key}: ${val.toFixed(2)}`);
        });
        console.log(`Probabilities: A: ${detection.probabilities.REGIME_A.toFixed(2)}, B: ${detection.probabilities.REGIME_B.toFixed(2)}, C: ${detection.probabilities.REGIME_C.toFixed(2)}, D: ${detection.probabilities.REGIME_D.toFixed(2)}`);
    } else {
        console.log(`\nDate: ${k.date} - NOT FOUND`);
    }
});
