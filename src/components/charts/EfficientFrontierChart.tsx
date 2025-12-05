import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { PortfolioResult } from "@/lib/monteCarlo";

interface EfficientFrontierChartProps {
  portfolios: PortfolioResult[];
  maxSharpe: PortfolioResult;
  minVolatility: PortfolioResult;
}

export function EfficientFrontierChart({
  portfolios,
  maxSharpe,
  minVolatility,
}: EfficientFrontierChartProps) {
  const chartData = portfolios.map((p) => ({
    volatility: p.volatility * 100,
    return: p.expectedReturn * 100,
    sharpe: p.sharpeRatio,
  }));

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
          <XAxis
            type="number"
            dataKey="volatility"
            name="Volatility"
            unit="%"
            stroke="hsl(215, 20%, 55%)"
            fontSize={12}
            tickLine={false}
            label={{
              value: "Volatility (%)",
              position: "insideBottom",
              offset: -10,
              fill: "hsl(215, 20%, 55%)",
            }}
          />
          <YAxis
            type="number"
            dataKey="return"
            name="Return"
            unit="%"
            stroke="hsl(215, 20%, 55%)"
            fontSize={12}
            tickLine={false}
            label={{
              value: "Expected Return (%)",
              angle: -90,
              position: "insideLeft",
              fill: "hsl(215, 20%, 55%)",
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222, 47%, 10%)",
              border: "1px solid hsl(222, 30%, 18%)",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(2)}%`,
              name === "return" ? "Expected Return" : "Volatility",
            ]}
          />
          <Scatter name="Portfolios" data={chartData} fill="hsl(173, 80%, 40%)" opacity={0.4} />
          <ReferenceDot
            x={maxSharpe.volatility * 100}
            y={maxSharpe.expectedReturn * 100}
            r={8}
            fill="hsl(142, 76%, 36%)"
            stroke="hsl(210, 40%, 98%)"
            strokeWidth={2}
          />
          <ReferenceDot
            x={minVolatility.volatility * 100}
            y={minVolatility.expectedReturn * 100}
            r={8}
            fill="hsl(38, 92%, 50%)"
            stroke="hsl(210, 40%, 98%)"
            strokeWidth={2}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
