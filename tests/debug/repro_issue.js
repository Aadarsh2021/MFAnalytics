import { calculateBlackLitterman } from '../src/utils/optimization.js'

async function runTest() {
    try {
        console.log('\n--- Black-Litterman Repro ---')
        const returns = {
            codes: ['A', 'B'],
            dates: [0, 1, 2, 3, 4],
            returns: {
                'A': { 0: 0.05, 1: -0.02, 2: 0.04, 3: -0.01, 4: 0.03 },
                'B': { 0: 0.01, 1: 0.01, 2: -0.02, 3: 0.02, 4: -0.01 }
            }
        }

        const views = [{
            assetIdx: 0,
            return: 0.15,
            confidence: 0.9
        }]

        console.log("Calling calculateBlackLitterman...")
        const blResult = calculateBlackLitterman(returns, views)

        console.log("Result:", blResult)

    } catch (e) {
        console.error('❌ Black-Litterman Test Threw Error:', e)
        console.error(e.stack)
    }
}

runTest()
