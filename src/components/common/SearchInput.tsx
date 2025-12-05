import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { searchFunds, FundScheme } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  className?: string;
  size?: "default" | "large";
  onSelect?: (fund: FundScheme) => void;
  placeholder?: string;
}

export function SearchInput({
  className,
  size = "default",
  onSelect,
  placeholder = "Search any Mutual Fund Scheme...",
}: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FundScheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const funds = await searchFunds(query);
          setResults(funds.slice(0, 10));
          setIsOpen(true);
        } catch (error) {
          console.error("Search failed:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (fund: FundScheme) => {
    if (onSelect) {
      onSelect(fund);
    } else {
      navigate(`/fund/${fund.schemeCode}`);
    }
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground",
            size === "large" ? "w-5 h-5" : "w-4 h-4"
          )}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "pl-12 pr-12 bg-secondary border-border focus:border-primary",
            size === "large" && "h-14 text-lg rounded-xl"
          )}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden card-shadow z-50 max-h-80 overflow-y-auto">
          {results.map((fund) => (
            <button
              key={fund.schemeCode}
              onClick={() => handleSelect(fund)}
              className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors border-b border-border/50 last:border-0"
            >
              <p className="text-sm font-medium text-foreground line-clamp-1">
                {fund.schemeName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Code: {fund.schemeCode}
              </p>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl p-4 card-shadow z-50">
          <p className="text-sm text-muted-foreground text-center">No funds found</p>
        </div>
      )}
    </div>
  );
}
