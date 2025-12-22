export default function Loading() {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header Skeleton */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6 animate-pulse">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-48"></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="h-10 bg-gray-200 rounded w-24"></div>
                            <div className="h-10 bg-gray-200 rounded w-24"></div>
                        </div>
                    </div>

                    {/* Filters Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-10 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Table Skeleton */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6 animate-pulse">
                        <div className="space-y-3">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar Skeleton */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                            <div className="h-64 bg-gray-200 rounded"></div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                            <div className="h-32 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
