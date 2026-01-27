import { detectRegime } from '../src/utils/regimeDetector.js';
import { normalizeDataset } from '../src/utils/macroDataProcessor.js';
import fs from 'fs';

const usMacroHistorical = JSON.parse(fs.readFileSync('./src/data/usMacroHistorical.json', 'utf8'));

// Normalize the entire dataset
const normalizedData = normalizeDataset(usMacroHistorical, 60);

const keyDates = [
    { date: '2008-09-01', event: 'Lehman' },
    { date: '2012-01-01', event: 'Growth' },
    { date: '2020-04-01', event: 'COVID' },
    { date: '2021-06-01', event: 'Inflation' },
    { date: '2022-10-01', event: 'Tightening' }
];

keyDates.forEach(k => {
    const d = normalizedData.find(dp => dp.date >= k.date);
    if (d) {
        const det = detectRegime(d);
        console.log(`${d.date} | ${k.event} | Detected: ${det.dominant} | Conf: ${det.confidence.toFixed(2)}`);
    }
});
