import fs from 'fs';
import path from 'path';
import { detectRegime } from './src/utils/regimeDetector.js';

async function checkIndia() {
    const dataPath = path.resolve('data/processed/indiaMacroHistorical.json');
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    let previousProbs = null;
    let previousDominant = null;
    let history = [];
    const transitions = [];

    for (let i = 0; i < rawData.length; i++) {
        const macroPoint = rawData[i];
        const detection = detectRegime(macroPoint, previousProbs, previousDominant, history, 0.3);
        const currentRegime = detection.dominant;
        if (previousDominant && currentRegime !== previousDominant) {
            transitions.push({ date: macroPoint.date, from: previousDominant, to: currentRegime });
        }
        history.push(detection);
        previousProbs = detection.probabilities;
        previousDominant = currentRegime;
    }

    console.log(`India Total Transitions: ${transitions.length}`);
}

checkIndia().catch(console.error);
