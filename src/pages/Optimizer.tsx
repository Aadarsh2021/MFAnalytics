import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SearchInput } from "@/components/common/SearchInput";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EfficientFrontierChart } from "@/components/charts/EfficientFrontierChart";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFundDetails, FundScheme } from "@/lib/api";
import { runMonteCarloSimulation, OptimizationResult } from "@/lib/monteCarlo";
import {
  X,
  Sparkles,
  TrendingUp,
  Shield,
  AlertCircle,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SelectedFund extends FundScheme {
  isLoading?: boolean;
}

export default function Optimizer() {
  const [selectedFunds, setSelectedFunds] = useState<SelectedFund[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [iterations, setIterations] = useState(10000);

  const handleAddFund = (fund: FundScheme) => {
    if (selectedFunds.length >= 5) {
      toast.error("Maximum 5 funds allowed");
      return;
    }
    if (selectedFunds.some((f) => f.schemeCode === fund.schemeCode)) {
      toast.error("Fund already added");
      return;
    }
    setSelectedFunds([...selectedFunds, fund]);
    setResult(null);
  };

  const handleRemoveFund = (schemeCode: number) => {
    setSelectedFunds(selectedFunds.filter((f) => f.schemeCode !== schemeCode));
    setResult(null);
  };

  const handleOptimize = async () => {
    if (selectedFunds.length < 2) {
      toast.error("Select at least 2 funds");
      return;
    }

    setIsOptimizing(true);
    setResult(null);

    try {
      // Fetch NAV data for all funds
      const fundData = await Promise.all(
        selectedFunds.map(async (fund) => {
          const details = await getFundDetails(fund.schemeCode);
          return {
            code: fund.schemeCode,
            name: fund.schemeName,
            data: details.data.slice(0, 365), // Use 1 year of data
          };
        })
      );

      // Run Monte Carlo simulation
      const optimizationResult = runMonteCarloSimulation(fundData, iterations);
      setResult(optimizationResult);
      toast.success("Optimization complete!");
    } catch (error) {
      console.error("Optimization failed:", error);
      toast.error("Optimization failed. Please try again.");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <Layout>
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              Advanced Portfolio Optimization
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Monte Carlo Portfolio Optimizer
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Select 2-5 mutual funds to find the optimal portfolio allocation using
              Monte Carlo simulation with {iterations.toLocaleString()} iterations.
            </p>
          </div>

          {/* Fund Selection */}
          <div className="glass rounded-xl p-6 mb-8">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              Select Funds ({selectedFunds.length}/5)
            </h2>

            <SearchInput
              placeholder="Search and add funds..."
              onSelect={handleAddFund}
              className="mb-4"
            />

            {selectedFunds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedFunds.map((fund) => (
                  <div
                    key={fund.schemeCode}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary"
                  >
                    <span className="text-sm text-foreground truncate max-w-[200px]">
                      {fund.schemeName}
                    </span>
                    <button
                      onClick={() => handleRemoveFund(fund.schemeCode)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedFunds.length >= 2 && (
              <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Iterations:</label>
                  <select
                    value={iterations}
                    onChange={(e) => setIterations(Number(e.target.value))}
                    className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  >
                    <option value={5000}>5,000</option>
                    <option value={10000}>10,000</option>
                    <option value={20000}>20,000</option>
                    <option value={50000}>50,000</option>
                  </select>
                </div>
                <Button
                  variant="hero"
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                >
                  {isOptimizing ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isOptimizing ? "Optimizing..." : "Run Optimization"}
                </Button>
              </div>
            )}

            {selectedFunds.length < 2 && (
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                Select at least 2 funds to run optimization
              </div>
            )}
          </div>

          {/* Results */}
          {isOptimizing && (
            <div className="glass rounded-xl p-12">
              <LoadingSpinner
                text={`Running ${iterations.toLocaleString()} simulations...`}
                size="lg"
              />
            </div>
          )}

          {result && !isOptimizing && (
            <div className="space-y-8">
              {/* Efficient Frontier Chart */}
              <div className="glass rounded-xl p-6">
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                  Efficient Frontier
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Each point represents a portfolio. Green = Maximum Sharpe, Orange = Minimum Volatility.
                </p>
                <EfficientFrontierChart
                  portfolios={result.portfolios.slice(0, 2000)}
                  maxSharpe={result.maxSharpePortfolio}
                  minVolatility={result.minVolatilityPortfolio}
                />
              </div>

              {/* Optimal Portfolios */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Max Sharpe Portfolio */}
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        Maximum Sharpe Ratio Portfolio
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Highest risk-adjusted return
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Return</p>
                      <p className="text-lg font-semibold text-success">
                        {(result.maxSharpePortfolio.expectedReturn * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Volatility</p>
                      <p className="text-lg font-semibold text-foreground">
                        {(result.maxSharpePortfolio.volatility * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-lg font-semibold text-primary">
                        {result.maxSharpePortfolio.sharpeRatio.toFixed(3)}
                      </p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">Fund</TableHead>
                        <TableHead className="text-muted-foreground text-right">Weight</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.fundNames.map((name, i) => (
                        <TableRow key={i} className="border-border">
                          <TableCell className="text-foreground truncate max-w-[200px]">
                            {name}
                          </TableCell>
                          <TableCell className="text-right font-medium text-success">
                            {(result.maxSharpePortfolio.weights[i] * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Min Volatility Portfolio */}
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        Minimum Volatility Portfolio
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Lowest risk portfolio
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Return</p>
                      <p className="text-lg font-semibold text-foreground">
                        {(result.minVolatilityPortfolio.expectedReturn * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Volatility</p>
                      <p className="text-lg font-semibold text-warning">
                        {(result.minVolatilityPortfolio.volatility * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-lg font-semibold text-primary">
                        {result.minVolatilityPortfolio.sharpeRatio.toFixed(3)}
                      </p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">Fund</TableHead>
                        <TableHead className="text-muted-foreground text-right">Weight</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.fundNames.map((name, i) => (
                        <TableRow key={i} className="border-border">
                          <TableCell className="text-foreground truncate max-w-[200px]">
                            {name}
                          </TableCell>
                          <TableCell className="text-right font-medium text-warning">
                            {(result.minVolatilityPortfolio.weights[i] * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
