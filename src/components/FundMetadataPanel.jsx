import { Info, Calendar, Database, ShieldAlert } from 'lucide-react'

export default function FundMetadataPanel({ metadata }) {
    if (!metadata || !metadata.funds) return null

    const funds = Object.values(metadata.funds)

    return (
        <div className="mt-8 space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Info className="text-blue-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">Fund Alignment & Inception Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {funds.map((fund, idx) => {
                    const lossValue = parseFloat(fund.dataLoss)
                    const isHighLoss = lossValue > 50

                    return (
                        <div key={idx} className="bg-white border-2 border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-gray-900 line-clamp-2 flex-1 mr-2">{fund.name}</h4>
                                {isHighLoss && (
                                    <div className="group relative">
                                        <ShieldAlert className="text-orange-500" size={20} />
                                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-10">
                                            High data loss due to late inception date compared to other funds.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <Calendar size={14} /> Inception
                                    </span>
                                    <span className="font-semibold text-gray-700">{fund.inceptionDate}</span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <Database size={14} /> Total Records
                                    </span>
                                    <span className="text-gray-700">{fund.totalDays.toLocaleString()} days</span>
                                </div>

                                <div className="pt-3 border-t border-gray-50">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500">Alignment Coverage</span>
                                        <span className={isHighLoss ? 'text-orange-600 font-bold' : 'text-green-600 font-bold'}>
                                            {fund.daysKept.toLocaleString()} / {fund.totalDays.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${isHighLoss ? 'bg-orange-500' : 'bg-green-500'}`}
                                            style={{ width: `${(fund.daysKept / fund.totalDays * 100).toFixed(0)}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-right mt-1 text-gray-400">
                                        {fund.dataLoss} of history trimmed
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex gap-3">
                    <Info className="text-blue-600 shrink-0" size={20} />
                    <div>
                        <p className="text-sm text-blue-900 font-semibold">Alignment Strategy: Latest Common Inception</p>
                        <p className="text-xs text-blue-700 mt-1">
                            To ensure accurate correlation mapping, all funds have been aligned to start from
                            <span className="font-bold"> {metadata.latestInceptionDate}</span>.
                            Data prior to this date for older funds is excluded from this specific analysis.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
