// Simple test to verify fund categorization logic
// Run with: node testCategorization.js

const EQUITY_KEYWORDS = [
    'equity', 'stock', 'large cap', 'mid cap', 'small cap', 'multi cap', 'flexi cap',
    'focused', 'sectoral', 'thematic', 'infrastructure', 'banking', 'pharma', 'technology',
    'index', 'nifty', 'sensex', 'elss', 'tax saver', 'bluechip'
];

const DEBT_KEYWORDS = [
    'debt', 'bond', 'income', 'gilt', 'liquid', 'money market', 'ultra short',
    'low duration', 'short duration', 'medium duration', 'long duration',
    'dynamic bond', 'corporate bond', 'credit risk', 'banking & psu'
];

const HYBRID_KEYWORDS = [
    'hybrid', 'balanced', 'aggressive hybrid', 'conservative hybrid',
    'dynamic asset allocation', 'multi asset', 'equity savings',
    // Alternative funds
    'alternative', 'gold', 'silver', 'commodity', 'real estate', 'reit',
    'fund of funds', 'fof', 'international', 'global', 'overseas',
    'us equity', 'nasdaq', 'etf'
];

function categorizeFund(fundName) {
    if (!fundName) return 'Unknown';
    const nameLower = fundName.toLowerCase();

    const equityMatch = EQUITY_KEYWORDS.some(k => nameLower.includes(k));
    const debtMatch = DEBT_KEYWORDS.some(k => nameLower.includes(k));
    const hybridMatch = HYBRID_KEYWORDS.some(k => nameLower.includes(k));

    if (equityMatch && (debtMatch || hybridMatch)) return 'Hybrid';
    if (equityMatch) return 'Equity';
    if (debtMatch) return 'Debt';
    if (hybridMatch) return 'Hybrid';
    return 'Unknown';
}

// Test cases
const testFunds = [
    'HDFC Top 100 Fund - Direct Plan - Growth',
    'SBI Large & Midcap Fund - Regular Plan - Growth',
    'ICICI Prudential Liquid Fund - Direct Plan - Growth',
    'Axis Short Duration Fund - Direct Plan - Growth',
    'HDFC Balanced Advantage Fund - Direct Plan - Growth',
    'SBI Equity Savings Fund - Direct Plan - Growth',
    'HDFC Gold Fund - Direct Plan - Growth',
    'ICICI Prudential US Bluechip Equity Fund - Direct Plan - Growth',
    'Nippon India ETF Gold BeES',
    'Motilal Oswal Nasdaq 100 Fund of Fund - Direct Plan - Growth'
];

console.log('\n=== FUND CATEGORIZATION TEST ===\n');
testFunds.forEach(fund => {
    const category = categorizeFund(fund);
    console.log(`${category.padEnd(10)} | ${fund}`);
});
console.log('\n=== TEST COMPLETE ===\n');
