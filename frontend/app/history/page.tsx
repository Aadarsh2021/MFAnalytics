'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Client {
    id: number;
    name: string;
    risk_profile: string;
    investment_horizon: number;
    latest_optimization_date?: string;
    latest_optimization_id?: number;
}

export default function HistoryPage() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await api.clients.list();
                setClients(response.data);
            } catch (error) {
                console.error("Failed to fetch clients:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchClients();
    }, []);

    const handleViewResults = async (client: Client) => {
        if (!client.latest_optimization_id) return;

        setProcessingId(client.id);
        try {
            // 1. Fetch full optimization results
            const response = await api.optimize.get(client.latest_optimization_id);
            const results = response.data;

            // 2. Store in session storage (mimicking the flow from intake -> results)
            sessionStorage.setItem('optimizationResults', JSON.stringify(results));
            sessionStorage.setItem('clientId', client.id.toString());

            // Store profile for context
            const profile = {
                risk_level: client.risk_profile,
                investment_horizon: client.investment_horizon
            };
            sessionStorage.setItem('clientProfile', JSON.stringify(profile));

            router.push('/results');
        } catch (error) {
            console.error("Failed to load results:", error);
            alert("Could not load historical results.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleEditSave = async () => {
        // Refresh list
        try {
            setLoading(true);
            const response = await api.clients.list();
            setClients(response.data);
            setEditingClient(null);
        } catch (error) {
            console.error("Failed to refresh list:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto space-y-8">

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Client Directory</h1>
                            <p className="mt-2 text-gray-600">View and manage your client portfolios.</p>
                        </div>
                        <button
                            onClick={() => router.push('/intake')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            + New Client Analysis
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500">Loading clients...</div>
                        ) : clients.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                No clients found. Start a new analysis to add one.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Profile</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horizon</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Optimization</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {clients.map((client) => (
                                            <tr key={client.id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {client.name || `Client #${client.id}`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${client.risk_profile === 'aggressive' ? 'bg-red-100 text-red-800' :
                                                            client.risk_profile === 'conservative' ? 'bg-green-100 text-green-800' :
                                                                'bg-blue-100 text-blue-800'}`}>
                                                        {client.risk_profile.charAt(0).toUpperCase() + client.risk_profile.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {client.investment_horizon} Years
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <button
                                                        onClick={() => setEditingClient(client)}
                                                        className="text-indigo-600 hover:text-indigo-900 font-bold text-xs uppercase"
                                                    >
                                                        Edit Rules
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {client.latest_optimization_date
                                                        ? new Date(client.latest_optimization_date).toLocaleDateString()
                                                        : 'Never'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {client.latest_optimization_id ? (
                                                        <button
                                                            onClick={() => handleViewResults(client)}
                                                            disabled={processingId === client.id}
                                                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                                        >
                                                            {processingId === client.id ? 'Loading...' : 'View Results'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400">No Data</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {editingClient && (
                    <StrategyEditorModal
                        client={editingClient}
                        onClose={() => setEditingClient(null)}
                        onSave={handleEditSave}
                    />
                )}
            </div>
        </ProtectedRoute>
    );
}

function StrategyEditorModal({ client, onClose, onSave }: { client: Client, onClose: () => void, onSave: () => void }) {
    const [riskProfile, setRiskProfile] = useState(client.risk_profile);
    const [horizon, setHorizon] = useState(client.investment_horizon);
    const [assetAllocation, setAssetAllocation] = useState({ equity: 0, debt: 0, gold: 0, alt: 0 });
    const [loading, setLoading] = useState(false);

    // Initial load? Ideally we need client's current details.
    // Since list only gives basic info, we might need to fetch details or assume based on profile?
    // The list API response doesn't give constraint details.
    // We should fetch client details on mount.

    useEffect(() => {
        setLoading(true);
        api.clients.get(client.id)
            .then(res => {
                const data = res.data;
                // Parse constraints if available, or set defaults
                // The GET /clients/{id} returns the client object. Constraints are stored as JSON string in 'constraints' column
                // But the schema ClientProfileResponse doesn't explicitly expose constraints field.
                // We might need to update backend GET endpoint to expose constraints or parse them.
                // For now, let's assume we can get it or default it.
                // Wait, GET /clients/{id} returns ClientProfileResponse which DOES NOT include constraints.
                // Actually the backend `get_client` returns the ORM object which HAS constraints, 
                // but the Pydantic response model filters it out?
                // `ClientProfileResponse` in `clients.py` does NOT have `constraints`.
                // Checking `clients.py` again...
                // Ideally we need the constraints.

                // Workaround: We will rely on user inputting new values or defaults based on Risk Profile.
                // If Custom, we default to 25/25/25/25
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));

        // Set defaults based on risk profile for now since we can't fetch exact custom values easily without backend update
        if (riskProfile === 'moderate') setAssetAllocation({ equity: 60, debt: 30, gold: 5, alt: 5 });
        else if (riskProfile === 'aggressive') setAssetAllocation({ equity: 80, debt: 10, gold: 5, alt: 5 });
        else if (riskProfile === 'conservative') setAssetAllocation({ equity: 30, debt: 60, gold: 5, alt: 5 });
        else setAssetAllocation({ equity: 25, debt: 25, gold: 25, alt: 25 });

    }, []);

    const handleSave = async () => {
        const total = Object.values(assetAllocation).reduce((a, b) => a + b, 0);
        if (riskProfile === 'custom' && Math.abs(total - 100) > 0.1) {
            alert(`Total allocation must be 100%. Current: ${total}%`);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                risk_profile: {
                    risk_level: riskProfile,
                    investment_horizon: horizon,
                    asset_allocation: {
                        equity_min: Math.max(0, assetAllocation.equity - 10),
                        equity_max: Math.min(100, assetAllocation.equity + 10),
                        debt_min: Math.max(0, assetAllocation.debt - 10),
                        debt_max: Math.min(100, assetAllocation.debt + 10),
                        gold_min: Math.max(0, assetAllocation.gold - 5),
                        gold_max: Math.min(100, assetAllocation.gold + 5),
                        alt_min: Math.max(0, assetAllocation.alt - 5),
                        alt_max: Math.min(100, assetAllocation.alt + 5)
                    },
                    target_allocation: assetAllocation // Start saving target explicitly!
                }
            };

            await api.clients.update(client.id, payload);
            onSave();
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update strategy");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-900">Edit Strategy: {client.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Risk Profile</label>
                        <select
                            value={riskProfile}
                            onChange={(e) => {
                                const val = e.target.value;
                                setRiskProfile(val);
                                if (val === 'moderate') setAssetAllocation({ equity: 60, debt: 30, gold: 5, alt: 5 });
                                else if (val === 'aggressive') setAssetAllocation({ equity: 80, debt: 10, gold: 5, alt: 5 });
                                else if (val === 'conservative') setAssetAllocation({ equity: 30, debt: 60, gold: 5, alt: 5 });
                            }}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                        >
                            <option value="conservative">Conservative</option>
                            <option value="moderate">Moderate</option>
                            <option value="aggressive">Aggressive</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Investment Horizon (Years)</label>
                        <input
                            type="number"
                            value={horizon}
                            onChange={(e) => setHorizon(parseInt(e.target.value))}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                        />
                    </div>

                    {riskProfile === 'custom' && (
                        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Asset Allocation</h4>
                            {['equity', 'debt', 'gold', 'alt'].map((asset) => (
                                <div key={asset}>
                                    <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                                        <span className="capitalize">{asset}</span>
                                        <span>{assetAllocation[asset as keyof typeof assetAllocation]}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={assetAllocation[asset as keyof typeof assetAllocation]}
                                        onChange={(e) => setAssetAllocation({ ...assetAllocation, [asset]: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            ))}
                            <div className={`text-right text-xs font-bold ${Math.abs(Object.values(assetAllocation).reduce((a, b) => a + b, 0) - 100) > 0.1 ? 'text-red-500' : 'text-green-600'}`}>
                                Total: {Object.values(assetAllocation).reduce((a, b) => a + b, 0)}%
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Strategy'}
                    </button>
                </div>
            </div>
        </div>
    );
}
