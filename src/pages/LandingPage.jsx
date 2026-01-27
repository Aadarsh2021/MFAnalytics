import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, Globe, BarChart3, Zap, Shield, Brain, CheckCircle2, Activity, Layers, PieChart } from 'lucide-react'
import logo from '../assets/logo.png'
import shivamPhoto from '../assets/shivam.jpg'
import vatsalPhoto from '../assets/vatsal.png'

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
            {/* Background Aesthetics */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-purple-200/20 rounded-full blur-[100px]"></div>
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-100/30 rounded-full blur-[80px]"></div>

                {/* SVG Grid */}
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{
                        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                ></div>
            </div>

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg py-4 border-b border-slate-200/50' : 'bg-transparent py-8'}`}>
                <div className="max-w-[1600px] mx-auto px-12 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <img src={logo} alt="Revest Enterprises" className="h-14 md:h-20 w-auto object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
                    </Link>

                    <div className="hidden md:flex items-center gap-10">
                        <a href="#about" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors tracking-tight uppercase">How it works</a>
                        <a href="#features" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors tracking-tight uppercase">Platform</a>
                        <Link
                            to="/login"
                            className="px-8 py-3 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-blue-600 transition-all shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1"
                        >
                            Client Login
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10">
                {/* Hero Section */}
                <section className="min-h-screen flex items-center pt-24 pb-20 px-12">
                    <div className="max-w-[1600px] mx-auto w-full grid lg:grid-cols-12 gap-20 items-center">

                        {/* Hero Visual (Left) */}
                        <div className="lg:col-span-5 relative flex items-center justify-center animate-[fadeIn_1s_ease-out]">
                            <div className="absolute w-[120%] h-[120%] bg-blue-100/50 rounded-full blur-[120px]"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <img src={logo} alt="Revest Enterprises" className="h-72 md:h-[450px] w-auto object-contain mix-blend-multiply drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-[float_6s_ease-in-out_infinite]" />

                                {/* Orbiting Components */}
                                <div className="absolute top-0 -right-4 bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-2xl border border-white animate-[float_5s_ease-in-out_1s_infinite]">
                                    <Activity className="w-10 h-10 text-blue-600" />
                                </div>
                                <div className="absolute -bottom-10 -left-4 bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-2xl border border-white animate-[float_7s_ease-in-out_2s_infinite]">
                                    <Globe className="w-10 h-10 text-purple-600" />
                                </div>
                            </div>
                        </div>

                        {/* Hero Content (Right) */}
                        <div className="lg:col-span-7 space-y-12 animate-[slideUp_0.8s_ease-out_0.2s_forwards] opacity-0 text-left">
                            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-blue-600 text-white rounded-full text-sm font-bold tracking-widest uppercase shadow-lg shadow-blue-500/30">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                                </span>
                                Advance Portfolio Management Solutions
                            </div>

                            <div className="space-y-6">
                                <h1 className="text-6xl md:text-8xl font-black leading-[1.05] tracking-tighter text-slate-900">
                                    Strategic Alpha. <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Pure Intelligence.</span>
                                </h1>
                                <p className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-2xl font-medium">
                                    We are not just investment managers. We are quantitative architects. Our system scans thousands of data points to find growth before the headlines catch up.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-8">
                                <Link
                                    to="/login"
                                    className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 flex items-center justify-center gap-4 group hover:-translate-y-1"
                                >
                                    Get Started
                                    <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform duration-500" />
                                </Link>
                                <a
                                    href="#about"
                                    className="px-12 py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-bold text-xl hover:bg-slate-50 hover:border-blue-200 transition-all duration-300 flex items-center justify-center hover:-translate-y-1 shadow-sm"
                                >
                                    Our Methodology
                                </a>
                            </div>

                            {/* Trust Stats Bar */}
                            <div className="pt-16 border-t border-slate-200/80 flex flex-wrap gap-12 md:gap-24">
                                <div className="space-y-1">
                                    <h4 className="text-5xl font-black text-slate-900 tracking-tighter">50+</h4>
                                    <p className="text-blue-600 font-bold text-xs tracking-[0.2em] uppercase">Global Indicators</p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-5xl font-black text-slate-900 tracking-tighter">10k+</h4>
                                    <p className="text-indigo-600 font-bold text-xs tracking-[0.2em] uppercase">Daily Data Points</p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-5xl font-black text-slate-900 tracking-tighter">100%</h4>
                                    <p className="text-purple-600 font-bold text-xs tracking-[0.2em] uppercase">Quantitative</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Methodology Section */}
                <section id="about" className="py-40 px-12 bg-white relative border-y border-slate-100">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-24 items-center">
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <span className="text-blue-600 font-black tracking-[0.3em] uppercase text-xs mb-4 block">Engine Core</span>
                                    <h2 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tighter">
                                        Beyond the <br />
                                        <span className="text-blue-600">Standard Norm.</span>
                                    </h2>
                                </div>
                                <p className="text-2xl text-slate-500 leading-relaxed font-medium">
                                    Most investors only look at equity and bonds. We scan for <span className="text-slate-900">Commodity Indicators</span> and macro variables across US and Indian markets 24/7.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-8 pt-6">
                                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                        <Brain className="w-10 h-10 text-blue-600 mb-4" />
                                        <h4 className="font-bold text-xl mb-2">Macro State Detection</h4>
                                        <p className="text-slate-500 text-sm">Identifying regime shifts from growth to stress in real-time.</p>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                        <Layers className="w-10 h-10 text-purple-600 mb-4" />
                                        <h4 className="font-bold text-xl mb-2">Multi-Asset Correlation</h4>
                                        <p className="text-slate-500 text-sm">Finding alpha in the hidden movements between commodities and currencies.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="relative group">
                                <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden transform group-hover:-rotate-1 transition-transform duration-700">
                                    <div className="relative z-10 space-y-10">
                                        <h3 className="text-3xl font-black tracking-tight">System Status: Scanning</h3>
                                        <div className="space-y-6">
                                            {[
                                                { label: 'Growth Delta', val: 'Strong Positive', color: 'bg-green-400' },
                                                { label: 'Commodity Momentum', val: 'Capping', color: 'bg-yellow-400' },
                                                { label: 'Market Volatility', val: 'Stabilizing', color: 'bg-blue-400' }
                                            ].map((item, i) => (
                                                <div key={i} className="space-y-3">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-400 font-bold uppercase tracking-wider">{item.label}</span>
                                                        <span className="font-mono text-white font-bold">{item.val}</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                                        <div className={`h-full ${item.color} w-[75%] animate-[shimmer_2s_infinite]`}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-6 flex justify-between items-center text-xs text-slate-500 font-mono">
                                            <span>US CAPITAL MARKET</span>
                                            <span>INDIAN MARKET ACTIVE</span>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-40 px-12 bg-slate-50/50 backdrop-blur-md">
                    <div className="max-w-[1600px] mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
                            <div className="max-w-2xl space-y-6 text-left">
                                <span className="text-blue-600 font-black tracking-[0.3em] uppercase text-xs">Capabilities</span>
                                <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter">Unified intelligence for <br /><span className="text-blue-600">institutional portfolios.</span></h2>
                            </div>
                            <Link to="/login" className="flex items-center gap-3 text-blue-600 font-bold text-xl hover:gap-5 transition-all group">
                                Explore All Modules <ArrowRight className="w-6 h-6" />
                            </Link>
                        </div>

                        <div className="grid md:grid-cols-4 md:grid-rows-2 gap-8 h-auto md:h-[750px]">
                            {/* Feature: Macro Geography */}
                            <div className="md:col-span-2 md:row-span-2 bg-white rounded-[3.5rem] p-16 border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden relative flex flex-col justify-center">
                                <div className="relative z-10 space-y-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                        <Globe className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Geography Scanning</h3>
                                    <p className="text-xl text-slate-600 leading-relaxed font-medium">
                                        We analyze the "Maximum Potential" of capital across global markets by tracking economic output and policy shifts in real-time.
                                    </p>
                                    <div className="grid grid-cols-2 gap-6 pt-6">
                                        {['North America', 'India Growth', 'EU Markets', 'Emerging Corridors'].map((item, i) => (
                                            <div key={i} className="flex items-center gap-4 text-slate-800 font-bold">
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-50/50 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-1000"></div>
                            </div>

                            {/* Feature: Regime Switching */}
                            <div className="md:col-span-2 bg-slate-900 rounded-[3rem] p-12 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-500">
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-4">
                                            <h3 className="text-3xl font-black tracking-tight">Regime Switching</h3>
                                            <p className="text-slate-400 text-lg max-w-sm">Automatically tilting weights between Commodities, Equities, and Fixed Income.</p>
                                        </div>
                                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:rotate-12 transition-transform">
                                            <PieChart className="w-7 h-7 text-blue-400" />
                                        </div>
                                    </div>
                                    <div className="flex gap-4 opacity-50">
                                        <div className="h-1 lg:w-32 bg-blue-500 rounded-full"></div>
                                        <div className="h-1 lg:w-12 bg-white/20 rounded-full"></div>
                                        <div className="h-1 lg:w-20 bg-white/20 rounded-full"></div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]"></div>
                            </div>

                            {/* Feature: Backtesting */}
                            <div className="md:col-span-1 bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                    <BarChart3 className="w-6 h-6 text-orange-600" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Stress Test</h3>
                                <p className="text-slate-500 font-medium">Historical validation for US & Indian market stress periods.</p>
                            </div>

                            {/* Feature: Quant Engine */}
                            <div className="md:col-span-1 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-10 text-white shadow-xl hover:shadow-2xl transition-all group">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md group-hover:scale-110 transition-transform">
                                    <Zap className="w-6 h-6 text-yellow-300" />
                                </div>
                                <h3 className="text-2xl font-black mb-4 tracking-tight">Quant Ops</h3>
                                <p className="text-indigo-100 font-medium">In-house optimization engines for risk-adjusted alpha.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Team Section */}
                <section className="py-40 px-12 relative overflow-hidden bg-white">
                    <div className="max-w-7xl mx-auto relative z-10 text-center space-y-24">
                        <div className="space-y-6">
                            <span className="text-blue-600 font-black tracking-[0.3em] uppercase text-xs px-4 py-1.5 bg-blue-50 rounded-full inline-block">The Collective</span>
                            <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">The Minds Behind <br /><span className="text-blue-600">Revest.</span></h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-16 max-w-5xl mx-auto">
                            {/* Shivam Shringi */}
                            <div className="group relative">
                                <div className="absolute inset-0 bg-blue-600/5 rounded-[4rem] group-hover:bg-blue-600/10 transition-colors duration-500"></div>
                                <div className="relative p-12 flex flex-col items-center space-y-10">
                                    <div className="w-40 h-40 rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-800 overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                        <img src={shivamPhoto} alt="Shivam Shringi" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-4xl font-black text-slate-900 lg:tracking-tighter">Shivam Shringi</h3>
                                        <p className="text-blue-600 font-black tracking-[0.2em] uppercase text-sm">Founder</p>
                                        <div className="h-1.5 w-16 bg-blue-600 mx-auto rounded-full"></div>
                                        <p className="text-xl font-medium text-slate-500 leading-relaxed pt-4">
                                            Driving the vision of high-tier data intelligence via quantitative global macro shifts.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Vatsal Soni */}
                            <div className="group relative">
                                <div className="absolute inset-0 bg-purple-600/5 rounded-[4rem] group-hover:bg-purple-600/10 transition-colors duration-500"></div>
                                <div className="relative p-12 flex flex-col items-center space-y-10">
                                    <div className="w-40 h-40 rounded-[3rem] bg-gradient-to-br from-purple-600 to-indigo-800 overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                        <img src={vatsalPhoto} alt="Vatsal Soni" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-4xl font-black text-slate-900 lg:tracking-tighter">Vatsal Soni</h3>
                                        <p className="text-purple-600 font-black tracking-[0.2em] uppercase text-sm">Co-founder</p>
                                        <div className="h-1.5 w-16 bg-purple-600 mx-auto rounded-full"></div>
                                        <p className="text-xl font-medium text-slate-500 leading-relaxed pt-4">
                                            Engineering the quantitative engines and complex market state switching architectures.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Background Blob for Team */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-slate-50 rounded-full blur-[150px] pointer-events-none"></div>
                </section>

                {/* CTA Segment */}
                <section className="py-24 px-12">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-[4rem] p-16 md:p-24 text-center text-white relative overflow-hidden shadow-2xl">
                            <div className="relative z-10 space-y-10">
                                <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-none">Ready to optimize <br />your alpha?</h2>
                                <p className="text-xl text-blue-100 font-medium max-w-2xl mx-auto">Join the institutions using Revest to identify the next geography shift.</p>
                                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                                    <Link
                                        to="/login"
                                        className="px-12 py-6 bg-white text-blue-600 rounded-2xl font-black text-2xl hover:scale-105 transition-transform duration-300 shadow-xl"
                                    >
                                        Get Client Access
                                    </Link>
                                    <button className="px-12 py-6 bg-transparent border-2 border-white/30 text-white rounded-2xl font-black text-2xl hover:bg-white/10 transition-all">
                                        Talk to Expert
                                    </button>
                                </div>
                            </div>
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 pt-32 pb-12 px-12 relative z-10">
                <div className="max-w-[1600px] mx-auto">
                    <div className="grid md:grid-cols-12 gap-20 mb-32">
                        <div className="md:col-span-5 space-y-10">
                            <img src={logo} alt="Revest Enterprises" className="h-20 w-auto object-contain mix-blend-multiply" />
                            <p className="text-xl text-slate-500 max-w-sm leading-relaxed font-medium">
                                Institutional-grade portfolio intelligence for the modern decade. Scanned. Validated. Quantitative.
                            </p>
                            <div className="flex gap-6">
                                {/* Placeholders for social icons */}
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 font-bold">In</div>
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 font-bold">X</div>
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-8">
                            <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Product</h4>
                            <ul className="space-y-4 text-slate-500 font-bold">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Macro Scan</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Optimizer</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Backtesting</a></li>
                            </ul>
                        </div>
                        <div className="md:col-span-2 space-y-8">
                            <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Knowledge</h4>
                            <ul className="space-y-4 text-slate-500 font-bold">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Regime Papers</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Data Feed</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">API Docs</a></li>
                            </ul>
                        </div>
                        <div className="md:col-span-2 space-y-8">
                            <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Legal</h4>
                            <ul className="space-y-4 text-slate-500 font-bold">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Terms</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Governance</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-100 pt-12 flex flex-col md:flex-row justify-between items-center gap-8 text-sm text-slate-400 font-bold tracking-widest uppercase">
                        <p>© {new Date().getFullYear()} Revest Enterprises. All rights reserved.</p>
                        <p className="flex items-center gap-2">Built for Performance <Zap className="w-4 h-4 text-yellow-400" /></p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
