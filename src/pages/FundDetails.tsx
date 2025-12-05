import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { NavChart } from "@/components/charts/NavChart";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import {
  getFundDetails,
  FundDetails as FundDetailsType,
  getRiskLevel,
  calculateReturns,
  generateCSV,
  downloadCSV,
} from "@/lib/api";
import {
  ArrowLeft,
  Download,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function FundDetails() {
  const { schemeCode } = useParams<{ schemeCode: string }>();
  const [fund, setFund] = useState<FundDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartDays, setChartDays] = useState(90);

  useEffect(() => {
    async function loadFund() {
      if (!schemeCode) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await getFundDetails(schemeCode);
        setFund(data);
      } catch (err) {
        setError("Failed to load fund details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadFund();
  }, [schemeCode]);

  const handleDownloadCSV = () => {
    if (!fund) return;
    const csv = generateCSV(fund.data, fund.meta.scheme_name);
    downloadCSV(csv, `${fund.meta.scheme_code}_nav_data.csv`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingSpinner text="Loading fund details..." size="lg" />
        </div>
      </Layout>
    );
  }

  if (error || !fund) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-16 h-16 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold text-foreground">
              {error || "Fund not found"}
            </h2>
            <Link to="/search">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const risk = getRiskLevel(fund.meta.scheme_category || "");
  const currentNav = fund.data[0]?.nav || "N/A";
  const returns1M = calculateReturns(fund.data, 30);
  const returns3M = calculateReturns(fund.data, 90);
  const returns1Y = calculateReturns(fund.data, 365);

  return (
    <Layout>
      <div className="py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Back Button */}
          <Link to="/search" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Link>

          {/* Fund Header */}
          <div className="glass rounded-xl p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="space-y-3">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {fund.meta.scheme_name}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    {fund.meta.fund_house}
                  </div>
                  {fund.meta.scheme_category && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Tag className="w-4 h-4" />
                      {fund.meta.scheme_category}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      risk.color === "success" && "bg-success/20 text-success",
                      risk.color === "warning" && "bg-warning/20 text-warning",
                      risk.color === "destructive" && "bg-destructive/20 text-destructive"
                    )}
                  >
                    {risk.level}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm bg-secondary text-muted-foreground">
                    {fund.meta.scheme_type}
                  </span>
                </div>
              </div>

              <div className="text-left md:text-right space-y-2">
                <p className="text-sm text-muted-foreground">Current NAV</p>
                <p className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  ₹{parseFloat(currentNav).toFixed(4)}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 md:justify-end">
                  <Calendar className="w-3.5 h-3.5" />
                  {fund.data[0]?.date}
                </p>
              </div>
            </div>
          </div>

          {/* Returns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: "1 Month Return", value: returns1M },
              { label: "3 Month Return", value: returns3M },
              { label: "1 Year Return", value: returns1Y },
            ].map((item) => (
              <div key={item.label} className="glass rounded-xl p-5">
                <p className="text-sm text-muted-foreground mb-2">{item.label}</p>
                {item.value !== null ? (
                  <div className="flex items-center gap-2">
                    {item.value >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-success" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-destructive" />
                    )}
                    <span
                      className={cn(
                        "text-2xl font-display font-bold",
                        item.value >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {item.value >= 0 ? "+" : ""}
                      {item.value.toFixed(2)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-lg text-muted-foreground">N/A</span>
                )}
              </div>
            ))}
          </div>

          {/* NAV Chart */}
          <div className="glass rounded-xl p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h2 className="font-display text-xl font-semibold text-foreground">
                NAV History
              </h2>

              <div className="flex items-center gap-2">
                {[
                  { label: "30D", days: 30 },
                  { label: "90D", days: 90 },
                  { label: "1Y", days: 365 },
                  { label: "All", days: fund.data.length },
                ].map((option) => (
                  <Button
                    key={option.label}
                    variant={chartDays === option.days ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartDays(option.days)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <NavChart data={fund.data} days={chartDays} />
          </div>

          {/* Download Section */}
          <div className="glass rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Download NAV Data
                </h2>
                <p className="text-muted-foreground mt-1">
                  Export historical NAV data as CSV file for further analysis
                </p>
              </div>
              <Button variant="hero" onClick={handleDownloadCSV}>
                <Download className="w-4 h-4" />
                Download CSV
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
