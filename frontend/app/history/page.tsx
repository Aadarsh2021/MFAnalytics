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

            // Note: We might miss 'selectedFunds' if not returned by optimization_get
            // But results page mostly uses 'results' object.
            // If results page needs fundDetails for names, we might need to extract them from results if available
            // (The backend get_optimization_result doesn't return fund selection list explicitly in the matched response model yet)
            // It maps weights, but maybe not names if they aren't in the metrics.

            router.push('/results');
        } catch (error) {
            console.error("Failed to load results:", error);
            alert("Could not load historical results.");
        } finally {
            setProcessingId(null);
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
            </div>
        </ProtectedRoute>
    );
}
