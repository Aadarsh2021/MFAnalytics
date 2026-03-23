// Full Black-Litterman Model Implementation
// Based on: "The Black-Litterman Model: A Detailed Exploration" by Idzorek (2005)

import {
    matrixMultiply,
    transpose,
    matrixAdd,
    matrixScale,
    matrixInverse,
    matrixDiag,
    matrixIdentity,
    validateMatrix,
    validateWeights
} from './matrixOps.js'

// ============================================
// EQUILIBRIUM RETURNS (CAPM)
// ============================================

function calculateEquilibriumReturns(cov, marketWeights = null, riskAversion = 2.5) {
    /**
     * Calculate equilibrium returns using reverse optimization
     * Π = λ Σ w_mkt
     * 
     * @param {Array<Array<number>>} cov - Covariance matrix
     * @param {Array<number>} marketWeights - Market cap weights (null = equal weight)
     * @param {number} riskAversion - Risk aversion parameter λ
     * @returns {Array<number>} Equilibrium returns
     */

    const n = cov.length
    const wMkt = marketWeights || new Array(n).fill(1 / n)

    if (!marketWeights) {
        console.log("⚠️ No market weights provided, using Equal Weight:", wMkt)
    } else {
        console.log("✓ Using provided market weights:", wMkt)
    }

    // Π = λ Σ w_mkt
    const pi = matrixMultiply(cov, wMkt).map(x => x * riskAversion)

    return pi
}

// ============================================
// VIEW MATRICES
// ============================================

function createPickingMatrix(views, n) {
    /**
     * Create P matrix (k × n) where k = number of views
     * Each row represents one view
     * 
     * Absolute view: P[i][j] = 1 for asset j
     * Relative view: P[i][j] = 1, P[i][k] = -1 (j outperforms k)
     */

    const k = views.length
    const P = Array(k).fill(0).map(() => Array(n).fill(0))

    views.forEach((view, i) => {
        const type = view.type || 'absolute'
        if (type === 'absolute') {
            P[i][view.assetIdx] = 1
        } else if (type === 'relative') {
            P[i][view.asset1Idx] = 1
            P[i][view.asset2Idx] = -1
        }
    })

    return P
}

function createViewVector(views) {
    /**
     * Create Q vector (k × 1) of expected returns for each view
     * IMPORTANT: We convert Annual expected returns to Daily to match daily covariance
     */
    return views.map(v => {
        const annualReturn = v.expectedReturn || v.return || 0
        return annualReturn / 252
    })
}

function createViewUncertainty(views, P, cov, tau) {
    /**
     * Create Ω matrix (k × k) representing view uncertainty
     * 
     * Two approaches:
     * 1. Proportional: Ω = τ P Σ P^T (diagonal)
     * 2. Explicit confidence: Ω[i][i] = 1 / confidence[i]
     */

    const k = views.length
    const omega = Array(k).fill(0).map(() => Array(k).fill(0))

    // Calculate τ P Σ P^T
    const tauCov = matrixScale(cov, tau)
    const PSigma = matrixMultiply(P, tauCov)
    const PSigmaPT = matrixMultiply(PSigma, transpose(P))

    // Set diagonal elements
    const EPSILON = 1e-8
    for (let i = 0; i < k; i++) {
        const confidence = views[i].confidence || 0.5
        // Heuristic: Higher confidence = lower variance (Omega)
        // We use the proportional scaling by confidence
        // If confidence is 1.0 (100%), Omega -> 0 (view is forced)
        // If confidence is 0.0, Omega -> large (view is ignored)
        const scaleFactor = (1 - confidence) / Math.max(confidence, 0.01)
        omega[i][i] = PSigmaPT[i][i] * scaleFactor + 1e-6 // Stronger ridge for views
    }

    return omega
}

// ============================================
// BLACK-LITTERMAN POSTERIOR
// ============================================

export function calculateBlackLittermanPosterior(
    cov,
    views = [],
    options = {}
) {
    /**
     * Calculate Black-Litterman posterior expected returns
     */

    const {
        tau = 0.025,
        riskAversion = 2.5,
        marketWeights = null
    } = options

    const n = cov.length

    // 1. Calculate equilibrium returns (Π)
    // Pi is daily equilibrium return
    let pi = calculateEquilibriumReturns(cov, marketWeights, riskAversion)

    // Robustness: Clamp Pi to reasonable values to prevent crazy spikes
    // (No daily fund returns should be > 5% or < -5% on average equilibrium)
    pi = pi.map(p => Math.max(-0.05, Math.min(0.05, p)))

    // If no views, return equilibrium with Market Cap weights (if provided)
    if (views.length === 0) {
        // Use Market Cap weights directly if provided, otherwise optimize
        let weights
        if (marketWeights && marketWeights.length === n) {
            // Use Market Cap weights as-is (no optimization needed)
            weights = marketWeights
            console.log("No views set - using Market Cap weights directly:", weights)
        } else {
            // No Market Cap provided - calculate optimal weights from equilibrium
            weights = calculateOptimalWeights(cov, pi)
            console.log("No views and no Market Cap - using optimized equilibrium weights:", weights)
        }

        return {
            posterior: pi,
            equilibrium: pi,
            weights,
            tau,
            hasViews: false
        }
    }

    // 2. Create view matrices
    const P = createPickingMatrix(views, n)
    const Q = createViewVector(views)
    const Omega = createViewUncertainty(views, P, cov, tau)

    // 3. Calculate posterior expected returns
    // E[R] = [(τΣ)^-1 + P^T Ω^-1 P]^-1 [(τΣ)^-1 Π + P^T Ω^-1 Q]

    const tauCov = matrixScale(cov, tau)

    // Stability: Add epsilon to tauCov diagonal before inversion
    const n_size = tauCov.length
    for (let i = 0; i < n_size; i++) {
        tauCov[i][i] += 1e-6
    }
    validateMatrix(tauCov)

    const tauCovInv = matrixInverse(tauCov)
    const omegaInv = matrixInverse(Omega)

    // Term 1: (τΣ)^-1 + P^T Ω^-1 P
    const PT = transpose(P)
    const PTOmegaInv = matrixMultiply(PT, omegaInv)
    const PTOmegaInvP = matrixMultiply(PTOmegaInv, P)
    const term1 = matrixAdd(tauCovInv, PTOmegaInvP)

    // Term 2: (τΣ)^-1 Π + P^T Ω^-1 Q
    const tauCovInvPi = matrixMultiply(tauCovInv, pi)
    const PTOmegaInvQ = matrixMultiply(PTOmegaInv, Q)
    const term2 = matrixAdd(tauCovInvPi, PTOmegaInvQ)

    // Posterior: term1^-1 * term2
    // Stability: Add epsilon to term1 diagonal before inversion
    for (let i = 0; i < n; i++) {
        term1[i][i] += 1e-6
    }
    validateMatrix(term1)

    const term1Inv = matrixInverse(term1)
    const posterior = matrixMultiply(term1Inv, term2)

    // 4. Calculate optimal weights
    const weights = calculateOptimalWeights(cov, posterior)

    // 5. Calculate posterior covariance (optional, for uncertainty)
    // M = [(τΣ)^-1 + P^T Ω^-1 P]^-1
    const posteriorCov = term1Inv

    return {
        posterior,
        equilibrium: pi,
        weights,
        tau,
        riskAversion,
        P,
        Q,
        Omega,
        posteriorCov,
        hasViews: true
    }
}

// ============================================
// OPTIMAL WEIGHTS CALCULATION
// ============================================

function calculateOptimalWeights(cov, expectedReturns) {
    /**
     * Calculate optimal portfolio weights given expected returns
     * Unconstrained: w = Σ^-1 μ / (1^T Σ^-1 μ)
     * 
     * For constrained (w ≥ 0, Σw = 1), we use quadratic programming
     */

    const n = cov.length

    // Stability: Ensure cov is invertible
    const stableCov = cov.map((row, i) => row.map((val, j) => i === j ? val + 1e-6 : val))
    validateMatrix(stableCov)
    const covInv = matrixInverse(stableCov)

    // w = Σ^-1 μ
    let w = matrixMultiply(covInv, expectedReturns)

    // Normalize: w = w / (1^T w)
    const sum = w.reduce((a, b) => a + b, 0)
    w = w.map(wi => wi / sum)

    // Handle negative weights (project onto simplex)
    const hasNegative = w.some(wi => wi < -1e-8)
    if (hasNegative) {
        w = projectSimplexQP(w, cov)
    }

    // Validate
    validateWeights(w)

    return w
}

// ============================================
// SIMPLEX PROJECTION (for non-negative weights)
// ============================================

function projectSimplexQP(w, cov) {
    /**
     * Project weights onto simplex: w ≥ 0, Σw = 1
     * Minimize ||w - w_unconstrained||^2
     */

    const n = w.length
    let weights = new Array(n).fill(1 / n) // Start with equal weights

    // Gradient descent with projection
    for (let iter = 0; iter < 1000; iter++) {
        // Gradient of ||w - w_target||^2 = 2(w - w_target)
        const grad = weights.map((wi, i) => 2 * (wi - w[i]))

        // Update
        const lr = 0.01 / Math.sqrt(iter + 1)
        let newW = weights.map((wi, i) => wi - lr * grad[i])

        // Project onto simplex
        newW = projectSimplex(newW)

        // Check convergence
        const change = Math.sqrt(
            newW.reduce((sum, wi, i) => sum + (wi - weights[i]) ** 2, 0)
        )

        if (change < 1e-8) break

        weights = newW
    }

    return weights
}

function projectSimplex(w) {
    /**
     * Project onto simplex: w ≥ 0, Σw = 1
     * Using Duchi et al. algorithm
     */

    const n = w.length
    const sorted = w.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v)

    let cumSum = 0
    let rho = 0

    for (let i = 0; i < n; i++) {
        cumSum += sorted[i].v
        const theta = (cumSum - 1) / (i + 1)
        if (sorted[i].v > theta) {
            rho = i
        }
    }

    cumSum = 0
    for (let i = 0; i <= rho; i++) {
        cumSum += sorted[i].v
    }
    const theta = (cumSum - 1) / (rho + 1)

    const proj = new Array(n)
    for (let i = 0; i < n; i++) {
        proj[sorted[i].i] = Math.max(0, sorted[i].v - theta)
    }

    return proj
}

// ============================================
// HELPER: Calculate Portfolio Metrics
// ============================================

export function calculatePortfolioMetrics(weights, cov, expectedReturns) {
    /**
     * Calculate portfolio expected return and volatility
     */

    // Expected return: μ_p = w^T μ
    const expectedReturn = matrixMultiply(weights, expectedReturns)

    // Variance: σ²_p = w^T Σ w
    const wTCov = matrixMultiply(weights, cov)
    let variance = matrixMultiply(wTCov, weights)

    // Stability: Variance cannot be negative
    variance = Math.max(1e-12, variance)

    // Volatility (annualized)
    const volatility = Math.sqrt(variance * 252)

    // Sharpe ratio (assuming risk-free rate = 0)
    // Prevent division by zero
    const sharpeRatio = (volatility > 1e-10) ? (expectedReturn * 252) / volatility : 0

    return {
        expectedReturn: expectedReturn * 252, // Annualized
        volatility,
        variance: variance * 252,
        sharpeRatio
    }
}
