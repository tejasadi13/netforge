import { useEffect, useMemo, useState } from "react";
import { Activity, Building2, Network, Shield, ShieldAlert, Waypoints } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar, RadarChart, XAxis } from "recharts";

import AssistantChatbox from "@/components/AssistantChatbox";
import StatCard from "@/components/StatCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from "@/contexts/AuthContext";
import { getTopologyMetrics } from "@/lib/network-intelligence";
import { getAverageSecurity, getDepartmentAnalytics, getTopologies } from "@/utils/storage";

const chartConfig = {
  devices: { label: "Devices", color: "hsl(187 85% 53%)" },
  security: { label: "Security", color: "hsl(142 71% 45%)" },
  score: { label: "Score", color: "hsl(187 85% 53%)" },
} as const;

export default function DashboardHome() {
  const { user } = useAuth();
  const [topologies, setTopologies] = useState<Awaited<ReturnType<typeof getTopologies>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTopologies = async () => {
      try {
        const saved = await getTopologies();
        if (mounted) {
          setTopologies(saved);
        }
      } catch (error) {
        console.error("Failed to load dashboard topologies", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadTopologies();

    return () => {
      mounted = false;
    };
  }, []);

  const latestTopology = topologies[0]?.topology ?? null;
  const departmentAnalytics = useMemo(() => getDepartmentAnalytics(topologies), [topologies]);

  const totals = useMemo(() => {
    const deviceCount = topologies.reduce(
      (sum, item) => sum + getTopologyMetrics(item.topology).deviceCount,
      0,
    );
    const weakTopologies = topologies.filter((item) => item.securityScore < 70).length;

    return {
      totalTopologies: topologies.length,
      avgSecurity: getAverageSecurity(topologies),
      totalDevices: deviceCount,
      weakTopologies,
      departments: departmentAnalytics.length,
    };
  }, [departmentAnalytics.length, topologies]);

  const topologyOverview = topologies.slice(0, 5).map((item) => ({
    name: item.name.replace(" Network", ""),
    devices: getTopologyMetrics(item.topology).deviceCount,
    security: item.securityScore,
  }));

  const securityRadar = latestTopology
    ? [
        { metric: "Firewall", score: latestTopology.nodes.some((node) => node.type === "firewall") ? 92 : 35 },
        { metric: "Segmentation", score: Math.min(latestTopology.vlanPlan.length * 22, 95) },
        { metric: "Routing", score: latestTopology.nodes.filter((node) => node.type === "router").length > 1 ? 88 : 68 },
        { metric: "Exposure", score: 100 - latestTopology.links.filter((link) => link.open).length * 12 },
      ]
    : [];

  const departmentOverview = departmentAnalytics.slice(0, 5).map((department) => ({
    name: department.name,
    topologies: department.topologies,
    security: department.avgScore,
  }));

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.25),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.88))] p-8 shadow-[0_0_80px_rgba(6,182,212,0.12)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.32em] text-primary/70">NetForge Analytics</p>
            <h1 className="mt-3 text-3xl font-bold text-white">
              Welcome back, {user?.name || "Operator"}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Monitor intelligent topologies, inspect risk posture, and compare real department metrics from MongoDB-backed network data.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-300 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Latest Status</p>
              <p className="mt-2 font-mono text-lg text-white">{latestTopology?.security.status ?? "Idle"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Departments</p>
              <p className="mt-2 font-mono text-lg text-white">{totals.departments}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Devices</p>
              <p className="mt-2 font-mono text-lg text-white">
                {latestTopology ? getTopologyMetrics(latestTopology).deviceCount : 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Risk Alerts</p>
              <p className="mt-2 font-mono text-lg text-white">{totals.weakTopologies}</p>
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <div className="glass-card p-4 text-sm text-muted-foreground">
          Loading MongoDB topology analytics...
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Topologies" value={totals.totalTopologies} icon={Network} trend="Saved intelligent blueprints" />
        <StatCard title="Average Security" value={`${totals.avgSecurity}%`} icon={Shield} variant="success" trend="Across saved environments" />
        <StatCard title="Managed Devices" value={totals.totalDevices} icon={Waypoints} trend="Routers, switches, firewalls, endpoints" />
        <StatCard title="Departments" value={totals.departments} icon={Building2} trend="Live groups from saved topologies" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Topology Intelligence Trend
              </h2>
              <p className="text-sm text-muted-foreground">Device density and security score across recent saved topologies.</p>
            </div>
          </div>

          <ChartContainer config={chartConfig} className="h-80 w-full">
            <AreaChart data={topologyOverview}>
              <defs>
                <linearGradient id="devicesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-devices)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-devices)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="devices" stroke="var(--color-devices)" fill="url(#devicesFill)" strokeWidth={2.5} />
              <Bar dataKey="security" fill="var(--color-security)" radius={[8, 8, 0, 0]} />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold">Security Dimensions</h2>
          <p className="text-sm text-muted-foreground mt-1">Live posture breakdown for the most recent topology.</p>
          <ChartContainer config={chartConfig} className="h-80 w-full mt-4">
            <RadarChart data={securityRadar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <Radar dataKey="score" fill="var(--color-score)" fillOpacity={0.35} stroke="var(--color-score)" />
              <ChartTooltip content={<ChartTooltipContent />} />
            </RadarChart>
          </ChartContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold">Saved Topologies Snapshot</h2>
            <p className="text-sm text-muted-foreground mt-1">Each environment carries its own device footprint and security state.</p>
            <ChartContainer config={chartConfig} className="h-72 w-full mt-4">
              <BarChart data={topologyOverview}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="devices" fill="var(--color-devices)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold">Department Overview</h2>
            <p className="text-sm text-muted-foreground mt-1">Real departments derived from stored topology ownership.</p>
            <ChartContainer config={chartConfig} className="h-72 w-full mt-4">
              <BarChart data={departmentOverview}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="topologies" fill="var(--color-devices)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="security" fill="var(--color-security)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <AssistantChatbox topology={latestTopology} />
      </div>
    </div>
  );
}
