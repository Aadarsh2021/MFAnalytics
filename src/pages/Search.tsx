import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SearchInput } from "@/components/common/SearchInput";
import { FundCard } from "@/components/common/FundCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { searchFunds, getAllFunds, FundScheme } from "@/lib/api";
import { Search, Filter } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FundScheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [popularFunds, setPopularFunds] = useState<FundScheme[]>([]);

  useEffect(() => {
    async function loadPopular() {
      try {
        const funds = await getAllFunds();
        // Get some popular AMC funds
        const popular = funds
          .filter(
            (f) =>
              f.schemeName.toLowerCase().includes("hdfc") ||
              f.schemeName.toLowerCase().includes("icici") ||
              f.schemeName.toLowerCase().includes("sbi") ||
              f.schemeName.toLowerCase().includes("axis")
          )
          .slice(0, 12);
        setPopularFunds(popular);
      } catch (error) {
        console.error("Failed to load popular funds:", error);
      }
    }
    loadPopular();
  }, []);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setQuery(searchQuery);

    try {
      const funds = await searchFunds(searchQuery);
      setResults(funds);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center space-y-4 mb-12">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Search Mutual Funds
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Search from over 40,000+ mutual fund schemes. Find the perfect fund
              for your investment goals.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="flex gap-4">
              <div className="flex-1">
                <SearchInput
                  size="large"
                  placeholder="Search by fund name or scheme code..."
                  onSelect={(fund) => handleSearch(fund.schemeName)}
                />
              </div>
            </div>

            {/* Quick Search Suggestions */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {["Large Cap", "Index Fund", "ELSS", "Debt Fund", "Liquid"].map(
                (term) => (
                  <Button
                    key={term}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(term)}
                  >
                    {term}
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <LoadingSpinner text="Searching funds..." className="py-12" />
          ) : hasSearched ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  Found <span className="text-foreground font-medium">{results.length}</span>{" "}
                  results for "{query}"
                </p>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
              </div>

              {results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.slice(0, 30).map((fund, index) => (
                    <div
                      key={fund.schemeCode}
                      className="animate-slide-up"
                      style={{ animationDelay: `${(index % 12) * 50}ms` }}
                    >
                      <FundCard
                        schemeCode={fund.schemeCode}
                        schemeName={fund.schemeName}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 glass rounded-xl">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No funds found
                  </h3>
                  <p className="text-muted-foreground">
                    Try searching with different keywords
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Popular Funds
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularFunds.map((fund, index) => (
                  <div
                    key={fund.schemeCode}
                    className="animate-slide-up"
                    style={{ animationDelay: `${(index % 12) * 50}ms` }}
                  >
                    <FundCard
                      schemeCode={fund.schemeCode}
                      schemeName={fund.schemeName}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
