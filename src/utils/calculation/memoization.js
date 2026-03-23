// Memoization utilities for expensive calculations

// ============================================
// MEMOIZATION CACHE
// ============================================

const memoCache = new Map()

export function memoize(fn, keyGenerator) {
    return function memoized(...args) {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

        if (memoCache.has(key)) {
            console.log(`Memo hit: ${fn.name}`)
            return memoCache.get(key)
        }

        console.log(`Memo miss: ${fn.name}`)
        const result = fn(...args)
        memoCache.set(key, result)

        return result
    }
}

// ============================================
// MEMOIZED COVARIANCE CALCULATION
// ============================================

export const calcCovarianceMemoized = memoize(
    function calcCovariance(returns) {
        // Import actual implementation
        const { calcCovariance } = require('./optimization.js')
        return calcCovariance(returns)
    },
    (returns) => {
        // Generate cache key from returns data
        const codes = returns.codes.join(',')
        const dateCount = returns.dates.length
        return `cov:${codes}:${dateCount}`
    }
)

// ============================================
// MEMOIZED MATRIX OPERATIONS
// ============================================

import { matrixInverse as originalInverse } from './matrixOps.js'

export const matrixInverseMemoized = memoize(
    originalInverse,
    (matrix) => {
        // Generate key from matrix values
        return `inv:${matrix.map(row => row.join(',')).join(';')}`
    }
)

// ============================================
// BATCH PROCESSING
// ============================================

export function processBatch(items, processor, batchSize = 10) {
    /**
     * Process items in batches to avoid blocking UI
     */
    return new Promise((resolve) => {
        const results = []
        let currentIndex = 0

        function processNext() {
            const batch = items.slice(currentIndex, currentIndex + batchSize)

            batch.forEach(item => {
                results.push(processor(item))
            })

            currentIndex += batchSize

            if (currentIndex < items.length) {
                // Use setTimeout to yield to UI
                setTimeout(processNext, 0)
            } else {
                resolve(results)
            }
        }

        processNext()
    })
}

// ============================================
// CLEAR MEMO CACHE
// ============================================

export function clearMemoCache() {
    memoCache.clear()
    console.log('Memoization cache cleared')
}

export function getMemoStats() {
    return {
        size: memoCache.size,
        keys: Array.from(memoCache.keys()).slice(0, 10) // First 10 keys
    }
}
