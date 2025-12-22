'use client';

import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
    const { user } = useAuth();

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f8fafc] overflow-hidden">
                {/* Abstract Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-purple-400/10 rounded-full blur-[100px]" />
                </div>

                <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-24">
                    {/* Welcome Section */}
                    {user && (
                        <div className="mb-12 animate-in fade-in slide-in-from-top duration-700">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-bold mb-4">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                Professional Advisor Access
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{user.full_name || 'Advisor'}</span>
                            </h2>
                        </div>
                    )}

                    {/* Hero Section */}
                    <div className="flex flex-col lg:flex-row items-center gap-16 py-8">
                        <div className="flex-1 text-center lg:text-left space-y-8">
                            <h1 className="text-3xl lg:text-5xl font-black text-slate-900 leading-[1.1] tracking-tighter whitespace-nowrap">
                                Institutional <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                                    Portfolio Intelligence
                                </span>
                            </h1>
                            <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
                                Experience the future of mutual fund advisory. High-precision MPT optimization,
                                real-time CAS analysis, and definitive risk-adjusted metrics for thousands of funds.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                                <Link
                                    href="/intake"
                                    className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-2xl hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    🎯 Start Optimization
                                </Link>
                                <Link
                                    href="/rebalance"
                                    className="px-10 py-5 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-bold text-lg hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                                >
                                    📊 CAS Analytics
                                </Link>
                            </div>

                            {/* Trust Badges / Stats */}
                            <div className="flex flex-wrap justify-center lg:justify-start gap-8 pt-8">
                                <StatItem value="12,000+" label="Real-time Funds" />
                                <StatItem value="Alpha/Beta" label="Standardized" />
                                <StatItem value="100% TRI" label="Benchmark Logic" />
                            </div>
                        </div>

                        {/* Visual Ornament */}
                        <div className="flex-1 relative hidden lg:block animate-in fade-in zoom-in duration-1000">
                            <div className="glass shadow-2xl rounded-3xl p-8 border border-white/40 bg-white/40 backdrop-blur-xl rotate-2 hover:rotate-0 transition-transform duration-500">
                                <div className="space-y-6">
                                    <div className="h-4 w-1/2 bg-slate-200 rounded-full animate-pulse" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl" />
                                        <div className="h-32 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-2 w-full bg-slate-100 rounded-full" />
                                        <div className="h-2 w-3/4 bg-slate-100 rounded-full" />
                                    </div>
                                </div>
                            </div>
                            {/* Decorative Blur */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-[40px]" />
                        </div>
                    </div>

                    {/* Features Section */}
                    <div className="mt-32">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-widest text-sm">Professional Suite</h2>
                            <p className="text-4xl font-bold text-slate-800">Advanced Advisory Intelligence</p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <FeatureCard
                                icon="📈"
                                title="Fund Hub"
                                desc="Full access to 12,000+ mutual fund codes with 60fps high-performance searching."
                                link="/funds"
                                color="blue"
                            />
                            <FeatureCard
                                icon="⚡"
                                title="MPT Engine"
                                desc="Markovitz optimization for MVP and Max Sharpe portfolios with curved frontier logic."
                                link="/intake"
                                color="indigo"
                            />
                            <FeatureCard
                                icon="⚖️"
                                title="Goal Projection"
                                desc="Advanced intake with real-time SIP compounding and probability tracking."
                                link="/intake"
                                color="purple"
                            />
                            <FeatureCard
                                icon="🔍"
                                title="Analytics Hub"
                                desc="Deep performance review with Alpha, Beta, Treynor, and R-Squared integration."
                                link="/results"
                                color="pink"
                            />
                            <FeatureCard
                                icon="📤"
                                title="CAS Import"
                                desc="AI-powered parsing of CAMS/Karvy statements for instant portfolio rebalancing."
                                link="/rebalance"
                                color="emerald"
                            />
                            <FeatureCard
                                icon="📑"
                                title="PDF Reports"
                                desc="Generate white-labeled institutional quality PDF reports for client delivery."
                                link="/results"
                                color="orange"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Utility */}
                <div className="border-t border-slate-100 bg-white/50 py-12">
                    <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
                        <p className="text-slate-400 font-medium">© 2025 Institutional MF Analytics. Precision Portfolio Technology.</p>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}

function StatItem({ value, label }: { value: string, label: string }) {
    return (
        <div className="text-center lg:text-left">
            <p className="text-2xl font-black text-slate-900">{value}</p>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        </div>
    )
}

function FeatureCard({ icon, title, desc, link, color }: { icon: string, title: string, desc: string, link: string, color: string }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        purple: 'bg-purple-50 text-purple-600',
        pink: 'bg-pink-50 text-pink-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <Link href={link} className="group h-full">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-white transition-all duration-300 h-full flex flex-col group-hover:-translate-y-2">
                <div className={`w-14 h-14 rounded-2xl ${colors[color]} flex items-center justify-center text-3xl mb-6 shadow-inner transition-transform duration-500 group-hover:scale-110`}>
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-500 leading-relaxed mb-6 flex-1">{desc}</p>
                <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                    Open Tool <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
            </div>
        </Link>
    )
}
