import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSettl } from "@/context/settl-context";
import { AnalyticsCard, PageSection } from "@/components/settl/shared";

const volumeSeries = [
  { month: "Jan", financed: 120000, settled: 84000 },
  { month: "Feb", financed: 164000, settled: 140000 },
  { month: "Mar", financed: 192000, settled: 178000 },
  { month: "Apr", financed: 246000, settled: 204000 },
];

const exposureSeries = [
  { name: "Retail", value: 39 },
  { name: "Exports", value: 28 },
  { name: "Logistics", value: 18 },
  { name: "Services", value: 15 },
];

const riskSeries = [
  { band: "Low", count: 4 },
  { band: "Moderate", count: 2 },
  { band: "Elevated", count: 1 },
  { band: "Watchlist", count: 1 },
];

const pieColors = ["#25A244", "#8A776C", "#B7791F", "#A34747"];

export default function Analytics() {
  const { overviewMetrics } = useSettl();

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Analytics"
        title="Exposure, settlement quality, and operating performance"
        description="Analytics stay restrained and finance-oriented. The goal is operational confidence, not ornamental noise."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsCard
          title="Financed volume over time"
          detail={`Settlement success rate is ${overviewMetrics.settlementSuccessRate.toFixed(1)}% across seeded demo activity.`}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeSeries}>
                <CartesianGrid stroke="#D8CCBE" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#8A776C" />
                <YAxis stroke="#8A776C" />
                <Tooltip />
                <Area type="monotone" dataKey="financed" stroke="#25A244" fill="#DDF3E4" strokeWidth={2} />
                <Area type="monotone" dataKey="settled" stroke="#5B4A42" fill="#EAE4DC" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Exposure by sector"
          detail="Concentration remains visible for capital and risk committees."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={exposureSeries} dataKey="value" innerRadius={70} outerRadius={105}>
                  {exposureSeries.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Risk distribution"
          detail="Watchlist items remain isolated and visible to the admin queue."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskSeries}>
                <CartesianGrid stroke="#D8CCBE" strokeDasharray="3 3" />
                <XAxis dataKey="band" stroke="#8A776C" />
                <YAxis stroke="#8A776C" />
                <Tooltip />
                <Bar dataKey="count" fill="#25A244" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Protocol revenue summary"
          detail="Protocol fees are intentionally sober and tied to real settlement activity."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Summary title="Protocol fees" value="$4,870" />
            <Summary title="Funding spread revenue" value="$12,400" />
            <Summary title="Funding turnaround" value="2.7 days" />
            <Summary title="Overdue trend" value="1 active name" />
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
}

function Summary({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-card-stone/40 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-taupe">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-espresso">{value}</p>
    </div>
  );
}
