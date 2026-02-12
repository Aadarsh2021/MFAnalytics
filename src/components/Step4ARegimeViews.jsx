import { useState, useEffect } from 'react'
import { Upload, TrendingUp, AlertTriangle, CheckCircle, Plus, X, Target, BarChart3, Activity, Lock, Database, Settings } from 'lucide-react'
import { detectRegime, getMissingAssetClasses, validateRegimeConstraints, getRegimeAllocationBands, shouldExitRegimeC } from '../utils/regimeDetector'
import { processMacroData } from '../utils/macroDataProcessor'
import { backtestRegimePortfolio, generateBacktestReport } from '../utils/backtestEngine'
import { REGIMES } from '../config/regimeConfig'
import { getLiveIndianData } from '../utils/LiveIndianDataService' // Import Live Service
import usMacroHistorical from '../../data/processed/usMacroHistorical.json'
import indiaMacroHistorical from '../../data/processed/indiaMacroHistorical.json'
import BacktestResults from './BacktestResults'
import SixPillarsDashboard from './SixPillarsDashboard'

import { supabase } from '../utils/supabase'
import { fetchWithProxy, fetchBatch } from '../utils/apiOptimized'

export default function Step4ARegimeViews({
    selectedFunds,
    returns,
    allData,
    views,
    setViews,
    goToStep,
    macroData,
    setMacroData,
    currentRegime,
    setCurrentRegime,
    backtestResults,
    setBacktestResults,
    regimeContext,
    setRegimeContext
}) {
    const [regimeDetection, setRegimeDetection] = useState(null)
    const [missingAssets, setMissingAssets] = useState([])
    const [showBacktest, setShowBacktest] = useState(false)
    const [selectedRegion, setSelectedRegion] = useState('US') // US or IN
    const [regimeCExitEligible, setRegimeCExitEligible] = useState(false)
    const [disciplineProgress, setDisciplineProgress] = useState({ realRate: 0, correlation: 0, gold: 0 })
    const [isLiveUpdating, setIsLiveUpdating] = useState(false)

    // Initial loading - only from Supabase if it's there, but don't force detection yet
    // unless we have solid data. Actually, let's just let the selection screen be 
    // the entry point as the user requested "Method Selection".
    // Initial loading - only from Supabase if it's there
    useEffect(() => {
        const checkCloudCache = async () => {
            try {
                // Fetch latest data from specific country
                const country = selectedRegion === 'US' ? 'US' : 'India';
                const { data, error } = await supabase
                    .from('macro_data')
                    .select('*')
                    .eq('country', country)
                    .order('date', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!error && data) {
                    // Update context with last updated time but DON'T auto-load
                    // This allows the user to still see Method 1/2 choice
                    if (data.updated_at) {
                        setRegimeContext(prev => ({ ...prev, lastUpdated: data.updated_at }));
                    }
                }
            } catch (e) {
                console.warn('Supabase check failed', e);
            }
        };
        checkCloudCache();
    }, [selectedRegion]);

    // --- Live US Data Fetching (Client-Side for Firebase Free Tier) ---
    const fetchLiveUSData = async () => {
        setIsLiveUpdating(true);
        try {
            // 0. Check Supabase Cache First (Fastest)
            const { data: cache, error: cacheErr } = await supabase
                .from('macro_data')
                .select('*')
                .eq('country', 'US')
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!cacheErr && cache) {
                const lastUpdate = new Date(cache.updated_at);
                const now = new Date();
                const diffHours = (now - lastUpdate) / (1000 * 60 * 60);

                if (diffHours < 24) {
                    const mappedCacheEntry = {
                        date: cache.date,
                        wpiIndex: cache.wpi_index,
                        wpiInflation: cache.wpi_inflation,
                        cpiIndex: cache.cpi_index,
                        cpiInflation: cache.cpi_inflation,
                        repoRate: cache.repo_rate,
                        realRate: cache.real_rate,
                        nominalGDP: cache.nominal_gdp,
                        realGDP: cache.real_gdp,
                        gSecYield: cache.gsec_yield,
                        forexReserves: cache.forex_reserves,
                        inrUsd: cache.inr_usd,
                        bankCredit: cache.bank_credit,
                        valDate: cache.date
                    };

                    const merged = [...usMacroHistorical];
                    if (!merged.find(d => d.date === mappedCacheEntry.date)) {
                        merged.push(mappedCacheEntry);
                    }

                    setMacroData(processMacroData(merged));
                    setIsLiveUpdating(false);
                    return;
                }
            }

            // 1. Fallback to FRED API if cache is old or missing
            console.log('📡 Cache stale or missing, fetching from FRED...');
            // FRED API Key (Public/Free Tier Key - exposing in frontend is acceptable for free/personal apps)
            // FRED API Key (Moved to env var)
            const API_KEY = import.meta.env.VITE_FRED_API_KEY;
            const FRED_SERIES_MAP = {
                'FEDFUNDS': 'repoRate',
                'GDP': 'gdpNominal',
                'GDPC1': 'gdpIndex',
                'GFDEGDQ188S': 'debtToGDP',
                'PCEPI': 'pceIndex',
                'CPIAUCSL': 'cpiIndex',
                'A091RC1Q027SBEA': 'interest_expense',
                'DGS10': 'gSecYield',
                'SP500': 'sp500',
                'GOLDAMGBD228NLBM': 'goldPrice',
                'VIXCLS': 'vix',
                'M2SL': 'm2Money'
            };

            const today = new Date();
            const fourMonthsAgo = new Date();
            fourMonthsAgo.setMonth(today.getMonth() - 4);
            const startDateStr = fourMonthsAgo.toISOString().split('T')[0];

            // 1. Fetch latest data with Proxy Fallback (Throttled Batching)
            const seriesToFetch = Object.entries(FRED_SERIES_MAP);

            const { results: batchResults, errors: batchErrors } = await fetchBatch(
                seriesToFetch,
                async ([fredId, internalKey]) => {
                    const targetUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${fredId}&api_key=${API_KEY}&file_type=json&observation_start=${startDateStr}`;
                    const data = await fetchWithProxy(targetUrl);
                    return { key: internalKey, observations: data.observations };
                },
                { concurrency: 4 }
            );

            if (batchErrors.length > 0) {
                console.warn(`Some series failed to fetch: ${batchErrors.length}`);
            }

            const results = {};
            batchResults.forEach(res => {
                if (res.success && res.data.observations) {
                    results[res.data.key] = res.data.observations;
                }
            });

            // 2. Merge into existing macroData
            let newData = [...usMacroHistorical];

            const getRow = (dateStr) => {
                const yyyyMm = dateStr.substring(0, 7);
                let row = newData.find(r => r.date === yyyyMm);
                if (!row) {
                    row = { ...newData[newData.length - 1], date: yyyyMm, valDate: dateStr };
                    newData.push(row);
                }
                return row;
            };

            Object.entries(results).forEach(([key, obsList]) => {
                obsList.forEach(obs => {
                    const val = parseFloat(obs.value);
                    if (!isNaN(val)) {
                        const row = getRow(obs.date);
                        row[key] = val;
                        if (new Date(obs.date) > new Date(row.valDate)) row.valDate = obs.date;
                    }
                });
            });

            // 3. Re-calculate metrics
            newData.sort((a, b) => a.date.localeCompare(b.date));
            const processed = processMacroData(newData);
            setMacroData(processed);

            // 4. Save to Supabase (Strict Schema Alignment)
            try {
                const latestEntry = processed[processed.length - 1];
                const supabaseData = {
                    country: 'US',
                    date: latestEntry.date.length === 7 ? `${latestEntry.date}-01` : latestEntry.date,
                    wpi_index: latestEntry.wpiIndex || null,
                    wpi_inflation: latestEntry.wpiInflation || null,
                    cpi_index: latestEntry.cpiIndex || null,
                    cpi_inflation: latestEntry.cpiInflation || null,
                    repo_rate: latestEntry.repoRate || null,
                    real_rate: latestEntry.realRate || null,
                    nominal_gdp: latestEntry.gdpNominal || null,
                    real_gdp: latestEntry.gdpReal || latestEntry.gdpIndex || null,
                    gsec_yield: latestEntry.gSecYield || null,
                    forex_reserves: latestEntry.forexReserves || null,
                    inr_usd: 1.0,
                    bank_credit: latestEntry.bankCredit || null,
                    updated_at: new Date().toISOString()
                };

                const { error: syncError } = await supabase
                    .from('macro_data')
                    .upsert(supabaseData, { onConflict: 'country,date' });

                if (syncError) throw syncError;
                console.log("🇺🇸 US Cloud Sync Success!");
            } catch (e) {
                console.error("Error syncing US data to Supabase:", e);
                // Non-blocking for the UI but alerted in console
            }

        } catch (err) {
            console.error('US Live Fetch failed:', err);
            setIsLiveUpdating(false);
            alert('Live US Update encountered issues. Please try again or use static data.');
            setMacroData(processMacroData(usMacroHistorical));
        } finally {
            setIsLiveUpdating(false);
        }
    };

    const fetchLiveIndiaData = async () => {
        setIsLiveUpdating(true);
        try {
            // 0. Check Supabase Cache First (Fastest)
            const { data: cache, error: cacheErr } = await supabase
                .from('macro_data')
                .select('*')
                .eq('country', 'India')
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!cacheErr && cache) {
                const lastUpdate = new Date(cache.updated_at || cache.date);
                const now = new Date();
                const diffHours = (now - lastUpdate) / (1000 * 60 * 60);

                if (diffHours < 24) {
                    const mappedCacheEntry = {
                        date: cache.date,
                        wpiIndex: cache.wpi_index,
                        wpiInflation: cache.wpi_inflation,
                        cpiIndex: cache.cpi_index,
                        cpiInflation: cache.cpi_inflation,
                        repoRate: cache.repo_rate,
                        realRate: cache.real_rate,
                        nominalGDP: cache.nominal_gdp,
                        realGDP: cache.real_gdp,
                        gSecYield: cache.gsec_yield,
                        forexReserves: cache.forex_reserves,
                        inrUsd: cache.inr_usd,
                        bankCredit: cache.bank_credit,
                        valDate: cache.date
                    };

                    const merged = [...indiaMacroHistorical];
                    if (!merged.find(d => d.date === mappedCacheEntry.date)) {
                        merged.push(mappedCacheEntry);
                    }

                    setMacroData(processMacroData(merged));
                    setIsLiveUpdating(false);
                    return;
                }
            }

            // 1. Fallback to API
            console.log('📡 Cache stale or missing, fetching from India live service...');
            const currentData = indiaMacroHistorical;
            const updatedData = await getLiveIndianData(currentData);
            const processed = processMacroData(updatedData);
            setMacroData(processed);
            console.log('🇮🇳 India Macro Data Updated (Live)');

            // Save to Supabase (Persistence) - Alignment with updateSupabaseData.mjs
            try {
                const latestEntry = updatedData[updatedData.length - 1];
                const supabaseData = {
                    country: 'India',
                    date: latestEntry.date.length === 7 ? `${latestEntry.date}-01` : latestEntry.date,
                    wpi_index: latestEntry.wpiIndex || null,
                    wpi_inflation: latestEntry.wpiInflation || null,
                    cpi_index: latestEntry.cpiIndex || null,
                    cpi_inflation: latestEntry.cpiInflation || null,
                    repo_rate: latestEntry.repoRate || null,
                    real_rate: latestEntry.realRate || null,
                    nominal_gdp: latestEntry.nominalGDP || null,
                    real_gdp: latestEntry.realGDP || null,
                    gsec_yield: latestEntry.gSecYield || null,
                    forex_reserves: latestEntry.forexReserves || null,
                    inr_usd: latestEntry.inrUsd || null,
                    bank_credit: latestEntry.bankCredit || null,
                    updated_at: new Date().toISOString()
                };

                await supabase
                    .from('macro_data')
                    .upsert(supabaseData, { onConflict: 'country,date' });

                console.log("🇮🇳 India Cloud Sync Success!");
            } catch (e) {
                console.error("Error syncing India data to Supabase", e);
            }
        } catch (err) {
            console.error('India Fetch failed:', err);
            alert('Live India Update failed. Falling back to static data.');
            setMacroData(processMacroData(indiaMacroHistorical));
        } finally {
            setIsLiveUpdating(false);
        }
    };

    // Initial detection effect (dependent on macroData)
    useEffect(() => {
        if (macroData && macroData.length > 0) {
            // Process entire history to allow Bayesian updating and Sticky Hysteresis
            let historicalDetections = [];
            let previousProbs = null;
            let previousDominant = null;

            macroData.forEach(row => {
                const detection = detectRegime(
                    row,
                    previousProbs,
                    previousDominant,
                    historicalDetections,
                    0.3
                );
                historicalDetections.push(detection);
                previousProbs = detection.probabilities;
                previousDominant = detection.dominant;
            });

            const latestDetection = historicalDetections[historicalDetections.length - 1];


            setRegimeDetection(latestDetection);
            setCurrentRegime(latestDetection.dominant);

            // Set context for final report
            setRegimeContext(prev => ({
                ...prev,
                detection: latestDetection,
                timestamp: new Date().toISOString(),
                riskFreeRate: (macroData[macroData.length - 1].gSecYield || 7.0) / 100
            }));

            // Check if we should exit Regime C (requires history)
            const exitEligible = shouldExitRegimeC(historicalDetections);
            setRegimeCExitEligible(exitEligible);

            // Calculate "Discipline Progress" for Regime C exit tracking
            const discipline = calculateDisciplineProgress(historicalDetections);
            setDisciplineProgress(discipline);

            const missing = getMissingAssetClasses(selectedFunds, latestDetection.dominant);
            setMissingAssets(missing);
        }
    }, [macroData, selectedFunds, regimeContext?.manualOverride]);

    // Helper to calculate discipline progress (0-100%) for UI
    function calculateDisciplineProgress(history) {
        if (history.length < 1) return { realRate: 0, correlation: 0, gold: 0 };

        const last9 = history.slice(-9);
        const last6 = history.slice(-6);
        const last3 = history.slice(-3);

        return {
            realRate: Math.round((last9.filter(r => (r.indicators?.realRate || 0) > 1.0).length / 9) * 100),
            correlation: Math.round((last6.filter(r => (r.indicators?.bondEquityCorr || 0) < -0.2).length / 6) * 100),
            gold: Math.round((last3.filter(r => (r.indicators?.cbGoldBuying || 0) < 0).length / 3) * 100)
        };
    }

    // Removed loadPreloadedData as it is replaced by the async initData effect above

    const addView = () => {
        setViews([...views, {
            type: 'absolute',
            assetIdx: 0,
            asset1Idx: 0,
            asset2Idx: Math.min(1, returns.codes.length - 1),
            return: 0.0,
            confidence: 0.5
        }])
    }

    const updateView = (idx, field, value) => {
        const newViews = [...views]
        newViews[idx][field] = value

        // Validate view doesn't violate regime constraints
        // (Implementation in next iteration)

        setViews(newViews)
    }

    const removeView = (idx) => {
        setViews(views.filter((_, i) => i !== idx))
    }

    const runBacktest = () => {
        if (!macroData || macroData.length < 2) {
            alert('Please upload macro data first')
            return
        }

        if (!returns || !returns.dates || returns.dates.length < 2) {
            alert('Insufficient return data. Please ensure you have completed Step 2.')
            return
        }

        try {
            const startDate = macroData[0].date
            const endDate = macroData[macroData.length - 1].date

            console.log('🔄 Running backtest:', { startDate, endDate, fundsCount: selectedFunds.length })

            const results = backtestRegimePortfolio(
                selectedFunds,
                returns,
                macroData,
                startDate,
                endDate,
                'annual',
                100000
            )

            const report = generateBacktestReport(results)
            console.log('✅ Backtest complete:', report)

            setBacktestResults(report)
            setShowBacktest(true)
        } catch (error) {
            console.error('❌ Backtest error:', error)
            alert(`Backtest failed: ${error.message}`)
        }
    }

    const proceedToOptimization = () => {
        if (!regimeDetection) {
            alert('Please upload macro data first')
            return
        }

        if (missingAssets.length > 0) {
            const confirm = window.confirm(
                `Warning: Missing required asset classes: ${missingAssets.join(', ')}. ` +
                `This may result in suboptimal allocation. Continue anyway?`
            )
            if (!confirm) return
        }

        goToStep('5A') // Go to Regime Optimization
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Macro Data Upload */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <Upload className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Step 4A: Regime Detection & Views</h2>
                        <p className="text-gray-500">Select market region to detect current market regime</p>
                    </div>
                </div>

                {!macroData ? (
                    <div className="border border-indigo-100 bg-indigo-50/30 rounded-[2rem] p-10 text-center animate-fade-in">
                        <BarChart3 className="mx-auto text-indigo-400 mb-6" size={48} />
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Select Market Region</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">
                            Our Bayesian engine uses historical macro indicators to detect the current regime.
                        </p>

                        <div className="relative flex-1 w-full">
                            <select
                                value={selectedRegion}
                                onChange={(e) => setSelectedRegion(e.target.value)}
                                className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-4 px-6 pr-10 rounded-2xl leading-tight focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 font-bold cursor-pointer h-full transition-all"
                            >
                                <option value="US">🇺🇸 United States (FED Data)</option>
                                <option value="IN">🇮🇳 India (RBI/NSO Data)</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                <Target size={18} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            {/* Method 1: API */}
                            <button
                                onClick={selectedRegion === 'US' ? fetchLiveUSData : fetchLiveIndiaData}
                                disabled={isLiveUpdating}
                                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all ${isLiveUpdating
                                    ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-white border-indigo-100 hover:border-indigo-500 hover:shadow-xl group'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLiveUpdating ? 'bg-slate-200' : 'bg-indigo-600 group-hover:scale-110 transition-transform'}`}>
                                    {isLiveUpdating ? (
                                        <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <Activity className="text-white" size={24} />
                                    )}
                                </div>
                                <div className="text-center">
                                    <span className={`block font-black text-sm ${isLiveUpdating ? 'text-slate-400' : 'text-slate-900'}`}>Method 1: Live Update</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                        {selectedRegion === 'US' ? 'Fetch from FRED API' : 'Fetch from RBI/NSO'}
                                    </span>
                                </div>
                            </button>

                            {/* Method 2: Static JSON */}
                            <button
                                onClick={() => {
                                    const data = selectedRegion === 'US' ? usMacroHistorical : indiaMacroHistorical;
                                    setMacroData(processMacroData(data));
                                }}
                                disabled={isLiveUpdating}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 bg-white border-emerald-100 hover:border-emerald-500 hover:shadow-xl group transition-all"
                            >
                                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Database className="text-white" size={24} />
                                </div>
                                <div className="text-center">
                                    <span className="block font-black text-sm text-slate-900">Method 2: Static (JSON)</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Use Historical Baseline</span>
                                </div>
                            </button>
                        </div>

                        <p className="text-[10px] text-slate-400 font-medium text-center mt-6">
                            * Method 1 connects to FRED (St. Louis Fed) via proxy. Method 2 uses the bundled dataset.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity className="text-indigo-600" size={18} />
                                <h4 className="font-bold text-gray-800 text-sm">Regime Probabilities</h4>
                                <div className="ml-auto flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Confidence:</span>
                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${regimeDetection?.confidence > 0.7 ? 'bg-green-100 text-green-700' :
                                        regimeDetection?.confidence > 0.4 ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                        {(regimeDetection?.confidence * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle className="text-green-600" size={20} />
                                <span className="font-bold text-green-900">
                                    Macro data loaded ({macroData.length} months)
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={selectedRegion === 'US' ? fetchLiveUSData : fetchLiveIndiaData}
                                    disabled={isLiveUpdating}
                                    className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-bold flex items-center gap-1"
                                >
                                    {isLiveUpdating ? 'Updating...' : 'Update (Live)'}
                                </button>
                                <button
                                    onClick={() => setMacroData(null)}
                                    className="text-sm text-green-700 hover:text-green-900 font-bold"
                                >
                                    Change Data
                                </button>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* Regime Detection Results */}
            {
                regimeDetection && (
                    <div className="space-y-6">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Activity className="text-indigo-600" size={24} />
                                6 Pillars: Fiscal Dominance Monitor (Regime C)
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">Specific indicators tracking transition into inflationary debt spiral</p>
                        </div>
                        <SixPillarsDashboard
                            indicators={regimeDetection.indicators}
                            scores={regimeDetection.scores}
                            regimeScore={regimeDetection.probabilities.REGIME_C}
                        />

                        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <BarChart3 className="text-indigo-600" size={24} />
                                Current Regime Detection
                            </h3>

                            {/* Regime Probabilities */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {Object.entries(regimeDetection.probabilities).map(([regime, prob]) => (
                                    <RegimeProbabilityBar
                                        key={regime}
                                        regime={regime}
                                        probability={prob}
                                        isActive={regime === regimeDetection.dominant}
                                    />
                                ))}
                            </div>

                            {/* Dominant Regime Info */}
                            <div className="p-6 bg-indigo-50 border border-indigo-200 rounded-xl">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-indigo-100 rounded-lg">
                                        <Target className="text-indigo-600" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-indigo-900 mb-1">
                                            Current Regime (Latest): {REGIMES[regimeDetection.dominant]?.name}
                                        </h4>
                                        <p className="text-xs text-indigo-600 mb-3 font-semibold">
                                            Based on most recent macro data • Used for Step 5A optimization
                                        </p>
                                        <p className="text-sm text-indigo-700 mb-3">
                                            {REGIMES[regimeDetection.dominant]?.description}
                                        </p>
                                        <div className="text-xs text-indigo-600 font-bold">
                                            Confidence: {(regimeDetection.confidence * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Sticky Lock Warning - Show when dominant differs from natural leader */}
                                {regimeDetection.isSticky && (() => {
                                    const naturalLeader = Object.entries(regimeDetection.probabilities)
                                        .sort((a, b) => b[1] - a[1])[0];

                                    if (naturalLeader[0] !== regimeDetection.dominant) {
                                        return (
                                            <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Lock size={16} className="text-amber-700" />
                                                    <span className="text-sm font-bold text-amber-900">INSTITUTIONAL DISCIPLINE ACTIVE</span>
                                                </div>
                                                <p className="text-xs text-amber-800 leading-relaxed">
                                                    Current probabilities favor <strong>{REGIMES[naturalLeader[0]]?.shortName || REGIMES[naturalLeader[0]]?.name}</strong> ({(naturalLeader[1] * 100).toFixed(1)}%),
                                                    but institutional discipline keeps us in <strong>{REGIMES[regimeDetection.dominant]?.shortName || REGIMES[regimeDetection.dominant]?.name}</strong> until strict exit conditions are met.
                                                    This prevents regime whipsaws and maintains portfolio stability.
                                                </p>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>

                            {/* Allocation Bands */}
                            {REGIMES[regimeDetection.dominant]?.allocationBands && (
                                <div className="mt-6">
                                    <h4 className="font-bold text-gray-700 mb-3">Allocation Bands for This Regime:</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {Object.entries(REGIMES[regimeDetection.dominant].allocationBands).map(([assetClass, band]) => (
                                            <div key={assetClass} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="text-xs font-bold text-gray-500 uppercase mb-1">{assetClass.replace('_', ' ')}</div>
                                                <div className="text-sm font-black text-gray-800">
                                                    {(band.min * 100).toFixed(0)}% - {(band.max * 100).toFixed(0)}%
                                                </div>
                                                <div className="text-xs text-gray-500">Target: {(band.target * 100).toFixed(0)}%</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Regime Selection Logic Summary */}
            {
                regimeDetection && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="text-amber-600" size={18} />
                            <h4 className="font-bold text-amber-900 text-sm">Regime Selection Logic Insight (Bayesian)</h4>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed">
                            The AI updated its belief to <strong>{REGIMES[regimeDetection.dominant].name}</strong> with {(regimeDetection.confidence * 100).toFixed(0)}% confidence scalar because:
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-amber-700 list-disc list-inside">
                            {regimeDetection.dominant === 'REGIME_A' && (
                                <>
                                    <li><strong>Real Rates:</strong> Currently {(regimeDetection.indicators.realRate || 0).toFixed(2)}% (Target &gt; 1.5%)</li>
                                    <li><strong>Hedge Effectiveness:</strong> Bond-Equity correlation is {(regimeDetection.indicators.bondEquityCorr || 0).toFixed(2)}</li>
                                    <li><strong>Volatility:</strong> Inflation/Growth ratio is {(regimeDetection.indicators.volatilityRatio || 1).toFixed(2)}</li>
                                </>
                            )}
                            {regimeDetection.dominant === 'REGIME_C' && (
                                <>
                                    <li><strong>Repression Signal:</strong> Volatility ratio is {(regimeDetection.indicators.volatilityRatio || 1).toFixed(2)}</li>
                                    <li><strong>Institutional:</strong> CB Gold buying Intensity is {(regimeDetection.indicators.cbGoldBuying || 0).toFixed(1)}</li>
                                </>
                            )}
                        </ul>

                        {/* Discipline Tracker for Regime C Exit */}
                        {regimeDetection.dominant === 'REGIME_C' && (
                            <div className="mt-4 pt-4 border-t border-amber-200">
                                <h5 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-2">Institutional Discipline Progress (Exit Rules)</h5>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[8px] font-bold text-amber-700">
                                            <span>REAL RATES (&gt;1%)</span>
                                            <span>{disciplineProgress.realRate}%</span>
                                        </div>
                                        <div className="h-1 bg-amber-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-600" style={{ width: `${disciplineProgress.realRate}%` }} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[8px] font-bold text-amber-700">
                                            <span>CORR (&lt;-0.2)</span>
                                            <span>{disciplineProgress.correlation}%</span>
                                        </div>
                                        <div className="h-1 bg-amber-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-600" style={{ width: `${disciplineProgress.correlation}%` }} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[8px] font-bold text-amber-700">
                                            <span>GOLD (&lt;0)</span>
                                            <span>{disciplineProgress.gold}%</span>
                                        </div>
                                        <div className="h-1 bg-amber-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-600" style={{ width: `${disciplineProgress.gold}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[9px] text-amber-600 mt-2 italic">*All three bars must hit 100% (sustained 9/6/3 months) to exit Fiscal Dominance.</p>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Missing Asset Classes Alert */}
            {
                missingAssets.length > 0 && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="text-red-600 flex-shrink-0" size={24} />
                            <div>
                                <h4 className="font-bold text-red-900 mb-2">Mandatory Portfolio Requirement</h4>
                                <p className="text-sm text-red-700 mb-3">
                                    For optimal performance in {REGIMES[regimeDetection?.dominant]?.name}, you must include:
                                </p>
                                <ul className="list-disc list-inside text-sm text-red-700 mb-4">
                                    {missingAssets.map(asset => {
                                        let hint = '';
                                        if (asset === 'DEBT_SHORT') hint = ' (Liquid, Overnight, Low Duration, or Ultra Short funds)';
                                        if (asset === 'DEBT_MEDIUM' || asset === 'DEBT_LONG') hint = ' (Long Term Debt / Gilt / Medium Term / Dynamic Debt)';
                                        if (asset === 'EQUITY') hint = ' (Large, Mid, or Flexi Cap funds)';
                                        if (asset === 'GOLD') hint = ' (Gold ETF or Silver Funds)';

                                        return <li key={asset}><strong>{asset.replace('_', ' ')}</strong>{hint}</li>;
                                    })}
                                </ul>
                                <button
                                    onClick={() => goToStep(1)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm"
                                >
                                    Go Back & Add Funds
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Views Section (Similar to existing Step4SetViews) */}
            {
                regimeDetection && (
                    <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Target className="text-indigo-600" size={24} />
                                Express Market Views (Within Regime Constraints)
                            </h3>
                            <button
                                onClick={addView}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Add View
                            </button>
                        </div>

                        {views.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                <Target className="mx-auto text-slate-300 mb-4" size={48} />
                                <h4 className="text-slate-600 font-semibold mb-2">No views defined</h4>
                                <button
                                    onClick={addView}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm"
                                >
                                    Add First View
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Array.isArray(views) && views.map((view, idx) => (
                                    <ViewEditor
                                        key={idx}
                                        view={view}
                                        idx={idx}
                                        returns={returns}
                                        allData={allData}
                                        updateView={updateView}
                                        removeView={removeView}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            {/* Historical Backtesting Option */}
            {
                regimeDetection && (
                    <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Historical Backtesting</h3>
                                <p className="text-sm text-gray-500">See how this regime-based strategy performed historically (2001-2025)</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={runBacktest}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm"
                                >
                                    {backtestResults ? 'Refresh Backtest' : 'Run Backtest'}
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                            <p className="text-xs text-blue-800 leading-relaxed">
                                <strong>Note:</strong> The backtest below shows <strong>historical regime distribution (2001-2025)</strong> across all years.
                                The "Current Regime (Latest)" shown above represents the <strong>most recent state</strong> based on latest macro data.
                                Step 5A optimization uses the current regime, not the historical average.
                            </p>
                        </div>

                        {showBacktest && backtestResults && (
                            <div className="mt-4">
                                <BacktestResults backtestData={backtestResults} />
                            </div>
                        )}
                    </div>
                )
            }

            {/* Proceed Button */}
            {
                regimeDetection && (
                    <div className="flex justify-between items-center pt-6">
                        <button
                            onClick={() => goToStep(4)}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold"
                        >
                            ← Back to Path Selection
                        </button>
                        <button
                            onClick={proceedToOptimization}
                            className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-lg flex items-center gap-3 shadow-xl"
                        >
                            Proceed to Regime Optimization (Step 5A)
                            <CheckCircle size={22} />
                        </button>
                    </div>
                )
            }
        </div >
    )
}

function RegimeProbabilityBar({ regime, probability, isActive }) {
    const regimeInfo = REGIMES[regime]
    const percentage = (probability * 100).toFixed(1)

    return (
        <div className={`p-4 rounded-lg border-2 transition ${isActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50'
            }`}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-700">{regimeInfo?.shortName || regime}</span>
                <span className={`text-lg font-black ${isActive ? 'text-indigo-600' : 'text-gray-600'}`}>
                    {percentage}%
                </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${isActive ? 'bg-indigo-600' : 'bg-gray-400'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}

function ViewEditor({ view, idx, returns, allData, updateView, removeView }) {
    return (
        <div className="group relative bg-white border-2 border-slate-100 rounded-xl p-6 hover:border-indigo-200 hover:shadow-lg transition">
            <button
                onClick={() => removeView(idx)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 shadow-sm transition opacity-0 group-hover:opacity-100"
            >
                <X size={16} />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Type Toggle */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
                        <button
                            onClick={() => updateView(idx, 'type', 'absolute')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${view.type === 'absolute' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                                }`}
                        >
                            Absolute View
                        </button>
                        <button
                            onClick={() => updateView(idx, 'type', 'relative')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${view.type === 'relative' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                                }`}
                        >
                            Relative View
                        </button>
                    </div>

                    {/* Fund Selection */}
                    <div className="space-y-2">
                        {view.type === 'absolute' ? (
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Fund</label>
                                <select
                                    value={view.assetIdx}
                                    onChange={(e) => updateView(idx, 'assetIdx', parseInt(e.target.value))}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {returns.codes.map((code, i) => (
                                        <option key={i} value={i}>{allData[code].name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outperforming Fund</label>
                                    <select
                                        value={view.asset1Idx || 0}
                                        onChange={(e) => updateView(idx, 'asset1Idx', parseInt(e.target.value))}
                                        className="w-full p-3 bg-green-50 text-green-800 border-none rounded-xl text-sm font-semibold outline-none"
                                    >
                                        {returns.codes.map((code, i) => (
                                            <option key={i} value={i}>{allData[code].name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Underperforming Fund</label>
                                    <select
                                        value={view.asset2Idx || 1}
                                        onChange={(e) => updateView(idx, 'asset2Idx', parseInt(e.target.value))}
                                        className="w-full p-3 bg-red-50 text-red-800 border-none rounded-xl text-sm font-semibold outline-none"
                                    >
                                        {returns.codes.map((code, i) => (
                                            <option key={i} value={i}>{allData[code].name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Return Input */}
                <div className="lg:col-span-3">
                    <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            {view.type === 'absolute' ? 'Expected Annual %' : 'Expected Outperformance %'}
                        </label>
                        <div className="flex items-center justify-center gap-1">
                            <input
                                type="number"
                                step="0.1"
                                value={(view.return * 100).toFixed(1)}
                                onChange={(e) => updateView(idx, 'return', parseFloat(e.target.value) / 100)}
                                className="w-20 bg-transparent text-2xl font-black text-slate-800 focus:outline-none text-center"
                            />
                            <span className="text-lg font-bold text-slate-400">%</span>
                        </div>
                    </div>
                </div>

                {/* Confidence */}
                <div className="lg:col-span-4">
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">View Confidence</label>
                            <span className="text-sm font-black text-indigo-700">{(view.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={view.confidence * 100}
                            onChange={(e) => updateView(idx, 'confidence', parseInt(e.target.value) / 100)}
                            className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
