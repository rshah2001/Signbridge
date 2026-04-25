import { useEffect, useState } from "react";
import { getAnalytics } from "../lib/api";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Snowflake, Activity, AlertTriangle, MapPinned, Database } from "lucide-react";

const PALETTE = ["#2E5A44", "#B34D41", "#C68B59", "#5E7A8A", "#8E9A6F"];

const Kpi = ({ label, value, sub, accent }) => (
  <div className="clay-card rounded-2xl p-6">
    <div className="text-xs uppercase tracking-[0.2em] text-[#5C6B62]">{label}</div>
    <div className={`mt-2 font-display text-4xl font-light ${accent ? "text-[#B34D41]" : "text-[#2E5A44]"}`}>{value}</div>
    {sub && <div className="mt-1 text-xs text-[#5C6B62]">{sub}</div>}
  </div>
);

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAnalytics().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <div className="mx-auto max-w-7xl px-6 py-20 text-[#B34D41]">{error}</div>;
  }
  if (!data) {
    return (
      <div data-testid="analytics-loading" className="mx-auto max-w-7xl px-6 py-20">
        <div className="h-6 w-40 animate-pulse rounded bg-[#E6DFD3]" />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#E6DFD3]" />
          ))}
        </div>
      </div>
    );
  }

  const { kpis, top_phrases, confidence_series, emergency_trend, misinterpreted, accessibility_gaps, queries_executed } = data;

  return (
    <div data-testid="analytics-page" className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[#5C6B62]">
            <Snowflake strokeWidth={1.5} className="h-4 w-4 text-[#2E5A44]" /> Snowflake-style analytics layer
          </div>
          <h1 className="mt-2 font-display text-3xl font-medium leading-tight sm:text-4xl">
            Accessibility intelligence dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#5C6B62]">
            Anonymized session telemetry from MongoDB streamed into our Snowflake warehouse identifies
            communication gaps, misinterpreted signs, and accessibility hotspots in real time.
          </p>
        </div>
        <div className="rounded-full border border-[#DCD5C9] bg-white px-3 py-1.5 font-mono-ui text-xs text-[#5C6B62]">
          generated {new Date(data.generated_at).toLocaleTimeString()}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Kpi label="Conversations" value={kpis.conversations} sub="active sessions" />
        <Kpi label="Messages" value={kpis.messages} sub="across both directions" />
        <Kpi label="Signs detected" value={kpis.signs_detected} sub="MediaPipe + manual" />
        <Kpi label="Avg confidence" value={`${Math.round(kpis.avg_confidence * 100)}%`} sub="rolling 14-day" />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="clay-card rounded-2xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#5C6B62]">Top signed phrases</div>
              <div className="font-display text-lg">Most frequent communication needs</div>
            </div>
            <Activity strokeWidth={1.5} className="h-5 w-5 text-[#2E5A44]" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top_phrases} margin={{ left: -10, right: 8 }}>
                <CartesianGrid stroke="#E6DFD3" vertical={false} />
                <XAxis dataKey="sign_key" tick={{ fontSize: 12, fill: "#5C6B62" }} />
                <YAxis tick={{ fontSize: 12, fill: "#5C6B62" }} />
                <Tooltip cursor={{ fill: "#F0EBDF" }} contentStyle={{ borderRadius: 12, borderColor: "#DCD5C9" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#2E5A44" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="clay-card rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#5C6B62]">Misinterpreted signs</div>
              <div className="font-display text-lg">Where accuracy needs work</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={misinterpreted} dataKey="count" nameKey="sign_key" outerRadius={90} innerRadius={50} paddingAngle={3}>
                  {misinterpreted.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#DCD5C9" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="clay-card rounded-2xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#5C6B62]">Confidence trend</div>
              <div className="font-display text-lg">Gesture recognition improving over time</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={confidence_series}>
                <defs>
                  <linearGradient id="conf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2E5A44" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2E5A44" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E6DFD3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5C6B62" }} />
                <YAxis domain={[0.5, 1]} tick={{ fontSize: 11, fill: "#5C6B62" }} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#DCD5C9" }} />
                <Area type="monotone" dataKey="avg_confidence" stroke="#2E5A44" strokeWidth={2} fill="url(#conf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="clay-card rounded-2xl border-[#B34D41]/30 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B34D41]">
                <AlertTriangle strokeWidth={1.5} className="h-4 w-4" /> Emergency trend
              </div>
              <div className="font-display text-lg">Help · Doctor · Pain · Emergency</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={emergency_trend}>
                <CartesianGrid stroke="#E6DFD3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5C6B62" }} />
                <YAxis tick={{ fontSize: 11, fill: "#5C6B62" }} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#DCD5C9" }} />
                <Line type="monotone" dataKey="count" stroke="#B34D41" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row: gaps + queries */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="clay-card rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#5C6B62]">
                <MapPinned strokeWidth={1.5} className="h-4 w-4" /> Accessibility gaps
              </div>
              <div className="font-display text-lg">Region · readiness score</div>
            </div>
          </div>
          <ul className="space-y-3">
            {accessibility_gaps.map((g) => (
              <li key={g.region} className="flex items-center justify-between rounded-xl border border-[#DCD5C9] bg-white p-3">
                <div>
                  <div className="font-display text-sm font-medium">{g.region}</div>
                  <div className="text-xs text-[#5C6B62]">{g.gap}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[#E6DFD3]">
                    <div className="h-full rounded-full bg-[#2E5A44]" style={{ width: `${g.score}%` }} />
                  </div>
                  <span className="font-mono-ui text-xs text-[#1F2421]">{g.score}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="clay-card rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#5C6B62]">
                <Database strokeWidth={1.5} className="h-4 w-4" /> Snowflake queries executed
              </div>
              <div className="font-display text-lg">Powering this dashboard</div>
            </div>
          </div>
          <div className="space-y-3">
            {queries_executed.map((q, i) => (
              <pre key={i} className="overflow-x-auto rounded-xl bg-[#1F2421] p-4 font-mono-ui text-xs leading-relaxed text-[#E6DFD3]">
{q}
              </pre>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
