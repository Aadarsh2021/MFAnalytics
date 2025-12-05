import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface PieData {
  name: string;
  value: number;
}

interface PortfolioPieChartProps {
  data: PieData[];
}

const COLORS = [
  "hsl(173, 80%, 40%)",
  "hsl(190, 80%, 50%)",
  "hsl(210, 80%, 50%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 80%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(320, 80%, 50%)",
];

export function PortfolioPieChart({ data }: PortfolioPieChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222, 47%, 10%)",
              border: "1px solid hsl(222, 30%, 18%)",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`, "Value"]}
          />
          <Legend
            formatter={(value) => (
              <span className="text-sm text-muted-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
