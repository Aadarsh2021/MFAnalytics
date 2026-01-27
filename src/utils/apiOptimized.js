// Performance-Optimized API Utilities

// ============================================
// REQUEST CACHE
// ============================================

const apiCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCacheKey(url, params = {}) {
    return `${url}:${JSON.stringify(params)}`
}

function getCachedData(key) {
    const cached = apiCache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > CACHE_DURATION) {
        apiCache.delete(key)
        return null
    }

    return cached.data
}

function setCachedData(key, data) {
    apiCache.set(key, {
        data,
        timestamp: Date.now()
    })
}

// ============================================
// OPTIMIZED FETCH WITH CACHING
// ============================================

export async function fetchWithCache(url, options = {}) {
    const cacheKey = getCacheKey(url, options)

    // Check cache first
    const cached = getCachedData(cacheKey)
    if (cached) {
        console.log(`Cache hit: ${url}`)
        return cached
    }

    // Fetch from API
    console.log(`Cache miss: ${url}`)
    const response = await fetch(url, options)

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // Cache the result
    setCachedData(cacheKey, data)

    return data
}

// ============================================
// PARALLEL BATCH FETCHING
// ============================================

export async function fetchBatch(urls, options = {}) {
    /**
     * Fetch multiple URLs in parallel with concurrency limit
     */
    const { concurrency = 5, onProgress } = options

    const results = []
    const errors = []

    // Process in batches
    for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency)

        const batchPromises = batch.map(async (url, idx) => {
            try {
                const data = await fetchWithCache(url)
                onProgress && onProgress(i + idx + 1, urls.length)
                return { success: true, data, url }
            } catch (error) {
                errors.push({ url, error: error.message })
                return { success: false, error: error.message, url }
            }
        })

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
    }

    return { results, errors }
}

// ============================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================

export async function fetchWithRetry(url, options = {}) {
    const { maxRetries = 3, baseDelay = 1000 } = options

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fetchWithCache(url, options)
        } catch (error) {
            if (attempt === maxRetries) {
                throw error
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = baseDelay * Math.pow(2, attempt)
            console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`)
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }
}

// ============================================
// DEBOUNCED SEARCH
// ============================================

export function debounce(func, wait = 300) {
    let timeout

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }

        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

// ============================================
// OPTIMIZED FUND SEARCH
// ============================================

export async function searchFunds(query, options = {}) {
    if (!query || query.length < 2) {
        return []
    }

    const url = `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`

    try {
        const data = await fetchWithCache(url)

        // Limit results for performance
        const { limit = 50 } = options
        return data.slice(0, limit)
    } catch (error) {
        console.error('Search failed:', error)
        return []
    }
}

// ============================================
// OPTIMIZED NAV FETCHING
// ============================================

export async function fetchAllNAVData(funds, onProgress) {
    /**
     * Fetch NAV data for multiple funds in parallel
     */
    const urls = funds.map(fund =>
        `https://api.mfapi.in/mf/${fund.code || fund.schemeCode}`
    )

    const { results, errors } = await fetchBatch(urls, {
        concurrency: 5, // Limit concurrent requests
        onProgress
    })

    // Convert to object keyed by fund code
    const allData = {}
    results.forEach((result, idx) => {
        if (result.success && result.data.data) {
            const fund = funds[idx]
            const code = fund.code || fund.schemeCode
            allData[code] = {
                name: fund.name || fund.schemeName,
                data: result.data.data,
                meta: result.data.meta
            }
        }
    })

    return { allData, errors }
}

// ============================================
// CLEAR CACHE (for testing/refresh)
// ============================================

export function clearCache() {
    apiCache.clear()
    console.log('API cache cleared')
}

export function getCacheStats() {
    return {
        size: apiCache.size,
        keys: Array.from(apiCache.keys())
    }
}
