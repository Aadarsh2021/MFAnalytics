/**
 * Macro Data Processor
 * Handles parsing, normalization, and feature engineering for macro indicators
 */

/**
 * Parse CSV data from the US macro dataset
 * @param {string} csvText - Raw CSV text
 * @param {string} dateColumn - Name of date column
 * @param {string} valueColumn - Name of value column
 * @returns {Array} Parsed data [{date, value}]
 */
export function parseCSV(csvText, dateColumn = 'Date', valueColumn) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const dateIdx = headers.findIndex(h => h.toLowerCase().includes('date') || h === dateColumn);
    const valueIdx = valueColumn ? headers.indexOf(valueColumn) : 1;

    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < 2) continue;

        const dateStr = values[dateIdx]?.trim();
        const valueStr = values[valueIdx]?.trim();

        if (!dateStr || !valueStr) continue;

        const date = parseDateString(dateStr);
        const value = parseFloat(valueStr);

        if (date && !isNaN(value)) {
            data.push({ date, value });
        }
    }

    return data.sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Parse various date formats to YYYY-MM-DD
 */
function parseDateString(dateStr) {
    // Handle DD-MM-YYYY format
    if (dateStr.includes('-') && dateStr.split('-')[0].length <= 2) {
        const [day, month, year] = dateStr.split('-');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Handle YYYY-MM-DD format
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
        return dateStr;
    }

    // Handle other formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return null;
}

/**
 * Align quarterly data to monthly frequency (forward-fill)
 */
export function quarterlyToMonthly(quarterlyData) {
    const monthly = [];

    for (let i = 0; i < quarterlyData.length; i++) {
        const current = quarterlyData[i];
        const next = quarterlyData[i + 1];

        const startDate = new Date(current.date);
        const endDate = next ? new Date(next.date) : new Date();

        // Forward-fill for 3 months
        for (let month = 0; month < 3; month++) {
            const monthDate = new Date(startDate);
            monthDate.setMonth(startDate.getMonth() + month);

            if (monthDate >= endDate) break;

            const year = monthDate.getFullYear();
            const monthStr = String(monthDate.getMonth() + 1).padStart(2, '0');
            const day = '01';

            monthly.push({
                date: `${year}-${monthStr}-${day}`,
                value: current.value
            });
        }
    }

    return monthly;
}

/**
 * Calculate rolling statistics
 */
export function calculateRollingStats(data, window = 12) {
    const result = [];

    for (let i = window - 1; i < data.length; i++) {
        const windowData = data.slice(i - window + 1, i + 1);
        const values = windowData.map(d => d.value);

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        result.push({
            date: data[i].date,
            mean,
            stdDev,
            min: Math.min(...values),
            max: Math.max(...values)
        });
    }

    return result;
}

/**
 * Calculate momentum (smoothed rate of change)
 */
export function calculateMomentum(data, window = 3) {
    const result = [];
    if (data.length < window + 1) return [];

    for (let i = window; i < data.length; i++) {
        const current = data[i].value;
        const previous = data[i - window].value;

        // Momentum as absolute change (better for rates/percentages)
        const momentum = current - previous;

        result.push({
            date: data[i].date,
            value: momentum
        });
    }

    return result;
}

/**
 * Calculate rolling correlation between two series
 */
export function calculateRollingCorrelation(series1, series2, window = 12) {
    const result = [];

    // Align dates
    const aligned = alignSeries(series1, series2);

    for (let i = window - 1; i < aligned.length; i++) {
        const windowData = aligned.slice(i - window + 1, i + 1);

        const x = windowData.map(d => d.value1);
        const y = windowData.map(d => d.value2);

        const correlation = calculateCorrelation(x, y);

        result.push({
            date: aligned[i].date,
            correlation
        });
    }

    return result;
}

/**
 * Align two time series by date
 */
function alignSeries(series1, series2) {
    const aligned = [];
    const map2 = new Map(series2.map(d => [d.date, d.value]));

    for (const d1 of series1) {
        if (map2.has(d1.date)) {
            aligned.push({
                date: d1.date,
                value1: d1.value,
                value2: map2.get(d1.date)
            });
        }
    }

    return aligned;
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x, y) {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }

    return numerator / Math.sqrt(denomX * denomY);
}

/**
 * Normalize to z-scores
 */
export function normalizeToZScores(data, window = 60) {
    const result = [];

    for (let i = window - 1; i < data.length; i++) {
        const windowData = data.slice(i - window + 1, i + 1);
        const values = windowData.map(d => d.value);

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        const zScore = stdDev > 0 ? (data[i].value - mean) / stdDev : 0;

        result.push({
            date: data[i].date,
            value: data[i].value,
            zScore: Math.max(-3, Math.min(3, zScore)) // Clip to [-3, 3]
        });
    }

    return result;
}

/**
 * Handle missing data (interpolation or forward-fill)
 */
export function handleMissingData(data, maxGap = 3) {
    const result = [];
    let lastValid = null;
    let gapCount = 0;

    for (let i = 0; i < data.length; i++) {
        if (data[i].value !== null && !isNaN(data[i].value)) {
            result.push(data[i]);
            lastValid = data[i];
            gapCount = 0;
        } else if (lastValid && gapCount < maxGap) {
            // Forward-fill
            result.push({
                date: data[i].date,
                value: lastValid.value,
                filled: true
            });
            gapCount++;
        }
    }

    return result;
}

/**
 * Calculate Volatility Ratio (Inflation Vol / Growth Vol)
 * Critical for Regime C detection (30% weight)
 * @param {Array} inflationData - CPI data [{date, value}]
 * @param {Array} gdpData - GDP growth data [{date, value}]
 * @param {number} window - Rolling window in months (default 12)
 * @returns {Array} Volatility ratio by date
 */
export function calculateVolatilityRatio(inflationData, gdpData, window = 12) {
    if (!inflationData || !gdpData) return [];

    // Calculate rolling volatility (std dev) for inflation
    const inflationVol = calculateRollingStats(inflationData, window);

    // Calculate rolling volatility (std dev) for GDP
    const gdpVol = calculateRollingStats(gdpData, window);

    // Align by date and calculate ratio
    const result = [];
    const gdpMap = new Map(gdpVol.map(d => [d.date, d.stdDev]));

    for (const infVol of inflationVol) {
        const gdpStdDev = gdpMap.get(infVol.date);

        if (gdpStdDev && gdpStdDev > 0) {
            const ratio = infVol.stdDev / gdpStdDev;

            result.push({
                date: infVol.date,
                inflationVol: infVol.stdDev,
                growthVol: gdpStdDev,
                ratio: ratio,
                // Regime C signature: ratio > 1 means inflation more volatile than growth
                regimeCSignal: ratio > 1.0
            });
        }
    }

    return result;
}

/**
 * Normalize an entire consolidated dataset
 */
export function normalizeDataset(dataset, window = 60) {
    if (!dataset || dataset.length === 0) return [];

    // Get all indicator keys (everything except 'date')
    const keys = Object.keys(dataset[0]).filter(k => k !== 'date');
    const normalized = dataset.map(d => ({ date: d.date }));

    keys.forEach(key => {
        const series = dataset.map(d => ({ date: d.date, value: d[key] }));
        const zScores = normalizeToZScores(series, window);

        // Map back to result
        zScores.forEach(p => {
            const row = normalized.find(r => r.date === p.date);
            if (row) row[key] = p.zScore;
        });
    });

    return normalized.filter(d => Object.keys(d).length > 1); // Keep rows that have data
}

export function consolidateMacroData(indicators) {
    const dateMap = new Map();

    // Collect all unique dates
    for (const [name, data] of Object.entries(indicators)) {
        for (const point of data) {
            if (!dateMap.has(point.date)) {
                dateMap.set(point.date, { date: point.date });
            }
            dateMap.get(point.date)[name] = point.value || point.zScore;
        }
    }

    // Convert to array and sort
    const consolidated = Array.from(dateMap.values())
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    return consolidated;
}

/**
 * Process Macro Data
 * Calculates derived fields from raw macro data columns for any region
 */
export function processMacroData(data) {
    if (!data || data.length === 0) return [];

    // First pass: Calculate basic derived fields
    const withBasicFields = data.map((row, i) => {
        const prevRow = i > 0 ? data[i - 1] : null;

        // Calculate Volatility (INR/USD change)
        let volatility = 0;
        if (prevRow && row.inrUsd && prevRow.inrUsd) {
            volatility = Math.abs((row.inrUsd - prevRow.inrUsd) / prevRow.inrUsd) * 100 * Math.sqrt(12); // Annualized
        }

        // Real Rate (Repo - CPI) or use provided
        const realRate = row.realRate !== undefined ? row.realRate : ((row.repoRate || 0) - (row.cpiInflation || 0));

        // Term Premium (10Y - 2Y Spread / Yield Curve Slope proxy)
        const termPremium = row.termPremium || (row.india_yield_curve_slope || (row.gSecYield ? row.gSecYield - 6.5 : 0));

        // Global Liquidity Proxy (M2 Growth / GDP proxy)
        const globalLiquidity = row.globalLiquidity || (row.global_liquidity || (row.bankCredit ? row.bankCredit + 2 : 12));

        // Equity Earnings Breadth
        const equityEarningsBreadth = row.equityEarningsBreadth || (row.equity_earnings_breadth || 65);

        // Debt Stress - Use provided if available
        // Calculation: (Interest Expense / Nominal GDP) * 100
        // Nominal GDP is usually ~1.5x of Real GDP (gdpIndex), but we fetch it directly now.
        const nominalGDP = row.gdpNominal || (row.gdpIndex ? row.gdpIndex * 1.5 : null);
        const debtStress = row.debtStress !== undefined ? row.debtStress :
            (row.interest_expense && nominalGDP ? (row.interest_expense / nominalGDP) * 100 :
                (0.8 * (row.gSecYield || 7.0)));

        return {
            ...row,
            realRate,
            termPremium,
            globalLiquidity,
            equityEarningsBreadth,
            growth: row.gdpGrowth,
            inflation: row.cpiInflation,
            inflationExpectations: row.inflationExpectations || row.cpiInflation,
            debtStress,
            volatility: row.volatility || 0,
            cbGoldBuying: row.cbGoldBuying !== undefined ? row.cbGoldBuying : (row.forexReserves ? row.forexReserves / 1000 : 0),
            sp500: row.sp500 || null,
            goldPrice: row.goldPrice || null
        };
    });

    // Second pass: Calculate Momentum, Volatility Ratio, and individual volatilities
    const inflationSeries = withBasicFields.map(row => ({ date: row.date, value: row.inflation || 0 }));
    const growthSeries = withBasicFields.map(row => ({ date: row.date, value: row.growth || 0 }));

    const inflationMomentum = calculateMomentum(inflationSeries, 3);
    const growthMomentum = calculateMomentum(growthSeries, 3);
    const volRatios = calculateVolatilityRatio(inflationSeries, growthSeries, 12);

    // Calculate Bond-Equity Correlation (12m rolling)
    const sp500Series = withBasicFields.map((row, i) => {
        const prev = i > 0 ? withBasicFields[i - 1] : null
        const val = row.sp500
        const prevVal = prev?.sp500
        // % change
        const ret = (val && prevVal) ? (val - prevVal) / prevVal : 0
        return { date: row.date, value: ret }
    })

    const bondSeries = withBasicFields.map((row, i) => {
        const prev = i > 0 ? withBasicFields[i - 1] : null
        const val = row.gSecYield // Using US 10Y Yield (mapped to gSecYield in consolidation)
        const prevVal = prev?.gSecYield
        // Bond Price Return approx = -(Yield Change)
        const ret = (val !== undefined && prevVal !== undefined) ? -(val - prevVal) : 0
        return { date: row.date, value: ret }
    })

    const bondEquityCorrs = calculateRollingCorrelation(sp500Series, bondSeries, 12)
    const bondEquityMap = new Map(bondEquityCorrs.map(c => [c.date, c.correlation]))

    // Explicitly get inflation volatility for Pillar 5
    const inflationVolStats = calculateRollingStats(inflationSeries, 12);

    const infMomMap = new Map(inflationMomentum.map(m => [m.date, m.value]));
    const growthMomMap = new Map(growthMomentum.map(m => [m.date, m.value]));
    const volRatioMap = new Map(volRatios.map(v => [v.date, v.ratio]));
    const infVolMap = new Map(inflationVolStats.map(v => [v.date, v.stdDev]));

    // Third pass: Merge all fields
    return withBasicFields.map(row => ({
        ...row,
        inflationMomentum: infMomMap.get(row.date) || 0,
        growthMomentum: growthMomMap.get(row.date) || 0,
        volatilityRatio: volRatioMap.get(row.date) || 1.0,
        inflationVol: infVolMap.get(row.date) || 0,
        bondEquityCorr: bondEquityMap.get(row.date) || 0
    }));
}

export default {
    parseCSV,
    quarterlyToMonthly,
    calculateRollingStats,
    calculateRollingCorrelation,
    calculateVolatilityRatio,
    normalizeToZScores,
    handleMissingData,
    consolidateMacroData,
    processMacroData
};
