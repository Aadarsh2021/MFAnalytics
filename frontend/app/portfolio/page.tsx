'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function PortfolioPage() {
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [uploadId, setUploadId] = useState<string | null>(null);
    const [holdings, setHoldings] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const onDrop = async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setUploading(true);
        setError(null);

        try {
            // Upload PDF
            const uploadResponse = await api.portfolio.upload(file);
            const id = uploadResponse.data.upload_id;
            setUploadId(id);

            // Parse PDF
            setParsing(true);
            const parseResponse = await api.portfolio.parse(id);
            setHoldings(parseResponse.data.holdings);
            setParsing(false);
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            if (typeof detail === 'string') {
                setError(detail);
            } else if (Array.isArray(detail)) {
                setError(detail.map(e => e.msg).join(', '));
            } else if (typeof detail === 'object' && detail !== null) {
                setError(JSON.stringify(detail));
            } else {
                setError('Failed to process PDF');
            }
            setParsing(false);
        } finally {
            setUploading(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1
    });

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            Existing Portfolio Analysis
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            Upload CAS PDF and optimize existing portfolio
                        </p>
                    </div>

                    {!holdings.length ? (
                        <div className="glass p-12 rounded-xl">
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${isDragActive
                                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                {uploading ? (
                                    <p className="text-lg text-gray-600 dark:text-gray-400">Uploading...</p>
                                ) : parsing ? (
                                    <p className="text-lg text-gray-600 dark:text-gray-400">Parsing PDF...</p>
                                ) : isDragActive ? (
                                    <p className="text-lg text-gray-900 dark:text-white">Drop PDF here...</p>
                                ) : (
                                    <>
                                        <p className="text-lg text-gray-900 dark:text-white mb-2">
                                            Drag & drop CAS PDF here, or click to select
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Supports CAMS and Karvy statements
                                        </p>
                                    </>
                                )}
                            </div>

                            {error && (
                                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-red-800 dark:text-red-200">{error}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="glass p-6 rounded-xl">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Extracted Holdings
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-3 px-4">Fund Name</th>
                                            <th className="text-left py-3 px-4">Asset Class</th>
                                            <th className="text-right py-3 px-4">Units</th>
                                            <th className="text-right py-3 px-4">Value</th>
                                            <th className="text-right py-3 px-4">Weight</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {holdings.map((holding, idx) => (
                                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                                                <td className="py-3 px-4">{holding.fund_name}</td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-1 rounded-full text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                                                        {holding.asset_class}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right number">{holding.units.toFixed(3)}</td>
                                                <td className="py-3 px-4 text-right number">₹{holding.current_value.toLocaleString('en-IN')}</td>
                                                <td className="py-3 px-4 text-right number">{(holding.weight * 100).toFixed(2)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between mt-6">
                                <button
                                    onClick={() => setHoldings([])}
                                    className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold"
                                >
                                    Upload Another
                                </button>
                                <button
                                    onClick={() => router.push(`/intake?portfolio_id=${uploadId}`)}
                                    className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold"
                                >
                                    Optimize Portfolio
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
