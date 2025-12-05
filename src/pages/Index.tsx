import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SearchInput } from "@/components/common/SearchInput";
import { StatsCard } from "@/components/common/StatsCard";
import { FundCard } from "@/components/common/FundCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { getAllFunds, getFundDetails, FundScheme, FundDetails } from "@/lib/api";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowRight,
  PieChart,
} from "lucide-react";

interface TrendingFund {
  schemeCode: number;
  schemeName: string;
  details?: FundDetails;
}

export default function Index() {
  const [totalFunds, setTotalFunds] = useState<number>(0);
  const [trendingFunds, setTrendingFunds] = useState<TrendingFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [latestUpdate, setLatestUpdate] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      try {
        const funds = await getAllFunds();
        setTotalFunds(funds.length);

        // Get random trending funds
        const shuffled = [...funds].sort(() => 0.5 - Math.random());
        const selectedFunds = shuffled.slice(0, 6);

        // Fetch details for trending funds
        const trendingWithDetails: TrendingFund[] = await Promise.all(
          selectedFunds.map(async (fund): Promise<TrendingFund> => {
            try {
              const details = await getFundDetails(fund.schemeCode);
              return { schemeCode: fund.schemeCode, schemeName: fund.schemeName, details };
            } catch {
              return { schemeCode: fund.schemeCode, schemeName: fund.schemeName };
            }
          })
        );

        setTrendingFunds(trendingWithDetails);

        // Get latest NAV date from first fund with data
        const fundWithData = trendingWithDetails.find((f) => f.details?.data?.length);
        if (fundWithData?.details?.data?.[0]) {
          setLatestUpdate(fundWithData.details.data[0].date);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />

        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="text-center space-y-6 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              Real-time data powered by MFAPI
            </div>

            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight">
              Track & Analyze{" "}
              <span className="text-gradient">Indian Mutual Funds</span>
              <br />
              in Real-Time
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive analytics, portfolio tracking, and Monte Carlo optimization
              for smarter investment decisions.
            </p>

            <div className="max-w-xl mx-auto pt-4">
              <SearchInput size="large" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
              <Link to="/search">
                <Button variant="hero" size="xl">
                  Explore Funds
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/portfolio">
                <Button variant="glass" size="xl">
                  <PieChart className="w-5 h-5" />
                  Track Portfolio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Total Mutual Funds"
              value={isLoading ? "..." : totalFunds.toLocaleString()}
              icon={<BarChart3 className="w-6 h-6" />}
              className="animate-slide-up"
            />
            <StatsCard
              title="Latest NAV Update"
              value={isLoading ? "..." : latestUpdate || "N/A"}
              icon={<Calendar className="w-6 h-6" />}
              className="animate-slide-up animation-delay-100"
            />
            <StatsCard
              title="Data Source"
              value="MFAPI.in"
              icon={<TrendingUp className="w-6 h-6" />}
              className="animate-slide-up animation-delay-200"
            />
          </div>
        </div>
      </section>

      {/* Trending Funds */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Trending Funds
              </h2>
              <p className="text-muted-foreground mt-1">
                Explore popular mutual fund schemes
              </p>
            </div>
            <Link to="/search">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <LoadingSpinner text="Loading trending funds..." className="py-12" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingFunds.map((fund, index) => (
                <div
                  key={fund.schemeCode}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <FundCard
                    schemeCode={fund.schemeCode}
                    schemeName={fund.schemeName}
                    amc={fund.details?.meta?.fund_house}
                    category={fund.details?.meta?.scheme_category}
                    nav={fund.details?.data?.[0]?.nav}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Powerful Features
            </h2>
            <p className="text-muted-foreground mt-2">
              Everything you need to analyze and manage your mutual fund investments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: "NAV Analytics",
                description:
                  "Track historical NAV data with interactive charts and performance metrics.",
              },
              {
                icon: <PieChart className="w-8 h-8" />,
                title: "Portfolio Tracker",
                description:
                  "Monitor your investments with real-time P&L calculations and allocation views.",
              },
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "Monte Carlo Optimizer",
                description:
                  "Find optimal portfolio weights using advanced Monte Carlo simulations.",
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="glass rounded-xl p-6 text-center space-y-4 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
