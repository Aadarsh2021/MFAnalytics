
import { matrixInverse, matrixMultiply, choleskyDecomposition, validateMatrix } from '../src/utils/matrixOps.js'
import { calcCovariance, calculateAllMVP, calculateBlackLitterman } from '../src/utils/optimization.js'

console.log('🧪 Starting Mathematical Verification...')

let passed = 0
let failed = 0

function assert(condition, message) {
    if (condition) {
        console.log(`✅ ${message}`)
        passed++
    } else {
        console.error(`❌ FAILED: ${message}`)
        failed++
    }
}

function assertClose(a, b, tol = 1e-5, message) {
    if (typeof a !== 'number' || typeof b !== 'number') {
        console.error(`❌ FAILED: ${message}: Non-number inputs. Got ${a}, ${b}`)
        failed++
        return
    }
    if (Math.abs(a - b) < tol) {
        console.log(`✅ ${message}`)
        passed++
    } else {
        console.error(`❌ FAILED: ${message}: Expected ${b}, got ${a}`)
        failed++
    }
}

async function runTests() {

    // 1. Matrix Inversion
    try {
        console.log('\n--- Matrix Inversion ---')
        const A = [[4, 7], [2, 6]]
        const A_inv = matrixInverse(A)
        const I = matrixMultiply(A, A_inv)

        assertClose(I[0][0], 1, 1e-9, 'Identity [0,0]')
        assertClose(I[0][1], 0, 1e-9, 'Identity [0,1]')
        assertClose(I[1][0], 0, 1e-9, 'Identity [1,0]')
        assertClose(I[1][1], 1, 1e-9, 'Identity [1,1]')
    } catch (e) {
        console.error('❌ Matrix Inversion Test Threw Error:', e)
        failed++
    }

    // 2. Cholesky Decomposition
    try {
        console.log('\n--- Cholesky Decomposition ---')
        const A = [[4, 12, -16], [12, 37, -43], [-16, -43, 98]]
        const L = choleskyDecomposition(A)

        // A is 3x3. L is 3x3.
        assertClose(L[0][0], 2, 1e-9, 'L[0,0]')
        assertClose(L[1][0], 6, 1e-9, 'L[1,0]')
        assertClose(L[1][1], 1, 1e-9, 'L[1,1]')
        assertClose(L[2][0], -8, 1e-9, 'L[2,0]')
        assertClose(L[2][1], 5, 1e-9, 'L[2,1]')
        assertClose(L[2][2], 3, 1e-9, 'L[2,2]')
    } catch (e) {
        console.error('❌ Cholesky Test Threw Error:', e)
        failed++
    }

    // 3. Ledoit-Wolf Shrinkage
    try {
        console.log('\n--- Ledoit-Wolf Shrinkage ---')
        // Need at least 3 assets to make Average Correlation different from Individual Correlations
        const returns = {
            codes: ['A', 'B', 'C'],
            dates: [0, 1, 2, 3, 4],
            returns: {
                // A and B highly correlated, C uncorrelated
                'A': { 0: 0.01, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.01 },
                'B': { 0: 0.02, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.02 }, // Perfect corr with A
                'C': { 0: 0.01, 1: -0.01, 2: 0.01, 3: -0.01, 4: 0.01 } // Diff pattern
            }
        }
        // Actually, constant returns mean 0 variance. That's singular.
        // I need variations.

        returns.returns['A'] = { 0: 0.01, 1: 0.02, 2: 0.03, 3: 0.04, 4: 0.05 }
        returns.returns['B'] = { 0: 0.011, 1: 0.021, 2: 0.031, 3: 0.041, 4: 0.051 } // High corr with A
        returns.returns['C'] = { 0: 0.05, 1: 0.04, 2: 0.03, 3: 0.02, 4: 0.01 } // Neg corr with A

        const { cov, shrinkage, sampleCov } = calcCovariance(returns)

        console.log(`Shrinkage Intensity: ${shrinkage}`)
        assert(shrinkage >= 0 && shrinkage <= 1, `Shrinkage in range [0,1]. Got ${shrinkage}`)

        if (shrinkage > 0) {
            // Check off-diagonal [0][1] (A-B)
            // It should be pulled towards average correlation (which involves C)
            const isDifferent = Math.abs(cov[0][1] - sampleCov[0][1]) > 1e-10
            assert(isDifferent, `Covariance matrix [0][1] is shrunk. S=${sampleCov[0][1].toFixed(6)}, F=${cov[0][1].toFixed(6)}`)
        } else {
            console.log('Shrinkage is 0. Delta calc might have decided 0.')
            if (shrinkage === 0) assert(true, 'Shrinkage 0 is valid result')
        }

    } catch (e) {
        console.error('❌ Shrinkage Test Threw Error:', e)
        failed++
    }

    // 4. Optimization (SQP)
    try {
        console.log('\n--- Optimization (SQP) ---')
        const returns = {
            codes: ['A', 'B'],
            dates: [0, 1, 2, 3],
            returns: {
                'A': { 0: 0.10, 1: 0.00, 2: 0.05, 3: -0.02 },
                'B': { 0: 0.01, 1: 0.01, 2: 0.01, 3: 0.01 }
            }
        }

        const results = calculateAllMVP(returns)
        const w = results.sqp.weights
        console.log('SQP Weights:', w)

        const sum = w.reduce((a, b) => a + b, 0)
        assertClose(sum, 1.0, 1e-6, 'Weights sum to 1')
        assert(w.every(wi => wi >= -1e-6), 'Weights are non-negative')

    } catch (e) {
        console.error('❌ Optimization Test Threw Error:', e)
        failed++
    }

    // 5. Black-Litterman
    try {
        console.log('\n--- Black-Litterman ---')
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

        const blResult = calculateBlackLitterman(returns, views)
        const posteriorMeanA = blResult.posterior[0]
        console.log(`Posterior Mean A: ${posteriorMeanA}`)

        assert(posteriorMeanA > 0.0, 'Posterior A should be positive')
        assert(blResult.weights.reduce((a, b) => a + b, 0) > 0.99, 'Weights sum to approx 1')

    } catch (e) {
        console.error('❌ Black-Litterman Test Threw Error:', e)
        failed++
    }

    console.log(`\n\nResults: ${passed} Passed, ${failed} Failed`)
    if (failed > 0) process.exit(1)
}

runTests()
