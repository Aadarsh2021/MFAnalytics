import { useState } from 'react'
import { History, Trash2, ExternalLink, Calendar, Search, Database } from 'lucide-react'
import { supabase } from '../utils/supabase'

export default function HistorySidebar({ onLoadHistory, onOpenHistory, history = [], loading = false }) {
    const [searchTerm, setSearchTerm] = useState('')

    const deleteEntry = async (id, e) => {
        e.stopPropagation()
        if (!window.confirm('Delete this analysis?')) return
        try {
            const { error } = await supabase.from('analyses').delete().eq('id', id)
            if (error) throw error
            window.dispatchEvent(new Event('mfp-history-update'))
        } catch (e) {
            console.error("Error deleting entry:", e)
        }
    }

    const filteredHistory = history.filter(item =>
        Array.isArray(item.funds) && item.funds.some(f => f && f.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    if (history.length === 0 && !loading) return (
        <div className="mt-8 bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                <History size={16} className="text-indigo-600" /> Past Analyses
            </h3>
            <p className="text-xs text-slate-400 font-medium italic">No saved reports yet.</p>
        </div>
    )

    return (
        <div className="mt-8 bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <History size={16} className="text-indigo-600" /> Past Analyses
                </h3>
                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">{history.length}</span>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                    type="text"
                    placeholder="Search by fund..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[10px] font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 mb-6">
                {loading ? (
                    <div className="text-center py-4 animate-pulse text-[10px] font-bold text-slate-400 uppercase">Loading...</div>
                ) : filteredHistory.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => onLoadHistory(item)}
                        className="group relative bg-slate-50 hover:bg-white border border-transparent hover:border-indigo-100 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[8px] font-black text-indigo-400 uppercase flex items-center gap-1">
                                <Calendar size={10} /> {new Date(item.created_at).toLocaleDateString()}
                            </span>
                            <button
                                onClick={(e) => deleteEntry(item.id, e)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                        <p className="text-[10px] font-black text-slate-700 line-clamp-2 leading-relaxed">
                            {item.funds.join(', ')}
                        </p>
                        <div className="mt-3 flex justify-between items-center">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                            </div>
                            <ExternalLink size={12} className="text-slate-200 group-hover:text-indigo-400 transition" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Repositioned Trigger Button */}
            <button
                onClick={onOpenHistory}
                className="w-full p-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 group"
            >
                <Database size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                Open Analysis Vault
            </button>
        </div>
    )
}
