import { useState } from 'react'
import { Upload, Database, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../utils/supabase'

export default function DataFeeder({ onUploadComplete }) {
    const [uploading, setUploading] = useState(false)
    const [status, setStatus] = useState(null) // { type: 'success' | 'error', msg: '' }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        setStatus(null)

        const reader = new FileReader()
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws)

                // AMFI Excel usually has columns like: "Scheme Code", "Scheme Name", "Average AUM (Rs. in Lakhs)"
                // We need to map them carefully.
                // Let's look for standard headers or loose match

                let processed = []
                let validCount = 0

                for (const row of data) {
                    // Try to find keys
                    // Key variations often found in AMFI reports:
                    // Code: "Scheme Code", "Code"
                    // AUM: "AAUM", "Average AUM", "Total AUM"

                    const keys = Object.keys(row)
                    const codeKey = keys.find(k => k.toLowerCase().includes('code'))
                    const aumKey = keys.find(k => k.toLowerCase().includes('aum') || k.toLowerCase().includes('assets'))
                    const nameKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('scheme'))

                    if (codeKey && aumKey) {
                        const code = row[codeKey]
                        // Clean AUM: remove commas, parens
                        let aumVal = row[aumKey]

                        // If it's in Lakhs (common in AMFI), convert to Crore? 
                        // Usually AMFI is in Lakhs. 1 Crore = 100 Lakhs.
                        // So Value / 100 = Crores.
                        // Let's assume input is raw number, we might need a toggle or smart detection later.
                        // For now, let's treat exact value.
                        if (typeof aumVal === 'string') {
                            aumVal = parseFloat(aumVal.replace(/,/g, ''))
                        }

                        if (code && !isNaN(aumVal)) {
                            processed.push({
                                scheme_code: String(code).trim(),
                                scheme_name: row[nameKey] || 'Unknown',
                                aum: aumVal, // Storing as is, user can interpret unit
                                updated_at: new Date().toISOString()
                            })
                            validCount++
                        }
                    }
                }

                if (processed.length === 0) {
                    throw new Error("No valid Scheme Code/AUM columns found in file.")
                }

                // Upsert to Supabase
                // Batch insert in chunks of 1000 to avoid limits
                const chunkSize = 1000
                for (let i = 0; i < processed.length; i += chunkSize) {
                    const chunk = processed.slice(i, i + chunkSize)
                    const { error } = await supabase
                        .from('fund_master')
                        .upsert(chunk, { onConflict: 'scheme_code' })

                    if (error) throw error
                }

                setStatus({ type: 'success', msg: `Successfully updated ${validCount} funds in DB!` })
                if (onUploadComplete) onUploadComplete()

            } catch (e) {
                console.error(e)
                setStatus({ type: 'error', msg: "Upload failed: " + e.message })
            } finally {
                setUploading(false)
            }
        }
        reader.readAsBinaryString(file)
    }

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Database size={16} className="text-blue-600" />
                AMFI Data Feeder
            </h3>
            <p className="text-xs text-slate-500 mb-3">
                Upload official AMFI "Scheme-wise AUM" Excel to populate database.
            </p>

            <div className="flex items-center gap-4">
                <label className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all
                    ${uploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'}
                `}>
                    {uploading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <FileSpreadsheet size={16} />}
                    {uploading ? 'Processing...' : 'Select Excel File'}
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                    />
                </label>

                {status && (
                    <div className={`text-xs font-bold flex items-center gap-1 ${status.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                        {status.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {status.msg}
                    </div>
                )}
            </div>
            {status?.type === 'success' && (
                <p className="text-[10px] text-slate-400 mt-2">
                    * Data is now live for all users. Search again to see AUM.
                </p>
            )}
        </div>
    )
}
