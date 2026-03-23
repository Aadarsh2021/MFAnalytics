import React from 'react';
import { RotateCcw, AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-white rounded-[2.5rem] p-12 shadow-xl border border-red-100 text-center space-y-6 animate-fade-in my-10 max-w-4xl mx-auto">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto">
                        <AlertCircle size={40} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">Something went wrong on this page</h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                            {this.props.message || "We encountered an unexpected error while loading this step. You can try going back to the previous step or reloading the analysis."}
                        </p>
                        {this.state.error && (
                            <div className="mt-4 p-4 bg-red-50 rounded-xl text-xs font-mono text-red-700 break-words max-w-2xl mx-auto overflow-auto max-h-32 text-left">
                                {this.state.error.toString()}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                if (this.props.onReset) {
                                    this.props.onReset();
                                }
                            }}
                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                        >
                            <RotateCcw size={18} />
                            Go Back to Previous Step
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                        >
                            Reload Website
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
