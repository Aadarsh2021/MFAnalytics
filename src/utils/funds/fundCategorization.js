/**
 * Improved Fund Categorization using MFApi SEBI Categories
 * Fetches actual category data from MFApi instead of keyword matching
 */

// Cache for fund categories to avoid repeated API calls
const categoryCache = new Map();
const CATEGORY_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch fund details including SEBI category from MFApi
 * @param {string} schemeCode - Fund scheme code
 * @returns {Promise<Object>} - Fund details with category
 */
export async function fetchFundCategory(schemeCode) {
    // Check cache first
    const cached = categoryCache.get(schemeCode);
    if (cached && (Date.now() - cached.timestamp < CATEGORY_CACHE_DURATION)) {
        return cached.data;
    }

    try {
        const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        const result = {
            schemeCode: data.meta?.scheme_code || schemeCode,
            schemeName: data.meta?.scheme_name || '',
            sebiCategory: data.meta?.scheme_category || 'Unknown',
            fundHouse: data.meta?.fund_house || '',
            category: mapSEBICategoryToSimple(data.meta?.scheme_category || '', data.meta?.scheme_name || '')
        };

        // Cache the result
        categoryCache.set(schemeCode, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
        console.error(`Failed to fetch category for ${schemeCode}:`, error);
        // Fallback to keyword-based if API fails
        return {
            schemeCode,
            schemeName: '',
            sebiCategory: 'Unknown',
            fundHouse: '',
            category: 'Unknown'
        };
    }
}

/**
 * Master SEBI Category Mapping
 * Maps official SEBI sub-categories to our Simplified Categories
 */
const SEBI_MAP = {
    // Equity
    'Multi Cap Fund': 'Equity',
    'Large Cap Fund': 'Equity',
    'Large & Mid Cap Fund': 'Equity',
    'Mid Cap Fund': 'Equity',
    'Small Cap Fund': 'Equity',
    'Flexi Cap Fund': 'Equity',
    'Focused Fund': 'Equity',
    'Value Fund': 'Equity',
    'Contra Fund': 'Equity',
    'Dividend Yield Fund': 'Equity',
    'Sectoral/ Thematic Fund': 'Equity',
    'Sectoral/Thematic Fund': 'Equity',
    'Sectoral': 'Equity',
    'Thematic': 'Equity',
    'ELSS': 'Equity',
    'Equity Linked Savings Scheme': 'Equity',

    // Debt
    'Overnight Fund': 'Debt',
    'Liquid Fund': 'Debt',
    'Ultra Short Duration Fund': 'Debt',
    'Low Duration Fund': 'Debt',
    'Money Market Fund': 'Debt',
    'Short Duration Fund': 'Debt',
    'Medium Duration Fund': 'Debt',
    'Medium to Long Duration Fund': 'Debt',
    'Long Duration Fund': 'Debt',
    'Dynamic Bond': 'Debt',
    'Dynamic Bond Fund': 'Debt',
    'Corporate Bond Fund': 'Debt',
    'Credit Risk Fund': 'Debt',
    'Banking and PSU Fund': 'Debt',
    'Banking & PSU Fund': 'Debt',
    'Gilt Fund': 'Debt',
    'Gilt Fund with 10 year constant duration': 'Debt',
    'Floater Fund': 'Debt',
    'Floating Rate Fund': 'Debt',

    // Hybrid
    'Conservative Hybrid Fund': 'Hybrid',
    'Balanced Hybrid Fund': 'Hybrid',
    'Aggressive Hybrid Fund': 'Hybrid',
    'Dynamic Asset Allocation': 'Hybrid',
    'Balanced Advantage': 'Hybrid',
    'Balanced Advantage Fund': 'Hybrid',
    'Multi Asset Allocation Fund': 'Hybrid',
    'Multi Asset Allocation': 'Hybrid',
    'Arbitrage Fund': 'Hybrid',
    'Equity Savings': 'Hybrid',
    'Equity Savings Fund': 'Hybrid',

    // Gold / Silver (Categorized as Gold)
    'Gold ETF': 'Gold',
    'Gold Fund': 'Gold',
    'Silver ETF': 'Gold',
    'Silver Fund': 'Gold',
    'Gold FoF': 'Gold'
};

/**
 * Simplified Category Mapping from SEBI String
 * @param {string} sebiCategory - SEBI category from MFApi (e.g. "Equity Scheme - Flexi Cap Fund")
 * @param {string} fundName - Fund name for keyword fallback
 * @returns {string} - Simplified category (Equity, Debt, Hybrid, Gold, Unknown)
 */
export function mapSEBICategoryToSimple(sebiCategory, fundName = '') {
    if (!sebiCategory || sebiCategory === 'Not Available' || sebiCategory === 'Unknown') {
        return categorizeFundByKeywords(fundName);
    }

    const lowerSebi = sebiCategory.toLowerCase();
    const parts = sebiCategory.split(' - ');
    const mainCat = parts[0]?.trim();
    const subCat = parts[1]?.trim();

    // 1. Check Master Map for exact sub-category match
    if (subCat && SEBI_MAP[subCat]) {
        return SEBI_MAP[subCat];
    }

    // 2. Check Master Map for main category if it's specific (like "ELSS")
    if (mainCat && SEBI_MAP[mainCat]) {
        return SEBI_MAP[mainCat];
    }

    // 3. Handle "Other Schemes" and "ETFs/Index Funds" via keywords
    if (lowerSebi.includes('other scheme') || lowerSebi.includes('index fund') || lowerSebi.includes('etf')) {
        const guessed = categorizeFundByKeywords(fundName);
        if (guessed !== 'Unknown') return guessed;
    }

    // 4. Fallback to broad SEBI Scheme types
    if (lowerSebi.includes('equity scheme')) return 'Equity';
    if (lowerSebi.includes('debt scheme')) return 'Debt';
    if (lowerSebi.includes('hybrid scheme')) return 'Hybrid';
    if (lowerSebi.includes('gold') || lowerSebi.includes('commodity')) return 'Gold';

    // 5. Hard keywords check for "Income", "Gilt", "Bond" if not caught
    if (lowerSebi.includes('income') || lowerSebi.includes('bond') || lowerSebi.includes('gilt') || lowerSebi.includes('debt')) return 'Debt';

    // 6. Ultimate fallback to name keywords
    return categorizeFundByKeywords(fundName);
}

/**
 * Categorize fund with fallback to keyword matching
 * @param {string} fundName - Fund name
 * @param {string} schemeCode - Optional scheme code for API lookup
 * @returns {Promise<Object>} - Category information
 */
export async function categorizeFundImproved(fundName, schemeCode = null) {
    // If scheme code provided, try API first
    if (schemeCode) {
        const apiResult = await fetchFundCategory(schemeCode);
        if (apiResult.category !== 'Unknown') {
            return apiResult;
        }
    }

    // Fallback to keyword-based categorization
    const keywordCategory = categorizeFundByKeywords(fundName);

    return {
        schemeCode: schemeCode || '',
        schemeName: fundName,
        sebiCategory: 'Not Available',
        fundHouse: '',
        category: keywordCategory
    };
}

/**
 * Keyword-based categorization (fallback)
 * @param {string} fundName - Fund name
 * @returns {string} - Category
 */
export function getSubCategoryByKeywords(fundName) {
    if (!fundName) return { category: 'Unknown', subCategory: '' };

    const name = fundName.toLowerCase();

    // EQUITY SUB-CATEGORIES
    if (name.includes('large cap') || name.includes('largecap')) {
        return { category: 'Equity', subCategory: 'Large Cap' };
    }
    if (name.includes('mid cap') || name.includes('midcap') || name.includes('mid-cap')) {
        return { category: 'Equity', subCategory: 'Mid Cap' };
    }
    if (name.includes('small cap') || name.includes('smallcap') || name.includes('small-cap')) {
        return { category: 'Equity', subCategory: 'Small Cap' };
    }
    if (name.includes('flexi cap') || name.includes('flexicap') || name.includes('flexi-cap')) {
        return { category: 'Equity', subCategory: 'Flexi Cap' };
    }
    if (name.includes('multi cap') || name.includes('multicap') || name.includes('multi-cap')) {
        return { category: 'Equity', subCategory: 'Multi Cap' };
    }
    if (name.includes('large & mid') || name.includes('large and mid')) {
        return { category: 'Equity', subCategory: 'Large & Mid Cap' };
    }
    if (name.includes('elss') || name.includes('tax saver')) {
        return { category: 'Equity', subCategory: 'ELSS' };
    }
    if (name.includes('focused') || name.includes('focus')) {
        return { category: 'Equity', subCategory: 'Focused' };
    }
    if (name.includes('value') || name.includes('contra')) {
        return { category: 'Equity', subCategory: 'Value/Contra' };
    }
    if (name.includes('dividend yield')) {
        return { category: 'Equity', subCategory: 'Dividend Yield' };
    }
    if (name.includes('index') || name.includes('etf')) {
        if (name.includes('debt') || name.includes('bond') || name.includes('gilt') || name.includes('nifty sd') || name.includes('sdl')) {
            return { category: 'Debt', subCategory: 'Index Fund/ETF' };
        }
        return { category: 'Equity', subCategory: 'Index Fund/ETF' };
    }
    if (name.includes('sectoral') || name.includes('thematic') || name.includes('it') || name.includes('pharma') || name.includes('banking') || name.includes('fmcg') || name.includes('infrastructure') || name.includes('energy') || name.includes('mnc') || name.includes('consumption')) {
        return { category: 'Equity', subCategory: 'Sectoral/Thematic' };
    }

    // DEBT SUB-CATEGORIES (SEBI Official)
    if (name.includes('overnight')) {
        return { category: 'Debt', subCategory: 'Overnight Fund' };
    }
    if (name.includes('liquid')) {
        return { category: 'Debt', subCategory: 'Liquid Fund' };
    }
    if (name.includes('ultra short') || name.includes('ultrashort')) {
        return { category: 'Debt', subCategory: 'Ultra Short Duration' };
    }
    if (name.includes('low duration') || name.includes('lowduration')) {
        return { category: 'Debt', subCategory: 'Low Duration Fund' };
    }
    if (name.includes('money market')) {
        return { category: 'Debt', subCategory: 'Money Market Fund' };
    }
    if (name.includes('short duration') || (name.includes('short term') && !name.includes('floating'))) {
        return { category: 'Debt', subCategory: 'Short Duration Fund' };
    }
    if (name.includes('medium duration') || name.includes('medium-duration')) {
        return { category: 'Debt', subCategory: 'Medium Duration Fund' };
    }
    if (name.includes('long duration') || name.includes('long-duration')) {
        return { category: 'Debt', subCategory: 'Long Duration Fund' };
    }
    if (name.includes('dynamic bond')) {
        return { category: 'Debt', subCategory: 'Dynamic Bond Fund' };
    }
    if (name.includes('corporate bond')) {
        return { category: 'Debt', subCategory: 'Corporate Bond Fund' };
    }
    if (name.includes('banking') && (name.includes('psu') || name.includes('debt'))) {
        return { category: 'Debt', subCategory: 'Banking & PSU Fund' };
    }
    if (name.includes('credit risk')) {
        return { category: 'Debt', subCategory: 'Credit Risk Fund' };
    }
    if (name.includes('gilt')) {
        return { category: 'Debt', subCategory: 'Gilt Fund' };
    }
    if (name.includes('floater') || name.includes('floating')) {
        return { category: 'Debt', subCategory: 'Floater Fund' };
    }

    // HYBRID SUB-CATEGORIES (SEBI Official)
    if (name.includes('conservative hybrid')) {
        return { category: 'Hybrid', subCategory: 'Conservative Hybrid' };
    }
    if (name.includes('balanced hybrid')) {
        return { category: 'Hybrid', subCategory: 'Balanced Hybrid' };
    }
    if (name.includes('aggressive hybrid')) {
        return { category: 'Hybrid', subCategory: 'Aggressive Hybrid' };
    }
    if (name.includes('balanced advantage') || name.includes('dynamic asset')) {
        return { category: 'Hybrid', subCategory: 'Balanced Advantage' };
    }
    if (name.includes('multi asset')) {
        return { category: 'Hybrid', subCategory: 'Multi Asset Allocation' };
    }
    if (name.includes('arbitrage')) {
        return { category: 'Hybrid', subCategory: 'Arbitrage fund' };
    }
    if (name.includes('equity savings')) {
        return { category: 'Hybrid', subCategory: 'Equity Savings' };
    }

    // GOLD SUB-CATEGORIES
    if (name.includes('gold')) {
        return { category: 'Gold', subCategory: 'Gold Fund/ETF' };
    }
    if (name.includes('silver')) {
        return { category: 'Gold', subCategory: 'Silver Fund/ETF' };
    }

    // General categorization fallback
    const category = categorizeFundByKeywords(fundName);
    return { category, subCategory: '' };
}

/**
 * Keyword-based categorization (fallback)
 * @param {string} fundName - Fund name
 * @returns {string} - Category
 */
function categorizeFundByKeywords(fundName) {
    if (!fundName) return 'Unknown';

    const name = fundName.toLowerCase();

    // Equity keywords
    const equityKeywords = [
        'equity', 'stock', 'large cap', 'mid cap', 'small cap', 'flexi cap',
        'multi cap', 'sectoral', 'thematic', 'index', 'elss', 'tax saver', 'growth',
        'contra', 'value', 'focused', 'alpha', 'momentum', 'factor', 'quant', 'esg',
        'it', 'pharma', 'banking', 'fmcg', 'infrastructure', 'energy', 'mnc', 'consumption'
    ];

    // Debt keywords
    const debtKeywords = [
        'debt', 'bond', 'liquid', 'gilt', 'duration', 'money market',
        'corporate bond', 'banking & psu', 'credit risk', 'overnight', 'treasury',
        'floater', 'floating', 'target maturity', 'sdl', 'nifty sd'
    ];

    // Hybrid keywords (excluding alternatives)
    const hybridKeywords = [
        'hybrid', 'balanced', 'multi asset', 'equity savings',
        'arbitrage', 'asset allocator', 'dynamic asset'
    ];

    // Gold / Commodity keywords
    const goldKeywords = [
        'gold', 'silver', 'commodity', 'precious'
    ];

    const hasEquity = equityKeywords.some(k => name.includes(k));
    const hasDebt = debtKeywords.some(k => name.includes(k));
    const hasHybrid = hybridKeywords.some(k => name.includes(k));
    const hasGold = goldKeywords.some(k => name.includes(k));

    // Priority: Gold first (most specific)
    if (hasGold) return 'Gold';

    // Then check combinations
    if (hasEquity && (hasDebt || hasHybrid)) return 'Hybrid';
    if (hasEquity) return 'Equity';
    if (hasDebt) return 'Debt';
    if (hasHybrid) return 'Hybrid';

    return 'Unknown';
}

/**
 * Batch categorize multiple funds
 * @param {Array} funds - Array of fund objects with schemeCode
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} - Categorized funds
 */
export async function categorizeFundsBatch(funds, onProgress = null) {
    const results = [];

    for (let i = 0; i < funds.length; i++) {
        const fund = funds[i];
        const schemeCode = fund.schemeCode || fund.code;
        const fundName = fund.schemeName || fund.name;

        const categoryInfo = await categorizeFundImproved(fundName, schemeCode);

        results.push({
            ...fund,
            ...categoryInfo
        });

        if (onProgress) {
            onProgress(i + 1, funds.length);
        }

        // Small delay to avoid overwhelming the API
        if (i < funds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    return results;
}

/**
 * Get category color scheme
 * @param {string} category - Category name
 * @returns {Object} - Color scheme
 */
export function getCategoryColor(category) {
    const colors = {
        Equity: {
            bg: 'bg-blue-100',
            text: 'text-blue-800',
            border: 'border-blue-300',
            badge: 'bg-blue-500',
            hex: '#3B82F6'
        },
        Debt: {
            bg: 'bg-green-100',
            text: 'text-green-800',
            border: 'border-green-300',
            badge: 'bg-green-500',
            hex: '#10B981'
        },
        Hybrid: {
            bg: 'bg-purple-100',
            text: 'text-purple-800',
            border: 'border-purple-300',
            badge: 'bg-purple-500',
            hex: '#8B5CF6'
        },
        Unknown: {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            border: 'border-gray-300',
            badge: 'bg-gray-500',
            hex: '#6B7280'
        }
    };

    return colors[category] || colors.Unknown;
}

/**
 * Clear category cache
 */
export function clearCategoryCache() {
    categoryCache.clear();
    console.log('Category cache cleared');
}

/**
 * Get cache statistics
 */
export function getCategoryCacheStats() {
    return {
        size: categoryCache.size,
        entries: Array.from(categoryCache.keys())
    };
}

// Export old function name for backward compatibility
export { categorizeFundByKeywords as categorizeFund };
