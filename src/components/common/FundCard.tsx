import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FundCardProps {
  schemeCode: number;
  schemeName: string;
  amc?: string;
  category?: string;
  nav?: string;
  navChange?: number;
  className?: string;
}

export function FundCard({
  schemeCode,
  schemeName,
  amc,
  category,
  nav,
  navChange,
  className,
}: FundCardProps) {
  return (
    <Link
      to={`/fund/${schemeCode}`}
      className={cn(
        "block glass rounded-xl p-5 card-shadow hover:elevated-shadow hover:border-primary/30 transition-all duration-300 group",
        className
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {schemeName}
            </h3>
            {amc && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" />
                <span className="truncate">{amc}</span>
              </div>
            )}
          </div>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {category && (
            <span className="text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground">
              {category}
            </span>
          )}
          {nav && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">₹{nav}</span>
              {navChange !== undefined && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium",
                    navChange >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {navChange >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(navChange).toFixed(2)}%
                </span>
              )}
            </div>
          )}
          {!nav && !category && (
            <span className="text-xs text-muted-foreground">Code: {schemeCode}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
