'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';

interface ClientProfile {
    name: string;
    riskProfile: 'conservative' | 'moderate' | 'aggressive' | 'custom';
    investmentHorizon: number;
    financialGoal: string;
    targetAmount: number;
    monthlySavings: number;
    emergencyFundMonths: number;
    taxBracket: string;
    currentInvestmentValue: number;
    assetAllocation: {
        equity: number;
        debt: number;
        gold: number;
        alt: number;
    };
    volatilityTolerance: number;
    returnExpectation: number;
    maxWeightPerFund: number;
    minWeightPerFund: number;
}

export default function ClientIntakePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [customGoal, setCustomGoal] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [profile, setProfile] = useState<ClientProfile>({
        name: '',
        riskProfile: 'moderate',
        investmentHorizon: 5,
        financialGoal: 'Wealth Creation',
        targetAmount: 1000000,
        monthlySavings: 25000,
        emergencyFundMonths: 6,
        taxBracket: '30%',
        currentInvestmentValue: 0,
        assetAllocation: {
            equity: 60,
            debt: 30,
            gold: 5,
            alt: 5,
        },
        volatilityTolerance: 50,
        returnExpectation: 12,
        maxWeightPerFund: 50, // Looser default
        minWeightPerFund: 0,
    });

    const handleAssetAllocationChange = (assetClass: keyof typeof profile.assetAllocation, value: number) => {
        const newAllocation = { ...profile.assetAllocation, [assetClass]: value };

        // Independent control: Switch to custom and update only the changed slider
        setProfile({
            ...profile,
            assetAllocation: newAllocation,
            riskProfile: 'custom'
        });
    };

    const totalAllocation = useMemo(() => {
        return Object.values(profile.assetAllocation).reduce((sum, val) => sum + val, 0);
    }, [profile.assetAllocation]);

    const handleRiskProfileChange = (newRiskProfile: 'conservative' | 'moderate' | 'aggressive' | 'custom') => {
        if (newRiskProfile === 'custom') {
            setProfile({ ...profile, riskProfile: 'custom' });
            return;
        }

        const riskPresets = {
            conservative: {
                assetAllocation: { equity: 30, debt: 60, gold: 5, alt: 5 },
                volatilityTolerance: 25,
                returnExpectation: 8,
                maxWeightPerFund: 15,
                minWeightPerFund: 1,
            },
            moderate: {
                assetAllocation: { equity: 60, debt: 30, gold: 5, alt: 5 },
                volatilityTolerance: 50,
                returnExpectation: 12,
                maxWeightPerFund: 20,
                minWeightPerFund: 2,
            },
            aggressive: {
                assetAllocation: { equity: 80, debt: 10, gold: 5, alt: 5 },
                volatilityTolerance: 75,
                returnExpectation: 15,
                maxWeightPerFund: 25,
                minWeightPerFund: 2,
            },
        };
        const preset = riskPresets[newRiskProfile as keyof typeof riskPresets];
        setProfile({ ...profile, riskProfile: newRiskProfile, ...preset });
    };

    const projectedValue = useMemo(() => {
        const r = profile.returnExpectation / 100 / 12;
        const n = profile.investmentHorizon * 12;
        const P = profile.monthlySavings;
        const FV = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
        const corpusFV = profile.currentInvestmentValue * Math.pow(1 + r, n);
        return Math.floor(FV + corpusFV);
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (currentStep < 2) {
            setCurrentStep(currentStep + 1);
            return;
        }
        setLoading(true);
        try {
            const clientPayload = {
                client_name: profile.name,
                risk_profile: {
                    risk_level: profile.riskProfile, // Matches backend enum lowercase
                    investment_horizon: profile.investmentHorizon,
                    asset_allocation: {
                        equity_min: Math.max(0, profile.assetAllocation.equity - 10),
                        equity_max: Math.min(100, profile.assetAllocation.equity + 10),
                        debt_min: Math.max(0, profile.assetAllocation.debt - 10),
                        debt_max: Math.min(100, profile.assetAllocation.debt + 10),
                        gold_min: Math.max(0, profile.assetAllocation.gold - 5),
                        gold_max: Math.min(100, profile.assetAllocation.gold + 5),
                        alt_min: Math.max(0, profile.assetAllocation.alt - 5),
                        alt_max: Math.min(100, profile.assetAllocation.alt + 5)
                    },
                    volatility_tolerance: profile.volatilityTolerance,
                    return_expectation: profile.returnExpectation,
                    max_weight_per_fund: profile.maxWeightPerFund,
                    min_weight_per_fund: profile.minWeightPerFund || 0,
                    financial_goal: profile.financialGoal === 'Others' ? customGoal : profile.financialGoal,
                    target_amount: profile.targetAmount,
                    monthly_savings: profile.monthlySavings,
                    emergency_fund_months: profile.emergencyFundMonths,
                    tax_bracket: profile.taxBracket,
                    current_investment_value: profile.currentInvestmentValue
                }
            };
            const response = await apiClient.post('/api/clients', clientPayload);
            sessionStorage.setItem('clientId', response.data.client_id.toString());
            sessionStorage.setItem('clientName', profile.name);
            sessionStorage.setItem('clientProfile', JSON.stringify(clientPayload.risk_profile));
            router.push('/funds');
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-slate-50 py-12 px-4">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-10 text-center">
                        <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
                            Smart Client Onboarding
                        </h1>
                        <p className="text-slate-600 max-w-2xl mx-auto">
                            Design a high-precision investment strategy by defining deep client goals and constraints.
                        </p>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Main Form Area */}
                        <div className="flex-1">
                            <div className="glass shadow-2xl rounded-3xl overflow-hidden bg-white/80 border border-white/50">
                                {/* Stepper */}
                                <div className="flex border-b border-slate-100">
                                    {[1, 2].map((s) => (
                                        <div key={s} className={`flex-1 py-4 text-center text-sm font-bold transition-colors ${currentStep >= s ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>
                                            Step {s}: {s === 1 ? 'Goals' : 'Strategy'}
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                                    {currentStep === 1 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <Input label="Client Name" value={profile.name} onChange={v => setProfile({ ...profile, name: v })} required placeholder="John Doe" />
                                                <div className="space-y-4">
                                                    <Select label="Financial Goal" value={profile.financialGoal} options={['Wealth Creation', 'Retirement', 'Home Purchase', 'Education', 'Tax Saving', 'Others']} onChange={v => setProfile({ ...profile, financialGoal: v })} />
                                                    {profile.financialGoal === 'Others' && (
                                                        <Input
                                                            label="Specify Goal"
                                                            value={customGoal}
                                                            onChange={v => setCustomGoal(v)}
                                                            required
                                                            placeholder="E.g. World Tour, Charity"
                                                        />
                                                    )}
                                                </div>
                                                <Input label="Target Amount (₹)" type="number" value={profile.targetAmount} onChange={v => setProfile({ ...profile, targetAmount: Number(v) })} />
                                                <Input label="Monthly SIP (₹)" type="number" value={profile.monthlySavings} onChange={v => setProfile({ ...profile, monthlySavings: Number(v) })} />
                                                <Input label="Lumpsum Base (₹)" type="number" value={profile.currentInvestmentValue} onChange={v => setProfile({ ...profile, currentInvestmentValue: Number(v) })} />
                                                <Select label="Tax Status" value={profile.taxBracket} options={['0%', '10%', '20%', '30%', '30% + Surcharge']} onChange={v => setProfile({ ...profile, taxBracket: v })} />
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 2 && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <Select
                                                        label="Risk Appetite"
                                                        value={profile.riskProfile}
                                                        options={['conservative', 'moderate', 'aggressive', 'custom']}
                                                        onChange={v => handleRiskProfileChange(v as any)}
                                                    />
                                                    {profile.riskProfile === 'custom' && (
                                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 animate-in fade-in zoom-in duration-300">
                                                            <span className="text-amber-600 text-lg">💡</span>
                                                            <p className="text-xs text-amber-800 font-medium leading-relaxed">
                                                                <span className="font-bold">Manual Tuning Enabled:</span> Presets are disabled. You can now fine-tune the asset allocation exactly to your client's needs.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                <Slider label="Horizon (Years)" min={1} max={30} value={profile.investmentHorizon} onChange={v => setProfile({ ...profile, investmentHorizon: v })} />
                                            </div>
                                            <div className="space-y-4">
                                                <h3 className="font-bold text-slate-800 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        Target Asset Allocation
                                                        {profile.riskProfile === 'custom' && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">Manual Control</span>}
                                                    </div>
                                                    <div className={`text-xs px-3 py-1 rounded-full font-black tracking-widest uppercase transition-all ${Math.abs(totalAllocation - 100) < 0.01 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'}`}>
                                                        Total: {totalAllocation.toFixed(1)}%
                                                    </div>
                                                </h3>
                                                {Object.entries(profile.assetAllocation).map(([k, v]) => (
                                                    <Slider key={k} label={k.toUpperCase()} value={v} onChange={val => handleAssetAllocationChange(k as any, val)} suffix="%" color="purple" />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-8 border-t border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <button type="button" onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : router.push('/')} className="px-8 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                                                {currentStep === 1 ? 'Cancel' : 'Back'}
                                            </button>
                                            {currentStep === 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.push('/funds')}
                                                    className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-blue-600 transition-all text-sm"
                                                >
                                                    Skip to Funds →
                                                </button>
                                            )}
                                        </div>
                                        <button type="submit" disabled={loading} className="px-10 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all">
                                            {loading ? 'Processing...' : currentStep === 2 ? 'Finalize & Select Funds' : 'Next Step'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Sidebar Information / Summary */}
                        <div className="w-full lg:w-80 space-y-6">
                            <div className="glass rounded-3xl p-6 bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-xl">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <span>🎯</span> Goal Projection
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-blue-100 text-xs uppercase font-bold tracking-wider">Est. Final Corpus</p>
                                        <p className="text-3xl font-black">₹{projectedValue.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-400" style={{ width: `${Math.min(100, (projectedValue / profile.targetAmount) * 100)}%` }} />
                                    </div>
                                    <p className="text-sm">
                                        {projectedValue >= profile.targetAmount
                                            ? `✅ On track! You'll exceed your ₹${(profile.targetAmount / 100000).toFixed(1)}L goal.`
                                            : `⚠️ Gap of ₹${((profile.targetAmount - projectedValue) / 100000).toFixed(1)}L. Consider increasing SIP or Horizon.`}
                                    </p>
                                </div>
                            </div>

                            <div className="glass rounded-3xl p-6 bg-white shadow-lg border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-4">Summary</h3>
                                <div className="space-y-3 text-sm">
                                    <SummaryItem label="Goal" value={profile.financialGoal} />
                                    <SummaryItem
                                        label="Risk"
                                        value={profile.riskProfile.toUpperCase()}
                                        color={profile.riskProfile === 'custom' ? 'text-amber-600' : 'text-slate-900'}
                                    />
                                    <SummaryItem label="Horizon" value={`${profile.investmentHorizon} Yrs`} />
                                    <SummaryItem label="SIP" value={`₹${profile.monthlySavings}`} />
                                    <SummaryItem label="Tax" value={profile.taxBracket} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

function Input({ label, type = "text", value, onChange, placeholder, required }: { label: string, type?: string, value: string | number, onChange: (v: string) => void, placeholder?: string, required?: boolean }) {
    const displayValue = (value === 0 || value === "0") && type === "number" ? "" : value;

    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
            <input
                type={type}
                value={displayValue}
                required={required}
                placeholder={placeholder || (type === "number" ? "0" : "")}
                onChange={e => onChange(e.target.value)}
                onFocus={(e) => {
                    if (type === "number" && (value === 0 || value === "0")) {
                        e.target.select();
                    }
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
            />
        </div>
    );
}

function Select({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                {options.map((o: string) => (
                    <option key={o} value={o}>
                        {o.charAt(0).toUpperCase() + o.slice(1)}
                    </option>
                ))}
            </select>
        </div>
    );
}

function Slider({ label, value, min = 0, max = 100, step = 1, onChange, suffix = '', color = 'blue' }: { label: string, value: number, min?: number, max?: number, step?: number, onChange: (v: number) => void, suffix?: string, color?: string }) {
    const colors: Record<string, string> = { blue: 'accent-blue-600', purple: 'accent-purple-600', green: 'accent-green-600', red: 'accent-red-600', orange: 'accent-orange-600' };
    return (
        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                <span className="text-sm font-black text-slate-800">{value}{suffix}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className={`w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer ${colors[color] || colors.blue}`} />
        </div>
    );
}

function SummaryItem({ label, value, color = 'text-slate-900' }: { label: string, value: string, color?: string }) {
    return (
        <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500 font-medium">{label}</span>
            <span className={`font-bold ${color}`}>{value}</span>
        </div>
    );
}
