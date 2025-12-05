import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { NavData } from "@/lib/api";

interface NavChartProps {
  data: NavData[];
  days?: number;
}

export function NavChart({ data, days = 90 }: NavChartProps) {
  const chartData = data
    .slice(0, days)
    .reverse()
    .map((item) => ({
      date: item.date,
      nav: parseFloat(item.nav),
    }));

  const minNav = Math.min(...chartData.map((d) => d.nav)) * 0.995;
  const maxNav = Math.max(...chartData.map((d) => d.nav)) * 1.005;

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(222, 30%, 18%)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="hsl(215, 20%, 55%)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              const parts = value.split("-");
              return `${parts[0]}/${parts[1]}`;
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="hsl(215, 20%, 55%)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[minNav, maxNav]}
            tickFormatter={(value) => `₹${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222, 47%, 10%)",
              border: "1px solid hsl(222, 30%, 18%)",
              borderRadius: "8px",
              boxShadow: "0 4px 24px hsl(222, 47%, 4% / 0.4)",
            }}
            labelStyle={{ color: "hsl(210, 40%, 98%)" }}
            itemStyle={{ color: "hsl(173, 80%, 40%)" }}
            formatter={(value: number) => [`₹${value.toFixed(4)}`, "NAV"]}
          />
          <Area
            type="monotone"
            dataKey="nav"
            stroke="hsl(173, 80%, 40%)"
            strokeWidth={2}
            fill="url(#navGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
