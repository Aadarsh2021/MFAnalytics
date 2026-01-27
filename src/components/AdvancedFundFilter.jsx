import { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, RefreshCw } from 'lucide-react';
import { categorizeFund, getSubCategoryByKeywords } from '../utils/fundCategorization';

/**
 * Grouped Multi-Select Dropdown Component
 * Shows options grouped by parent category
 */
function GroupedMultiSelectDropdown({ label, groupedOptions, selected, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOption = (option) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const selectAll = () => {
        const allOptions = Object.values(groupedOptions).flat();
        onChange(allOptions);
    };

    const clearAll = () => {
        onChange([]);
    };

    const selectGroup = (groupOptions) => {
        const newSelected = [...selected];
        groupOptions.forEach(option => {
            if (!newSelected.includes(option)) {
                newSelected.push(option);
            }
        });
        onChange(newSelected);
    };

    return (
        <div className="relative">
            <label className="block text-sm font-bold text-gray-800 mb-2">
                {label}
            </label>

            {/* Dropdown Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-between hover:border-indigo-400 transition"
            >
                <span className="text-sm text-gray-700">
                    {selected.length === 0
                        ? placeholder
                        : `${selected.length} selected`}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                    {/* Select All / Clear All */}
                    <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-2 flex gap-2 z-10">
                        <button
                            onClick={selectAll}
                            className="flex-1 px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-medium transition"
                        >
                            Select All
                        </button>
                        <button
                            onClick={clearAll}
                            className="flex-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition"
                        >
                            Clear All
                        </button>
                    </div>

                    {/* Grouped Options */}
                    <div className="p-2">
                        {Object.entries(groupedOptions).map(([groupName, options]) => {
                            if (options.length === 0) return null;

                            const groupColor =
                                groupName === 'Equity' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                    groupName === 'Debt' ? 'bg-green-50 text-green-800 border-green-200' :
                                        groupName === 'Hybrid' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                            groupName === 'Gold' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                                'bg-gray-50 text-gray-800 border-gray-200';

                            return (
                                <div key={groupName} className="mb-3">
                                    {/* Group Header */}
                                    <div className={`sticky top-12 ${groupColor} px-3 py-2 rounded-t-lg border-2 flex items-center justify-between font-bold text-sm`}>
                                        <span>{groupName} ({options.length})</span>
                                        <button
                                            onClick={() => selectGroup(options)}
                                            className="text-xs px-2 py-0.5 bg-white bg-opacity-50 hover:bg-opacity-100 rounded transition"
                                        >
                                            Select All
                                        </button>
                                    </div>

                                    {/* Group Options */}
                                    <div className="border-2 border-t-0 border-gray-200 rounded-b-lg p-2 bg-white">
                                        {options.map(option => (
                                            <label
                                                key={option}
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 rounded cursor-pointer transition"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected.includes(option)}
                                                    onChange={() => toggleOption(option)}
                                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-gray-800">{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Selected Items Display */}
            {selected.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {selected.map(item => (
                        <span
                            key={item}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium"
                        >
                            {item}
                            <button
                                onClick={() => toggleOption(item)}
                                className="hover:bg-indigo-200 rounded-full p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Advanced Fund Filter Component with Grouped Sub-Categories
 */
export default function AdvancedFundFilter({
    allFunds,
    onFilteredResults,
    searchQuery
}) {
    // Filter states
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedSubCategories, setSelectedSubCategories] = useState([]);
    const [excludeFilters, setExcludeFilters] = useState({
        fmp: true,
        sdl: true,
        direct: true,
        idcw: true
    });

    const [showFilters, setShowFilters] = useState(false); // Collapsed by default
    const [stats, setStats] = useState({
        total: 0,
        filtered: 0
    });

    // Extract and group sub-categories by parent category
    const [groupedSubCategories, setGroupedSubCategories] = useState({
        Equity: [],
        Debt: [],
        Hybrid: [],
        Gold: [],
        Unknown: []
    });

    useEffect(() => {
        if (allFunds && allFunds.length > 0) {
            const grouped = {
                Equity: new Set(),
                Debt: new Set(),
                Hybrid: new Set(),
                Gold: new Set(),
                Unknown: new Set()
            };

            allFunds.forEach(fund => {
                let category = 'Unknown';
                let subCategory = '';

                // Priority: SEBI Category from data
                if (fund.sebiCategory && fund.sebiCategory !== 'Not Available') {
                    const parts = fund.sebiCategory.split(' - ');
                    if (parts.length > 1) {
                        subCategory = parts[1].trim();
                        category = mapSEBICategoryToSimple(fund.sebiCategory, fund.schemeName || fund.name || '');
                    }
                }

                // Fallback: Name-guessing if still Unknown or missing subCategory
                if (category === 'Unknown' || !subCategory) {
                    const guessed = getSubCategoryByKeywords(fund.schemeName || fund.name || '');
                    if (category === 'Unknown') category = guessed.category;
                    if (!subCategory) subCategory = guessed.subCategory;
                }

                if (subCategory) {
                    if (category === 'Equity') grouped.Equity.add(subCategory);
                    else if (category === 'Debt') grouped.Debt.add(subCategory);
                    else if (category === 'Hybrid') grouped.Hybrid.add(subCategory);
                    else if (category === 'Gold') grouped.Gold.add(subCategory);
                    else grouped.Unknown.add(subCategory);
                }
            });

            // Convert Sets to sorted arrays
            const finalGrouped = {
                Equity: Array.from(grouped.Equity).sort(),
                Debt: Array.from(grouped.Debt).sort(),
                Hybrid: Array.from(grouped.Hybrid).sort(),
                Gold: Array.from(grouped.Gold).sort(),
                Unknown: Array.from(grouped.Unknown).sort()
            };

            console.log('📊 Sub-Categories Extracted:', finalGrouped);

            setGroupedSubCategories(finalGrouped);
        }
    }, [allFunds]);

    // Apply filters
    useEffect(() => {
        if (!allFunds || allFunds.length === 0) {
            onFilteredResults([]);
            return;
        }

        let filtered = [...allFunds];

        // Apply search query filter
        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const terms = query.split(/\s+/).filter(t => t.length > 0);

            filtered = filtered.filter(fund => {
                const name = (fund.schemeName || fund.name || '').toLowerCase();
                return terms.every(term => name.includes(term));
            });
        }

        // Apply exclude filters
        filtered = filtered.filter(fund => {
            const name = (fund.schemeName || fund.name || '').toLowerCase();

            if (excludeFilters.fmp && (
                name.includes('fmp') ||
                name.includes('fixed maturity') ||
                name.includes('series') ||
                name.includes('capital protection')
            )) {
                return false;
            }

            if (excludeFilters.sdl && (
                name.includes('sdl') ||
                name.includes('state development') ||
                name.includes('state govt')
            )) {
                return false;
            }

            if (excludeFilters.direct && (
                name.includes('direct') ||
                name.includes(' dir ') ||
                name.endsWith(' dir')
            )) {
                return false;
            }

            if (excludeFilters.idcw && (
                name.includes('idcw') ||
                name.includes('dividend') ||
                name.includes('payout') ||
                name.includes('reinvestment')
            )) {
                return false;
            }

            return true;
        });

        // Categorize and Tag all filtered funds
        const categorized = filtered.map(fund => {
            let category = fund.category || 'Unknown';
            let subCategory = fund.subCategory || '';

            if (fund.sebiCategory && fund.sebiCategory !== 'Not Available') {
                const parts = fund.sebiCategory.split(' - ');
                if (parts.length > 1) {
                    subCategory = parts[1].trim();
                    if (category === 'Unknown') {
                        category = mapSEBICategoryToSimple(fund.sebiCategory, fund.schemeName || fund.name || '');
                    }
                }
            }

            // Final check: guessing if still missing
            if (category === 'Unknown' || !subCategory) {
                const guessed = getSubCategoryByKeywords(fund.schemeName || fund.name || '');
                if (category === 'Unknown') category = guessed.category;
                if (!subCategory) subCategory = guessed.subCategory;
            }

            return {
                ...fund,
                category,
                subCategory
            };
        });

        // Apply category filters
        let categoryFiltered = categorized;
        if (selectedCategories.length > 0) {
            categoryFiltered = categoryFiltered.filter(fund =>
                selectedCategories.includes(fund.category)
            );
        }

        // Apply sub-category filters
        let finalFiltered = categoryFiltered;
        if (selectedSubCategories.length > 0) {
            finalFiltered = finalFiltered.filter(fund =>
                selectedSubCategories.includes(fund.subCategory)
            );
        }

        // Calculate statistics
        const newStats = {
            total: allFunds.length,
            filtered: finalFiltered.length
        };

        setStats(newStats);
        onFilteredResults(finalFiltered);

    }, [allFunds, selectedCategories, selectedSubCategories, excludeFilters, searchQuery, onFilteredResults]);

    const toggleExclude = (filter) => {
        setExcludeFilters(prev => ({
            ...prev,
            [filter]: !prev[filter]
        }));
    };

    const resetFilters = () => {
        setSelectedCategories([]);
        setSelectedSubCategories([]);
        setExcludeFilters({
            fmp: true,
            sdl: true,
            direct: true,
            idcw: true
        });
    };

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg border-2 border-indigo-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                            <Filter className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Advanced Filters</h3>
                            <p className="text-xs text-indigo-100">
                                {stats.filtered} of {stats.total} funds shown
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg text-sm font-medium transition"
                    >
                        {showFilters ? 'Hide' : 'Show'}
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="p-5 space-y-5">
                    {/* Multi-Select Dropdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Main Category Filter */}
                        <div className="relative">
                            <label className="block text-sm font-bold text-gray-800 mb-2">
                                📊 Main Categories
                            </label>
                            <div className="space-y-2">
                                {['Equity', 'Debt', 'Hybrid', 'Gold', 'Unknown'].map(category => (
                                    <label
                                        key={category}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${selectedCategories.includes(category)
                                            ? category === 'Equity' ? 'bg-blue-500 border-blue-600 text-white shadow-lg' :
                                                category === 'Debt' ? 'bg-green-500 border-green-600 text-white shadow-lg' :
                                                    category === 'Hybrid' ? 'bg-purple-500 border-purple-600 text-white shadow-lg' :
                                                        category === 'Gold' ? 'bg-yellow-500 border-yellow-600 text-white shadow-lg' :
                                                            'bg-gray-500 border-gray-600 text-white shadow-lg'
                                            : 'bg-white border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCategories.includes(category)}
                                            onChange={() => {
                                                if (selectedCategories.includes(category)) {
                                                    setSelectedCategories(selectedCategories.filter(c => c !== category));
                                                } else {
                                                    setSelectedCategories([...selectedCategories, category]);
                                                }
                                            }}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-semibold flex-1">{category}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Sub-Category Filter - Only show sub-categories from selected main categories */}
                        <GroupedMultiSelectDropdown
                            label="📋 Sub-Categories (SEBI)"
                            groupedOptions={{
                                Equity: (selectedCategories.length === 0 || selectedCategories.includes('Equity')) ? groupedSubCategories.Equity : [],
                                Debt: (selectedCategories.length === 0 || selectedCategories.includes('Debt')) ? groupedSubCategories.Debt : [],
                                Hybrid: (selectedCategories.length === 0 || selectedCategories.includes('Hybrid')) ? groupedSubCategories.Hybrid : [],
                                Gold: (selectedCategories.length === 0 || selectedCategories.includes('Gold')) ? groupedSubCategories.Gold : [],
                                Unknown: (selectedCategories.length === 0 || selectedCategories.includes('Unknown')) ? groupedSubCategories.Unknown : []
                            }}
                            selected={selectedSubCategories}
                            onChange={setSelectedSubCategories}
                            placeholder="Select sub-categories..."
                        />
                    </div>

                    {/* Exclude Filters */}
                    <div>
                        <label className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                            <span className="w-1 h-5 bg-gradient-to-b from-red-500 to-orange-500 rounded"></span>
                            Exclude Fund Types
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${excludeFilters.fmp
                                ? 'bg-red-50 border-red-300 hover:bg-red-100'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={excludeFilters.fmp}
                                    onChange={() => toggleExclude('fmp')}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-gray-800">FMP</div>
                                    <div className="text-xs text-gray-500">Fixed Maturity</div>
                                </div>
                            </label>

                            <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${excludeFilters.sdl
                                ? 'bg-red-50 border-red-300 hover:bg-red-100'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={excludeFilters.sdl}
                                    onChange={() => toggleExclude('sdl')}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-gray-800">SDL</div>
                                    <div className="text-xs text-gray-500">State Dev Loans</div>
                                </div>
                            </label>

                            <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${excludeFilters.direct
                                ? 'bg-red-50 border-red-300 hover:bg-red-100'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={excludeFilters.direct}
                                    onChange={() => toggleExclude('direct')}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-gray-800">Direct</div>
                                    <div className="text-xs text-gray-500">Direct Plans</div>
                                </div>
                            </label>

                            <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${excludeFilters.idcw
                                ? 'bg-red-50 border-red-300 hover:bg-red-100'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={excludeFilters.idcw}
                                    onChange={() => toggleExclude('idcw')}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-gray-800">IDCW</div>
                                    <div className="text-xs text-gray-500">Dividend</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Reset Button */}
                    <div className="flex items-center justify-between pt-3 border-t-2 border-gray-200">
                        <div className="text-sm text-gray-600">
                            <span className="font-semibold text-indigo-600">{stats.filtered}</span> funds match your filters
                        </div>
                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg font-semibold flex items-center gap-2 transition shadow-md hover:shadow-lg"
                        >
                            <X size={16} />
                            Reset Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
