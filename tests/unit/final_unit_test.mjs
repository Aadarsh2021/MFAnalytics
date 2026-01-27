import { normalizeDataset } from '../src/utils/macroDataProcessor.js';
import { detectRegime, getRegimeAllocationBands } from '../src/utils/regimeDetector.js';
import { backtestRegimePortfolio } from '../src/utils/backtestEngine.js';
import fs from 'fs';

console.log('🚀 Starting Final Unit Test Suite...\n');

// 1. Test Regime Detection Logic
console.log('--- Testing Regime Detector ---');
const testIndicators = {
    realRate: 2.5,          // High real rates -> Likely C or B
    debtStress: 1.5,       // High debt stress
    growth: -1.0,          // Negative growth
    volatilityRatio: 2.0   // High volatility
};

const detection = detectRegime(testIndicators);
console.log(`Input: Growth:-1.0, Vol:2.0, RealRate:2.5`);
console.log(`Detected: ${detection.dominant} (Confidence: ${(detection.confidence * 100).toFixed(1)}%)`);

if (detection.dominant === 'REGIME_C' || detection.dominant === 'REGIME_D') {
    console.log('✅ Correct: Stress/Crisis regime detected for high vol/low growth');
} else {
    console.log('❌ Unexpected Regime Detection result');
}

// 2. Test Allocation Bands
console.log('\n--- Testing Allocation Bands ---');
const bandsC = getRegimeAllocationBands('REGIME_C');
console.log(`Regime C Gold Target: ${(bandsC.GOLD.target * 100).toFixed(0)}%`);
if (bandsC.GOLD.target >= 0.10) {
    console.log('✅ Correct: Regime C (Fiscal Stress) has high gold allocation');
} else {
    console.log('❌ Regime C should have higher gold allocation');
}

// 3. Test Backtesting Math
console.log('\n--- Testing Backtest Engine Math ---');
const mockFunds = [{ code: 'FUND_A', name: 'Equity Fund' }, { code: 'FUND_B', name: 'Gold Fund' }];
const mockReturns = {
    codes: ['FUND_A', 'FUND_B'],
    returns: {
        'FUND_A': { '01-01-2024': 0.10, '01-02-2024': -0.05 },
        'FUND_B': { '01-01-2024': 0.05, '01-02-2024': 0.02 }
    }
};
const mockMacro = [
    { date: '2024-01-01', growth: 2.0, volatilityRatio: 0.5, realRate: 1.0 },
    { date: '2024-02-01', growth: -2.0, volatilityRatio: 3.0, realRate: 1.0 }
];

try {
    const btResults = backtestRegimePortfolio(mockFunds, mockReturns, mockMacro, '2024-01-01', '2024-02-01');
    console.log(`Backtest total return: ${(btResults.summary.totalReturn * 100).toFixed(2)}%`);
    console.log(`Backtest months: ${btResults.summary.totalMonths}`);

    if (btResults.summary.totalMonths === 2) {
        console.log('✅ Correct: Backtest processed expected number of months');
    } else {
        console.log(`❌ Expected 2 months, got ${btResults.summary.totalMonths}`);
    }
} catch (e) {
    console.log('❌ Backtest engine failed:', e.message);
}

console.log('\n✅ Final Unit Test Suite Completed.');
