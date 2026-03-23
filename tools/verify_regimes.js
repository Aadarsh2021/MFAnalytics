import { runRegimeSanityChecks } from './src/utils/regimeSanityChecks.js';

console.log('🧪 Running Regime Sanity Checks...');
const results = runRegimeSanityChecks();

console.log('\n----------------------------------------');
console.log(`Results: ${results.passedCount}/${results.totalCount} Passed`);
console.log('----------------------------------------\n');

results.results.forEach(res => {
    const icon = res.passed ? '✅' : '❌';
    console.log(`${icon} ${res.scenario}`);
    console.log(`   Expected: ${res.expected}`);
    console.log(`   Actual:   ${res.actual}`);
    if (!res.passed) {
        console.log(`   Probabilities:`, res.probabilities);
    }
    console.log('');
});

if (results.overallPassed) {
    console.log('🎉 ALL SANITY CHECKS PASSED!');
    process.exit(0);
} else {
    console.log('⚠️ SOME SANITY CHECKS FAILED.');
    process.exit(1);
}
