// CORS Proxy Configuration
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

/**
 * Fetch with CORS proxy
 * @param {string} url - Original URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function fetchWithProxy(url, options = {}) {
    try {
        // Try direct fetch first
        const response = await fetch(url, options);
        return response;
    } catch (error) {
        // If CORS error, use proxy
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
            console.log(`CORS issue detected, using proxy for: ${url}`);
            const proxiedUrl = CORS_PROXY + encodeURIComponent(url);
            return await fetch(proxiedUrl, options);
        }
        throw error;
    }
}

/**
 * Get MF API URL with proxy if needed
 * @param {string} endpoint - API endpoint
 * @returns {string}
 */
export function getMFApiUrl(endpoint) {
    const baseUrl = 'https://api.mfapi.in/mf';
    const fullUrl = endpoint ? `${baseUrl}/${endpoint}` : baseUrl;

    // Bypass proxy for now as allorigins/corsproxy are failing for large JSONs
    // mfapi.in supports CORS directly for most endpoints
    return fullUrl;
}
