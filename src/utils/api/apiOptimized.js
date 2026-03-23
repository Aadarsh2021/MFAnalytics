// Hardening Proxy Resilience for FRED/Macro Data
const PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.org/?url=${encodeURIComponent(url)}`, // New addition, usually reliable
];

export async function fetchWithProxy(targetUrl, options = {}) {
    let lastError;

    // Shuffle to avoid hitting the same failing one repeatedly
    const shuffledProxies = [...PROXIES].sort(() => Math.random() - 0.5);

    for (const wrapProxy of shuffledProxies) {
        try {
            const proxyUrl = wrapProxy(targetUrl);
            const response = await fetch(proxyUrl, {
                ...options,
                signal: AbortSignal.timeout(7000) // 7s timeout
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else if (response.status === 403 || response.status === 429) {
                console.warn(`Proxy ${wrapProxy.name || 'anonymous'} blocked (HTTP ${response.status})`);
            }
        } catch (e) {
            lastError = e;
            console.warn(`Proxy attempt failed, trying next...`);
        }
    }

    throw lastError || new Error(`No working proxy found for ${targetUrl}`);
}

// Request Cache for data fetching
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
    apiCache.set(key, { data, timestamp: Date.now() })
}

export async function fetchWithCache(url, options = {}) {
    const cacheKey = getCacheKey(url, options)
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    const response = await fetch(url, options)
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json()
    setCachedData(cacheKey, data)
    return data
}

export async function fetchBatch(items, fetcher, options = {}) {
    const { concurrency = 3, onProgress } = options
    const results = []
    const errors = []

    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency)
        const batchPromises = batch.map(async (item, idx) => {
            try {
                const data = await fetcher(item)
                onProgress && onProgress(i + idx + 1, items.length)
                return { success: true, data, item }
            } catch (error) {
                errors.push({ item, error: error.message })
                return { success: false, error: error.message, item }
            }
        })
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
    }
    return { results, errors }
}

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
