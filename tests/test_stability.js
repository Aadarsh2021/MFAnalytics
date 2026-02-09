
import { calculateBlackLittermanPosterior, calculatePortfolioMetrics } from '../src/utils/blackLitterman.js';
import { calculateAllMVP } from '../src/utils/optimization.js';

// 1. Test case: Singular Covariance Matrix (Two identical assets)
const covSingular = [
    [0.01, 0.01],
    [0.01, 0.01]
];

const returnsSingular = {
    codes: ['F1', 'F2'],
    dates: ['2024-01-01', '2024-01-02'],
    returns: {
        'F1': { '2024-01-01': 0.001, '2024-01-02': 0.002 },
        'F2': { '2024-01-01': 0.001, '2024-01-02': 0.002 }
    }
};

console.log("--- TEST 1: Singular Matrix Inversion ---");
try {
    const views = [{ type: 'absolute', assetIdx: 0, return: 0.1, confidence: 0.5 }];
    const result = calculateBlackLittermanPosterior(covSingular, views, { tau: 0.025 });
    console.log("✅ Success! Black-Litterman handled singular matrix.");
} catch (e) {
    console.error("❌ Failed: Black-Litterman still throws on singular matrix:", e.message);
}

// 2. Test case: Zero Variance Asset
const covZero = [
    [0.01, 0],
    [0, 0] // Asset 2 has zero variance
];
const returnsZero = {
    codes: ['F1', 'F2'],
    dates: ['2024-01-01', '2024-01-02'],
    returns: {
        'F1': { '2024-01-01': 0.001, '2024-01-02': 0.002 },
        'F2': { '2024-01-01': 0, '2024-01-02': 0 } // No return
    }
};

console.log("\n--- TEST 2: Zero Variance Fallback ---");
try {
    const mvp = calculateAllMVP(returnsZero);
    console.log("✅ Success! All MVP methods returned without crashing.");
    console.log("SQP weights:", mvp.sqp.weights);
    console.log("Critical weights:", mvp.critical.weights);
} catch (e) {
    console.error("❌ Failed: MVP calculation crashed on zero variance:", e.message);
}

// 3. Test case: Portfolio Metrics Stability
console.log("\n--- TEST 3: Portfolio Metrics Stability (Div by Zero) ---");
try {
    const metrics = calculatePortfolioMetrics([1, 0], [[0, 0], [0, 0]], [0, 0]);
    console.log("✅ Success! Metrics handled zero volatility.");
    console.log("Sharpe Ratio:", metrics.sharpeRatio);
} catch (e) {
    console.error("❌ Failed: Metrics calculation threw error:", e.message);
}

console.log("\nVerification Complete.");
