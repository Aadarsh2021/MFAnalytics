import https from 'https';

/**
 * Government Data Fetcher for India
 * Fetches latest macro data from official Indian government sources
 * Falls back to FRED if government APIs fail
 */

// Known Resource IDs from data.gov.in (these may need periodic updates)
const DATA_GOV_RESOURCES = {
    // WPI - Wholesale Price Index (Base 2011-12)
    WPI_MONTHLY: '3ec97306-6962-4309-847c-65b161c1622b', // Common WPI resource

    // CPI - Consumer Price Index
    CPI_COMBINED: '9ef84268-d588-465a-a308-a864a43d0070', // CPI Combined

    // Note: These IDs may change. Check data.gov.in for latest IDs
};

// API Configuration
const DATA_GOV_API_BASE = 'https://api.data.gov.in/resource';
const DATA_GOV_API_KEY = process.env.DATA_GOV_IN_API_KEY || ''; // User needs to register

/**
 * Fetch data from data.gov.in API
 */
async function fetchDataGovIn(resourceId, limit = 100) {
    if (!DATA_GOV_API_KEY) {
        throw new Error('DATA_GOV_IN_API_KEY not set');
    }

    const url = `${DATA_GOV_API_BASE}/${resourceId}?api-key=${DATA_GOV_API_KEY}&format=json&limit=${limit}`;

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error(`Failed to parse data.gov.in response: ${e.message}`));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Fetch latest WPI from data.gov.in
 * Returns: { date, index, inflation } or null
 */
export async function fetchLatestWPI() {
    try {
        console.log('🇮🇳 Fetching WPI from data.gov.in...');
        const response = await fetchDataGovIn(DATA_GOV_RESOURCES.WPI_MONTHLY, 12);

        if (response && response.records && response.records.length > 0) {
            // Sort by date descending
            const sorted = response.records.sort((a, b) =>
                new Date(b.date || b.month) - new Date(a.date || b.month)
            );

            const latest = sorted[0];
            const yearAgo = sorted[11] || sorted[sorted.length - 1];

            // Calculate YoY inflation
            const inflation = yearAgo ?
                Number((((latest.index / yearAgo.index) - 1) * 100).toFixed(2)) :
                0;

            console.log(`   ✅ WPI fetched: ${inflation}% (${latest.date || latest.month})`);

            return {
                date: latest.date || latest.month,
                index: parseFloat(latest.index),
                inflation: inflation,
                source: 'data.gov.in'
            };
        }

        throw new Error('No WPI data found');
    } catch (e) {
        console.warn(`   ⚠️ data.gov.in WPI failed: ${e.message}`);
        return null;
    }
}

/**
 * Fetch latest CPI from data.gov.in
 * Returns: { date, index, inflation } or null
 */
export async function fetchLatestCPI() {
    try {
        console.log('🇮🇳 Fetching CPI from data.gov.in...');
        const response = await fetchDataGovIn(DATA_GOV_RESOURCES.CPI_COMBINED, 12);

        if (response && response.records && response.records.length > 0) {
            const sorted = response.records.sort((a, b) =>
                new Date(b.date || b.month) - new Date(a.date || b.month)
            );

            const latest = sorted[0];
            const yearAgo = sorted[11] || sorted[sorted.length - 1];

            const inflation = yearAgo ?
                Number((((latest.index / yearAgo.index) - 1) * 100).toFixed(2)) :
                0;

            console.log(`   ✅ CPI fetched: ${inflation}% (${latest.date || latest.month})`);

            return {
                date: latest.date || latest.month,
                index: parseFloat(latest.index),
                inflation: inflation,
                source: 'data.gov.in'
            };
        }

        throw new Error('No CPI data found');
    } catch (e) {
        console.warn(`   ⚠️ data.gov.in CPI failed: ${e.message}`);
        return null;
    }
}

/**
 * Check if data is recent (within N days)
 */
export function isDataRecent(dateStr, maxAgeDays = 45) {
    const dataDate = new Date(dateStr);
    const now = new Date();
    const ageMs = now - dataDate;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return ageDays <= maxAgeDays;
}
