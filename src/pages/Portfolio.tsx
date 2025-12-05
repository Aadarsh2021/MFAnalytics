import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SearchInput } from "@/components/common/SearchInput";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PortfolioPieChart } from "@/components/charts/PortfolioPieChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getPortfolio,
  addHolding,
  removeHolding,
  PortfolioHolding,
  calculateHoldingMetrics,
} from "@/lib/portfolio";
import { getFundDetails, FundScheme } from "@/lib/api";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Portfolio() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<FundScheme | null>(null);
  const [purchaseNav, setPurchaseNav] = useState("");
  const [units, setUnits] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");

  useEffect(() => {
    loadPortfolio();
  }, []);

  async function loadPortfolio() {
    setIsLoading(true);
    try {
      const stored = getPortfolio();

      // Fetch current NAV for each holding
      const updatedHoldings = await Promise.all(
        stored.map(async (holding) => {
          try {
            const details = await getFundDetails(holding.schemeCode);
            const currentNav = parseFloat(details.data[0]?.nav || "0");
            return calculateHoldingMetrics(holding, currentNav);
          } catch {
            return holding;
          }
        })
      );

      setHoldings(updatedHoldings);
    } catch (error) {
      console.error("Failed to load portfolio:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddHolding = async () => {
    if (!selectedFund || !purchaseNav || !units || !purchaseDate) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const newHolding = addHolding({
        schemeCode: selectedFund.schemeCode,
        schemeName: selectedFund.schemeName,
        purchaseNav: parseFloat(purchaseNav),
        units: parseFloat(units),
        purchaseDate,
      });

      // Fetch current NAV
      const details = await getFundDetails(newHolding.schemeCode);
      const currentNav = parseFloat(details.data[0]?.nav || "0");
      const updated = calculateHoldingMetrics(newHolding, currentNav);

      setHoldings([...holdings, updated]);
      setIsDialogOpen(false);
      resetForm();
      toast.success("Holding added successfully");
    } catch (error) {
      toast.error("Failed to add holding");
    }
  };

  const handleRemoveHolding = (id: string) => {
    removeHolding(id);
    setHoldings(holdings.filter((h) => h.id !== id));
    toast.success("Holding removed");
  };

  const resetForm = () => {
    setSelectedFund(null);
    setPurchaseNav("");
    setUnits("");
    setPurchaseDate("");
  };

  const totalInvested = holdings.reduce((sum, h) => sum + (h.investedValue || 0), 0);
  const totalCurrent = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  const totalProfitLoss = totalCurrent - totalInvested;
  const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  const pieData = holdings.map((h) => ({
    name: h.schemeName.length > 20 ? h.schemeName.substring(0, 20) + "..." : h.schemeName,
    value: h.currentValue || 0,
  }));

  return (
    <Layout>
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Portfolio Tracker
              </h1>
              <p className="text-muted-foreground mt-1">
                Track your mutual fund investments and performance
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="w-4 h-4" />
                  Add Holding
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-display">Add New Holding</DialogTitle>
                  <DialogDescription>
                    Add a mutual fund to your portfolio
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Search Fund
                    </label>
                    <SearchInput
                      placeholder="Search fund..."
                      onSelect={(fund) => setSelectedFund(fund)}
                    />
                    {selectedFund && (
                      <p className="text-sm text-primary mt-2">
                        Selected: {selectedFund.schemeName}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        Purchase NAV (₹)
                      </label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={purchaseNav}
                        onChange={(e) => setPurchaseNav(e.target.value)}
                        placeholder="0.0000"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        Units
                      </label>
                      <Input
                        type="number"
                        step="0.001"
                        value={units}
                        onChange={(e) => setUnits(e.target.value)}
                        placeholder="0.000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Purchase Date
                    </label>
                    <Input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  </div>

                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={handleAddHolding}
                  >
                    Add to Portfolio
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <LoadingSpinner text="Loading portfolio..." className="py-12" />
          ) : holdings.length === 0 ? (
            <div className="text-center py-20 glass rounded-xl">
              <Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Holdings Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Start tracking your mutual fund investments
              </p>
              <Button variant="hero" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                Add First Holding
              </Button>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="glass rounded-xl p-5">
                  <p className="text-sm text-muted-foreground mb-1">Total Invested</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    ₹{totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="glass rounded-xl p-5">
                  <p className="text-sm text-muted-foreground mb-1">Current Value</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    ₹{totalCurrent.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="glass rounded-xl p-5">
                  <p className="text-sm text-muted-foreground mb-1">Profit/Loss</p>
                  <div className="flex items-center gap-2">
                    {totalProfitLoss >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-success" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-destructive" />
                    )}
                    <span
                      className={cn(
                        "text-2xl font-display font-bold",
                        totalProfitLoss >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      ₹{Math.abs(totalProfitLoss).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="glass rounded-xl p-5">
                  <p className="text-sm text-muted-foreground mb-1">Returns</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-2xl font-display font-bold",
                        totalProfitLossPercent >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {totalProfitLossPercent >= 0 ? "+" : ""}
                      {totalProfitLossPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart & Table Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pie Chart */}
                <div className="glass rounded-xl p-6">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    Allocation
                  </h2>
                  <PortfolioPieChart data={pieData} />
                </div>

                {/* Holdings Table */}
                <div className="lg:col-span-2 glass rounded-xl p-6 overflow-hidden">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-primary" />
                    Holdings
                  </h2>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-muted-foreground">Fund</TableHead>
                          <TableHead className="text-muted-foreground text-right">Units</TableHead>
                          <TableHead className="text-muted-foreground text-right">Invested</TableHead>
                          <TableHead className="text-muted-foreground text-right">Current</TableHead>
                          <TableHead className="text-muted-foreground text-right">P&L</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {holdings.map((holding) => (
                          <TableRow key={holding.id} className="border-border">
                            <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                              {holding.schemeName}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {holding.units.toFixed(3)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              ₹{holding.investedValue?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="text-right text-foreground">
                              ₹{holding.currentValue?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={cn(
                                  "font-medium",
                                  (holding.profitLossPercent || 0) >= 0
                                    ? "text-success"
                                    : "text-destructive"
                                )}
                              >
                                {(holding.profitLossPercent || 0) >= 0 ? "+" : ""}
                                {(holding.profitLossPercent || 0).toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveHolding(holding.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
