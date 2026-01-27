/**
 * Test Suite for Fund Categorization
 * Run this file to verify the categorization logic
 */

import {
    categorizeFund,
    categorizeFunds,
    groupFundsByCategory,
    getCategoryStats,
    getCategoryColor,
    validateCategorization
} from './fundCategorization.js';

// Sample fund names for testing
const testFunds = [
    // Equity Funds
    { name: 'HDFC Top 100 Fund - Direct Plan - Growth', schemeCode: '12345' },
    { name: 'SBI Large & Midcap Fund - Regular Plan - Growth', schemeCode: '12346' },
    { name: 'ICICI Prudential Bluechip Fund - Direct Plan - Growth', schemeCode: '12347' },
    { name: 'Axis Midcap Fund - Direct Plan - Growth', schemeCode: '12348' },
    { name: 'Kotak Small Cap Fund - Regular Plan - Growth', schemeCode: '12349' },
    { name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', schemeCode: '12350' },
    { name: 'Mirae Asset Large Cap Fund - Direct Plan - Growth', schemeCode: '12351' },
    { name: 'Nippon India Small Cap Fund - Direct Plan - Growth', schemeCode: '12352' },
    { name: 'Axis ELSS Tax Saver Fund - Direct Plan - Growth', schemeCode: '12353' },
    { name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth', schemeCode: '12354' },

    // Debt Funds
    { name: 'HDFC Corporate Bond Fund - Direct Plan - Growth', schemeCode: '22345' },
    { name: 'ICICI Prudential Liquid Fund - Direct Plan - Growth', schemeCode: '22346' },
    { name: 'SBI Magnum Gilt Fund - Direct Plan - Growth', schemeCode: '22347' },
    { name: 'Axis Short Duration Fund - Direct Plan - Growth', schemeCode: '22348' },
    { name: 'Kotak Banking & PSU Debt Fund - Direct Plan - Growth', schemeCode: '22349' },
    { name: 'UTI Ultra Short Duration Fund - Direct Plan - Growth', schemeCode: '22350' },
    { name: 'HDFC Low Duration Fund - Direct Plan - Growth', schemeCode: '22351' },
    { name: 'ICICI Prudential Money Market Fund - Direct Plan - Growth', schemeCode: '22352' },

    // Hybrid Funds
    { name: 'HDFC Balanced Advantage Fund - Direct Plan - Growth', schemeCode: '32345' },
    { name: 'ICICI Prudential Equity & Debt Fund - Direct Plan - Growth', schemeCode: '32346' },
    { name: 'SBI Equity Savings Fund - Direct Plan - Growth', schemeCode: '32347' },
    { name: 'Axis Dynamic Equity Fund - Direct Plan - Growth', schemeCode: '32348' },
    { name: 'Kotak Multi Asset Allocation Fund - Direct Plan - Growth', schemeCode: '32349' },
    { name: 'HDFC Retirement Savings Fund - Equity Plan - Direct Plan - Growth', schemeCode: '32350' },

    // Alternative Funds (should be categorized as Hybrid)
    { name: 'HDFC Gold Fund - Direct Plan - Growth', schemeCode: '42345' },
    { name: 'ICICI Prudential US Bluechip Equity Fund - Direct Plan - Growth', schemeCode: '42346' },
    { name: 'Nippon India ETF Gold BeES', schemeCode: '42347' },
    { name: 'Motilal Oswal Nasdaq 100 Fund of Fund - Direct Plan - Growth', schemeCode: '42348' },
    { name: 'DSP World Gold Fund - Direct Plan - Growth', schemeCode: '42349' },
    { name: 'Edelweiss Greater China Equity Offshore Fund - Direct Plan - Growth', schemeCode: '42350' },
];

console.log('='.repeat(80));
console.log('FUND CATEGORIZATION TEST SUITE');
console.log('='.repeat(80));
console.log('');

// Test 1: Individual Fund Categorization
console.log('TEST 1: Individual Fund Categorization');
console.log('-'.repeat(80));
testFunds.forEach(fund => {
    const category = categorizeFund(fund.name);
    const color = getCategoryColor(category);
    console.log(`${category.padEnd(10)} | ${fund.name}`);
});
console.log('');

// Test 2: Batch Categorization
console.log('TEST 2: Batch Categorization');
console.log('-'.repeat(80));
const categorizedFunds = categorizeFunds(testFunds);
console.log(`Total funds categorized: ${categorizedFunds.length}`);
console.log('');

// Test 3: Grouping by Category
console.log('TEST 3: Grouping by Category');
console.log('-'.repeat(80));
const grouped = groupFundsByCategory(categorizedFunds);
Object.keys(grouped).forEach(category => {
    console.log(`${category}: ${grouped[category].length} funds`);
    grouped[category].forEach(fund => {
        console.log(`  - ${fund.name || fund.schemeName}`);
    });
    console.log('');
});

// Test 4: Category Statistics
console.log('TEST 4: Category Statistics');
console.log('-'.repeat(80));
const stats = getCategoryStats(categorizedFunds);
console.log(`Total Funds: ${stats.total}`);
console.log(`Equity: ${stats.Equity.count} (${stats.Equity.percentage}%)`);
console.log(`Debt: ${stats.Debt.count} (${stats.Debt.percentage}%)`);
console.log(`Hybrid: ${stats.Hybrid.count} (${stats.Hybrid.percentage}%)`);
console.log(`Unknown: ${stats.Unknown.count} (${stats.Unknown.percentage}%)`);
console.log('');

// Test 5: Validation Tests
console.log('TEST 5: Validation Tests');
console.log('-'.repeat(80));
const validationTests = [
    { name: 'HDFC Equity Fund', expected: 'Equity' },
    { name: 'SBI Liquid Fund', expected: 'Debt' },
    { name: 'ICICI Balanced Advantage Fund', expected: 'Hybrid' },
    { name: 'Nippon India Gold Fund', expected: 'Hybrid' }, // Alternative -> Hybrid
    { name: 'Axis US Equity Fund', expected: 'Hybrid' }, // Alternative -> Hybrid
];

validationTests.forEach(test => {
    const isValid = validateCategorization(test.name, test.expected);
    const actual = categorizeFund(test.name);
    const status = isValid ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} | ${test.name}`);
    console.log(`       Expected: ${test.expected}, Actual: ${actual}`);
});
console.log('');

// Test 6: Color Codes
console.log('TEST 6: Category Color Codes');
console.log('-'.repeat(80));
['Equity', 'Debt', 'Hybrid', 'Unknown'].forEach(category => {
    const colors = getCategoryColor(category);
    console.log(`${category}:`);
    console.log(`  Background: ${colors.bg}`);
    console.log(`  Text: ${colors.text}`);
    console.log(`  Border: ${colors.border}`);
    console.log(`  Badge: ${colors.badge}`);
    console.log(`  Hex: ${colors.hex}`);
    console.log('');
});

console.log('='.repeat(80));
console.log('TEST SUITE COMPLETED');
console.log('='.repeat(80));
