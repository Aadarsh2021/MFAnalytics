export default function Loading() {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header Skeleton */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>

                {/* Tabs Skeleton */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6 animate-pulse">
                    <div className="flex gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-10 bg-gray-200 rounded w-32"></div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content Skeleton */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Chart Skeleton */}
                        <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                            <div className="h-96 bg-gray-200 rounded"></div>
                        </div>

                        {/* Weights Table Skeleton */}
                        <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                            <div className="space-y-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Skeleton */}
                    <div className="space-y-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                                <div className="h-24 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
