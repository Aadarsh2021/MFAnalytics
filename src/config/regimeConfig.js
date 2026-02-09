/**
 * Regime-Based Asset Allocation Configuration for Black-Litterman Model
 * 
 * This file defines 7 different market regimes with specific allocation bands
 * for different asset classes based on macroeconomic conditions.
 */

export const REGIMES = {
    REGIME_A: {
        id: 'REGIME_A',
        name: 'Monetary Credibility',
        shortName: 'Regime A',
        description: 'Positive real rates environment where bonds hedge equities and policy transmission is trusted',
        coreQuestion: 'Can Policy Impose Real Pain?',
        dominantConstraint: 'Inflation Discipline',
        idea: 'Positive real rates, Bonds hedge equities, Policy transmission trusted',
        allocationBands: {
            EQUITY: { min: 0.50, max: 0.65, target: 0.575 },
            HYBRID: { min: 0.10, max: 0.15, target: 0.125 },
            DEBT_LONG: { min: 0.00, max: 0.25, target: 0.15 },
            DEBT_MEDIUM: { min: 0.05, max: 0.25, target: 0.10 },
            DEBT_SHORT: { min: 0.00, max: 0.10, target: 0.05 },
            GOLD: { min: 0.00, max: 0.05, target: 0.00 }
        },
        behavior: [
            'Gold should naturally go to lower bound',
            'Bonds regain hedge role',
            'Correlation matrix mostly historical'
        ],
        scoringComponents: {
            highWhen: [
                'Real rates are meaningfully positive',
                'Bonds hedge equities',
                'Term premium responds normally'
            ],
            scoreComponents: [
                'Real rate percentile ↑',
                'Eq–bond correlation ↓'
            ],
            implication: 'If this score is dominant → gold is structurally unnecessary'
        },
        color: '#3B82F6' // Blue
    },

    REGIME_B: {
        id: 'REGIME_B',
        name: 'Disinflationary Growth',
        shortName: 'Regime B',
        description: 'Falling inflation with credibility, rates cut because growth slows, bonds work again',
        coreQuestion: 'Is Easing Credible and Voluntary?',
        dominantConstraint: 'Growth Slowdown with Policy Trust',
        idea: 'Falling inflation with credibility, Rates cut because growth slows, Bonds work again',
        allocationBands: {
            EQUITY: { min: 0.45, max: 0.65, target: 0.50 },
            HYBRID: { min: 0.05, max: 0.20, target: 0.125 },
            DEBT_LONG: { min: 0.00, max: 0.30, target: 0.20 },
            DEBT_MEDIUM: { min: 0.10, max: 0.30, target: 0.125 },
            DEBT_SHORT: { min: 0.02, max: 0.08, target: 0.05 },
            GOLD: { min: 0.02, max: 0.06, target: 0.04 }
        },
        behavior: [
            'Neutral gold positioning',
            'Increased debt allocation as bonds work',
            'Credible policy easing environment'
        ],
        scoringComponents: {
            highWhen: [
                'Inflation momentum ↓',
                'Growth momentum ↓',
                'Yield curve steepens normally',
                'Bond hedge still works'
            ],
            scoreComponents: [
                'Inflation trend',
                'Growth indicators',
                'Yield curve shape'
            ],
            implication: 'This regime never lasts long. Treat it as transitional by design.'
        },
        color: '#10B981' // Green
    },

    REGIME_C: {
        id: 'REGIME_C',
        name: 'Fiscal Dominance / Financial Repression',
        shortName: 'Regime C',
        description: 'Real rates capped, bond hedge impaired, policy constrained by debt',
        coreQuestion: 'Is Policy Constrained by Debt?',
        dominantConstraint: 'Debt and Repression',
        idea: 'Real rates capped, Bond hedge impaired, Policy constrained by debt',
        allocationBands: {
            EQUITY: { min: 0.40, max: 0.50, target: 0.43 },
            HYBRID: { min: 0.10, max: 0.12, target: 0.11 },
            DEBT_LONG: { min: 0.00, max: 0.00, target: 0.00 },
            DEBT_MEDIUM: { min: 0.15, max: 0.25, target: 0.19 },
            DEBT_SHORT: { min: 0.15, max: 0.20, target: 0.17 },
            GOLD: { min: 0.05, max: 0.15, target: 0.10 }
        },
        behavior: [
            'Gold band is wide enough to matter, narrow enough to avoid ideology',
            'Reduced equity exposure due to policy constraints',
            'Increased short duration for liquidity'
        ],
        scoringComponents: {
            highWhen: [
                'Real rates capped near zero',
                'Debt servicing rising',
                'Eq–bond correlation ≥ 0',
                'CB gold buying elevated'
            ],
            scoreComponents: [
                'Real rate ceiling',
                'Debt sustainability metrics',
                'Equity-bond correlation',
                'Central bank gold purchases'
            ],
            implication: 'This score must be sticky'
        },
        color: '#F59E0B' // Amber
    },

    REGIME_D: {
        id: 'REGIME_D',
        name: 'Crisis / Trust Shock / Recession',
        shortName: 'Regime D',
        description: 'Liquidity stress, counterparty fear, policy reaction imminent',
        coreQuestion: 'Is Plumbing Breaking Right Now?',
        dominantConstraint: 'Counterparty and Liquidity Stress',
        idea: 'Liquidity stress, Counterparty fear, Policy reaction imminent',
        allocationBands: {
            EQUITY: { min: 0.20, max: 0.30, target: 0.25 },
            HYBRID: { min: 0.10, max: 0.20, target: 0.15 },
            DEBT_LONG: { min: 0.00, max: 0.02, target: 0.00 },
            DEBT_MEDIUM: { min: 0.05, max: 0.15, target: 0.10 },
            DEBT_SHORT: { min: 0.25, max: 0.45, target: 0.35 },
            GOLD: { min: 0.10, max: 0.20, target: 0.15 }
        },
        behavior: [
            'Regime D must decay fast or it will freeze the portfolios',
            'Maximum liquidity preservation',
            'Elevated gold allocation for safety'
        ],
        scoringComponents: {
            highWhen: [
                'Credit spreads blow out',
                'Volatility spikes',
                'Correlations converge to 1',
                'Funding stress visible'
            ],
            scoreComponents: [
                'Credit spread widening',
                'VIX / volatility index',
                'Cross-asset correlations',
                'Liquidity indicators'
            ],
            implication: 'This score must decay fast'
        },
        color: '#EF4444' // Red
    },

    MARKET_WEIGHT: {
        id: 'MARKET_WEIGHT',
        name: 'Market Capitalization Weight',
        shortName: 'Market Weight',
        description: 'Portfolio weights based on actual market capitalization of selected funds',
        coreQuestion: 'What does the market think?',
        dominantConstraint: 'Market Consensus',
        idea: 'Follow market capitalization weights',
        allocationBands: null, // No bands, uses actual market cap
        behavior: [
            'Weights determined by market capitalization',
            'No artificial constraints',
            'Pure market-based allocation'
        ],
        color: '#8B5CF6' // Purple
    },

    EQUAL_WEIGHT: {
        id: 'EQUAL_WEIGHT',
        name: 'Equal Weight',
        shortName: 'Equal Weight',
        description: 'Equal allocation across all selected funds regardless of market cap or category',
        coreQuestion: 'Should all funds be treated equally?',
        dominantConstraint: 'Equal Opportunity',
        idea: 'Equal allocation to all selected funds',
        allocationBands: null, // No bands, equal weight
        behavior: [
            'Each fund gets equal weight',
            'No bias towards large cap or market leaders',
            'Simple and transparent'
        ],
        color: '#6B7280' // Gray
    },

    MARKET_CUSTOM: {
        id: 'MARKET_CUSTOM',
        name: 'Market Weight + Custom Views',
        shortName: 'Market + Custom',
        description: 'Market capitalization weights as base, adjusted by custom investor views',
        coreQuestion: 'How do my views differ from the market?',
        dominantConstraint: 'Market + Personal Conviction',
        idea: 'Blend market consensus with personal views',
        allocationBands: null, // No bands, uses market weight + custom views
        behavior: [
            'Start with market weights',
            'Adjust based on custom views',
            'Black-Litterman blending of market and views'
        ],
        color: '#EC4899' // Pink
    }
}

/**
 * Transition Configuration
 * Controls how quickly regimes can change and transition smoothing
 */
export const TRANSITION_CONFIG = {
    // Minimum transition duration in months
    MIN_TRANSITION_MONTHS: 6,

    // Maximum transition duration in months
    MAX_TRANSITION_MONTHS: 12,

    // Maximum probability decay per quarter (3 months)
    MAX_DECAY_PER_QUARTER: 0.25,

    // Confidence thresholds for allowing transitions
    EARLY_TRANSITION_CONFIDENCE: 0.70,  // 6-9 months
    NORMAL_TRANSITION_CONFIDENCE: 0.60, // 9-12 months

    // Regime C → B specific transition rules
    C_TO_B_GOLD_DECAY_MONTHS: 12,        // Gold floor reduces over 12 months
    C_TO_B_DURATION_PENALTY_UNTIL: 9,    // Penalize long duration until month 9
    C_TO_B_BETA_CAP_UNTIL: 10,           // Cap equity beta until month 10
    C_PROBABILITY_QUALITY_THRESHOLD: 0.20 // Quality bias until C prob < 20%
}
    ;

/**
 * Asset Class Mapping
 * Maps fund categories to asset classes used in regime allocation
 */
export const ASSET_CLASS_MAPPING = {
    // Equity Funds
    'Large Cap Fund': 'EQUITY',
    'Mid Cap Fund': 'EQUITY',
    'Small Cap Fund': 'EQUITY',
    'Large & Mid Cap Fund': 'EQUITY',
    'Multi Cap Fund': 'EQUITY',
    'Flexi Cap Fund': 'EQUITY',
    'Focused Fund': 'EQUITY',
    'Dividend Yield Fund': 'EQUITY',
    'Value Fund': 'EQUITY',
    'Contra Fund': 'EQUITY',
    'Sectoral': 'EQUITY',
    'Thematic': 'EQUITY',
    'ELSS': 'EQUITY',
    'Index Funds': 'EQUITY',
    'ETF': 'EQUITY',

    // Hybrid Funds
    'Conservative Hybrid Fund': 'HYBRID',
    'Balanced Hybrid Fund': 'HYBRID',
    'Aggressive Hybrid Fund': 'HYBRID',
    'Dynamic Asset Allocation': 'HYBRID',
    'Multi Asset Allocation': 'HYBRID',
    'Arbitrage Fund': 'HYBRID',
    'Equity Savings': 'HYBRID',
    'Balanced Advantage': 'HYBRID',

    // Medium/Long Term Debt
    'Dynamic Bond': 'DEBT_MEDIUM',
    'Corporate Bond Fund': 'DEBT_MEDIUM',
    'Banking and PSU Fund': 'DEBT_MEDIUM',
    'Gilt Fund': 'DEBT_LONG',
    'Medium Duration Fund': 'DEBT_MEDIUM',
    'Medium to Long Duration Fund': 'DEBT_LONG',
    'Long Duration Fund': 'DEBT_LONG',
    'Credit Risk Fund': 'DEBT_MEDIUM',
    'Short Duration Fund': 'DEBT_MEDIUM',
    'Income Fund': 'DEBT_MEDIUM',
    'Floater Fund': 'DEBT_MEDIUM',

    // Short Duration / Cash
    'Liquid Fund': 'DEBT_SHORT',
    'Overnight Fund': 'DEBT_SHORT',
    'Ultra Short Duration Fund': 'DEBT_SHORT',
    'Low Duration Fund': 'DEBT_SHORT',
    'Money Market Fund': 'DEBT_SHORT',
    'Short Duration Fund': 'DEBT_SHORT',
    'Floater Fund': 'DEBT_SHORT',
    'Treasury Bill': 'DEBT_SHORT',

    // Gold / Alternative
    'FoF Domestic': 'GOLD',
    'Gold Fund': 'GOLD',
    'Silver Fund': 'GOLD',
    'Gold ETF': 'GOLD',
    'Index Fund - Gold': 'GOLD'
};

/**
 * Get asset class for a fund based on its SEBI sub-category and name
 * Comprehensive keyword matching for Indian Mutual Funds
 */
export function getAssetClass(sebiSubCategory, fundName = '') {
    const sc = (sebiSubCategory || '').toLowerCase();
    const name = (fundName || '').toLowerCase();

    // 1. Gold / Silver / Commodities
    if (sc.includes('gold') || sc.includes('silver') || sc.includes('commodity') || sc.includes('precious metal') ||
        name.includes('gold') || name.includes('silver') || name.includes('commodity') || name.includes('precious')) {
        return 'GOLD';
    }

    // 0. User Specific Overrides (Manual Rules)
    // HDFC Dynamic Debt -> Explicitly Long Term (per User request)
    if (name.includes('hdfc dynamic debt')) {
        return 'DEBT_LONG';
    }
    // ICICI Prudential All Seasons -> Explicitly Medium Term (per User request "medium + long", Medium is safer base)
    if (name.includes('icici prudential all seasons')) {
        return 'DEBT_MEDIUM';
    }

    // 2. Hybrid Funds (All variations)
    if (sc.includes('hybrid') || sc.includes('balanced') || sc.includes('arbitrage') || sc.includes('equity savings') ||
        sc.includes('asset allocation') || sc.includes('multi asset') || sc.includes('advantage') ||
        name.includes('hybrid') || name.includes('balanced') || name.includes('arbitrage') || name.includes('equity savings') ||
        name.includes('asset allocation') || name.includes('multi asset') || name.includes('advantage')) {
        return 'HYBRID';
    }

    // 3. Debt - Short Duration / Cash Equivalents (Duration < 1-3 years)
    if (sc.includes('liquid') || sc.includes('overnight') || sc.includes('ultra short') || sc.includes('low duration') ||
        sc.includes('money market') || sc.includes('treasury') || sc.includes('cash') || sc.includes('t-bill') ||
        sc.includes('short duration') || sc.includes('short term') ||
        name.includes('liquid') || name.includes('overnight') || name.includes('money market') ||
        name.includes('ultra short') || name.includes('low duration') ||
        name.includes('treasury') || name.includes('cash') || name.includes('t-bill') ||
        name.includes('short duration') || name.includes('short term')) {
        return 'DEBT_SHORT';
    }

    // 4. Debt - Long Term / Duration (Duration > 5-7 years)
    // Removed 'dynamic bond' and 'medium to long' from here to classify them as DEBT_MEDIUM per user request
    if (sc.includes('long duration') || sc.includes('gilt') ||
        name.includes('long duration') || name.includes('gilt')) {
        return 'DEBT_LONG';
    }

    // 5. Debt - Medium Term (Duration 3-5 years)
    if (sc.includes('debt') || sc.includes('bond') || sc.includes('income') ||
        sc.includes('medium duration') || sc.includes('credit risk') ||
        sc.includes('corporate bond') || sc.includes('banking') || sc.includes('psu') ||
        sc.includes('government securities') || sc.includes('floater') || sc.includes('floating') ||
        sc.includes('dynamic bond') || sc.includes('medium to long') ||
        name.includes('bond') || name.includes('debt') || name.includes('income') ||
        name.includes('medium duration') || name.includes('corporate bond') ||
        name.includes('banking') || name.includes('psu') || name.includes('government securities') ||
        name.includes('floating') || name.includes('floater') ||
        name.includes('dynamic bond') || name.includes('medium to long')) {
        return 'DEBT_MEDIUM';
    }

    // 5. Equity Funds (All variations)
    if (sc.includes('equity') || sc.includes('index') || sc.includes('etf') || sc.includes('focused') ||
        sc.includes('cap') || sc.includes('elss') || sc.includes('sectoral') || sc.includes('thematic') ||
        sc.includes('dividend yield') || sc.includes('value') || sc.includes('contra') ||
        name.includes('equity') || name.includes('index') || name.includes('nifty') || name.includes('sensex') ||
        name.includes('tax saver') || name.includes('elss') || name.includes('growth') || name.includes('flexi cap') ||
        name.includes('mid cap') || name.includes('small cap') || name.includes('large cap') || name.includes('multi cap') ||
        name.includes('focused') || name.includes('dividend') || name.includes('value') || name.includes('contra') ||
        name.includes('pharma') || name.includes('banking') || name.includes('infrastructure') || name.includes('technology') ||
        name.includes('auto') || name.includes('fmcg') || name.includes('energy') || name.includes('psu')) {
        return 'EQUITY';
    }

    // 6. Explicit Mapping for SEBI categories (fallback)
    if (ASSET_CLASS_MAPPING[sebiSubCategory]) {
        return ASSET_CLASS_MAPPING[sebiSubCategory];
    }

    // 7. Final check - if "fund" or "scheme" in name but no match, likely equity
    if (name.includes('fund') || name.includes('scheme') || name.includes('plan')) {
        return 'EQUITY'; // Conservative default
    }

    return 'EQUITY'; // Ultimate Default
}

/**
 * Get regime by ID
 */
export function getRegime(regimeId) {
    return REGIMES[regimeId] || REGIMES.MARKET_WEIGHT;
}

/**
 * Get all regime options for dropdown
 */
export function getRegimeOptions() {
    return Object.values(REGIMES).map(regime => ({
        value: regime.id,
        label: regime.name,
        shortLabel: regime.shortName,
        description: regime.description
    }));
}

/**
 * Calculate target allocation for a regime
 * Returns object with asset class targets
 */
export function getRegimeTargets(regimeId) {
    const regime = getRegime(regimeId);

    if (!regime.allocationBands) {
        return null; // Market weight, equal weight, or custom
    }

    const targets = {};
    Object.entries(regime.allocationBands).forEach(([assetClass, band]) => {
        targets[assetClass] = band.target;
    });

    return targets;
}

/**
 * Validate portfolio allocation against regime bands
 * Returns { valid: boolean, violations: [] }
 */
export function validateRegimeAllocation(regimeId, allocation) {
    const regime = getRegime(regimeId);

    if (!regime.allocationBands) {
        return { valid: true, violations: [] };
    }

    const violations = [];

    Object.entries(regime.allocationBands).forEach(([assetClass, band]) => {
        const weight = allocation[assetClass] || 0;

        if (weight < band.min) {
            violations.push({
                assetClass,
                type: 'below_min',
                actual: weight,
                min: band.min,
                max: band.max
            });
        }

        if (weight > band.max) {
            violations.push({
                assetClass,
                type: 'above_max',
                actual: weight,
                min: band.min,
                max: band.max
            });
        }
    });

    return {
        valid: violations.length === 0,
        violations
    };
}

export default REGIMES;
