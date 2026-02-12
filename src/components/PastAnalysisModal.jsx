import { useState, useEffect } from 'react'
import { X, Search, Filter, Calendar, ExternalLink, Trash2, Database, History, ChevronRight, Hash } from 'lucide-react'
import { supabase } from '../utils/supabase'

export default function PastAnalysisModal({ isOpen, onClose, onLoadHistory, history = [], loading = false }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterRegion, setFilterRegion] = useState('all')
    const [selectedId, setSelectedId] = useState(null)

    const deleteEntry = async (id, e) => {
        e.stopPropagation()
        if (!window.confirm('Are you sure you want to delete this analysis?')) return

        try {
            const { error } = await supabase
                .from('analyses')
                .delete()
                .eq('id', id)

            if (error) throw error
            window.dispatchEvent(new Event('mfp-history-update'))
            if (selectedId === id) setSelectedId(null)
        } catch (e) {
            console.error("Error deleting entry:", e)
        }
    }

    const filteredHistory = history.filter(item => {
        const matchesSearch = Array.isArray(item.funds) &&
            item.funds.some(f => f && f.toLowerCase().includes(searchTerm.toLowerCase()))

        const region = item.state?.regimeContext?.detection?.region?.toLowerCase() || 'unknown'
        const matchesRegion = filterRegion === 'all' || region === filterRegion

        return matchesSearch && matchesRegion
    })

    const selectedItem = history.find(item => item.id === selectedId)

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-6xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white to-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <History className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Past Analysis Vault</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Explore & Restore Historical Reports</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-1 border-r border-slate-200 hidden md:flex items-center">
                        <Filter size={16} className="text-slate-400" />
                    </div>

                    <div className="md:col-span-7 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                            type="text"
                            placeholder="Search by fund name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none shadow-sm"
                        />
                    </div>

                    <div className="md:col-span-4 flex gap-2">
                        <select
                            value={filterRegion}
                            onChange={(e) => setFilterRegion(e.target.value)}
                            className="flex-1 p-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        >
                            <option value="all">All Regions</option>
                            <option value="india">India</option>
                            <option value="us">US</option>
                        </select>

                        <button
                            onClick={loadHistory}
                            className="p-3 bg-white border border-slate-200 text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all shadow-sm"
                            title="Refresh List"
                        >
                            <History size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Body */}
                <div className="flex-1 flex overflow-hidden">

                    {/* List Sidebar */}
                    <div className="w-full md:w-[400px] border-r border-slate-100 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="h-28 bg-white rounded-3xl animate-pulse border border-slate-100" />
                            ))
                        ) : filteredHistory.length === 0 ? (
                            <div className="text-center py-20">
                                <Search className="mx-auto text-slate-200 mb-4" size={48} />
                                <p className="text-slate-400 font-bold">No matching records found</p>
                            </div>
                        ) : (
                            filteredHistory.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id)}
                                    className={`p-5 rounded-3xl cursor-pointer transition-all border-2 group relative ${selectedId === item.id
                                        ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 translate-x-1'
                                        : 'bg-white border-transparent hover:border-indigo-100 hover:shadow-lg'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedId === item.id ? 'bg-indigo-400 text-white' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </div>
                                        <button
                                            onClick={(e) => deleteEntry(item.id, e)}
                                            className={`${selectedId === item.id ? 'text-indigo-300 hover:text-white' : 'text-slate-300 hover:text-red-500'} transition-colors`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <p className={`text-sm font-black line-clamp-2 leading-tight ${selectedId === item.id ? 'text-white' : 'text-slate-800'}`}>
                                        {item.funds.join(', ')}
                                    </p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className={`text-[10px] font-bold ${selectedId === item.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            {item.state?.regimeContext?.detection?.region || 'Global'} Analysis
                                        </span>
                                        <ChevronRight size={16} className={selectedId === item.id ? 'text-white' : 'text-indigo-500'} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Details Pane */}
                    <div className="hidden md:flex flex-1 bg-white p-10 flex-col overflow-y-auto">
                        {!selectedItem ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <Database size={80} className="text-slate-300 mb-6" />
                                <h3 className="text-2xl font-black text-slate-400">Select an entry to view details</h3>
                                <p className="text-slate-400 font-bold max-w-xs mt-2">Historical snapshots include everything from fund selection to final regime optimization bands.</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest">
                                                {selectedItem.state?.regimeContext?.detection?.region || 'Macro'} Optimized
                                            </span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-sm font-bold text-slate-400 flex items-center gap-1">
                                                <Calendar size={14} /> {new Date(selectedItem.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                                            {selectedItem.funds.length} Funds Portfolio
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => onLoadHistory(selectedItem)}
                                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black text-lg shadow-xl shadow-indigo-100 flex items-center gap-3 transition-transform active:scale-95"
                                    >
                                        <ExternalLink size={20} />
                                        Load Analysis
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <DetailCard title="Optimization Path" value={selectedItem.state?.optimizationPath?.toUpperCase() || 'MVP'} icon={<Database size={16} />} color="blue" />
                                    <DetailCard title="Weighting" value={selectedItem.state?.weightMethod?.replace('_', ' ') || 'Market Cap'} icon={<Hash size={16} />} color="indigo" />
                                    <DetailCard title="Assets" value={selectedItem.funds.length} icon={<Database size={16} />} color="purple" />
                                    <DetailCard title="Status" value="Verified" icon={<CheckCircle size={16} />} color="emerald" />
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Portfolio Constituents</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {selectedItem.funds.map((fund, i) => (
                                            <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-indigo-600 shadow-sm text-xs">
                                                    {i + 1}
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 truncate">{fund}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100 relative overflow-hidden">
                                    <History className="absolute -right-8 -bottom-8 text-indigo-100" size={200} />
                                    <div className="relative z-10">
                                        <h4 className="text-indigo-900 font-black mb-2">System Footprint</h4>
                                        <p className="text-indigo-700/80 text-sm font-medium leading-relaxed">
                                            This analysis was saved using the {selectedItem.state?.optimizationPath === 'regime' ? 'Regime-Aware' : 'Black-Litterman'} expression layer.
                                            Restoring it will populate all steps up to the Final Report (Step 7), allowing you to re-export or tweak constraints.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function DetailCard({ title, value, icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    }

    return (
        <div className={`p-5 rounded-3xl border ${colors[color]}`}>
            <div className="flex items-center gap-2 mb-2 opacity-60">
                {icon}
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">{title}</span>
            </div>
            <div className="text-lg font-black tracking-tight leading-none">{value}</div>
        </div>
    )
}
