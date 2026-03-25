import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, ShieldX, TriangleAlert } from "lucide-react";

import { GeneratedTopology } from "@/types/network";
import { getTopologies } from "@/utils/storage";

export default function SecurityAnalysis() {
  const [latest, setLatest] = useState<GeneratedTopology | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTopologies = async () => {
      try {
        const topologies = await getTopologies();
        if (mounted) {
          setLatest(topologies[0]?.topology ?? null);
        }
      } catch (error) {
        console.error("Failed to load security analysis data", error);
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

  const issues = latest?.security.issues ?? [];
  const critical = issues.filter((issue) => issue.severity === "critical").length;
  const warning = issues.filter((issue) => issue.severity === "warning").length;
  const info = issues.filter((issue) => issue.severity === "info").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-primary/70">Security Analysis Engine</p>
        <h1 className="mt-2 text-3xl font-bold flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-primary" />
          Topology Risk Review
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Analyze firewall presence, segmentation quality, and open exposure paths in the current network design.
        </p>
      </div>

      {loading && (
        <div className="glass-card p-8 text-sm text-muted-foreground">
          Loading topology security data from MongoDB...
        </div>
      )}

      {!loading && !latest && (
        <div className="glass-card p-8 text-sm text-muted-foreground">
          No topology available yet. Create and save a topology first to run the security analysis engine.
        </div>
      )}

      {!loading && latest && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="glass-card p-5 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Security Score</p>
              <p className="mt-3 text-5xl font-bold text-primary">{latest.security.score}</p>
              <p className="mt-2 text-sm text-muted-foreground">{latest.security.status}</p>
            </div>

            <div className="glass-card p-5 text-center">
              <ShieldX className="mx-auto h-6 w-6 text-red-400" />
              <p className="mt-3 text-4xl font-bold text-red-400">{critical}</p>
              <p className="text-muted-foreground">Critical</p>
            </div>

            <div className="glass-card p-5 text-center">
              <TriangleAlert className="mx-auto h-6 w-6 text-yellow-400" />
              <p className="mt-3 text-4xl font-bold text-yellow-400">{warning}</p>
              <p className="text-muted-foreground">Warnings</p>
            </div>

            <div className="glass-card p-5 text-center">
              <ShieldCheck className="mx-auto h-6 w-6 text-green-400" />
              <p className="mt-3 text-4xl font-bold text-green-400">{info}</p>
              <p className="text-muted-foreground">Informational</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold">Warnings and Suggestions</h2>
              <div className="mt-4 space-y-3">
                {issues.map((issue) => (
                  <div key={issue.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{issue.title}</p>
                      <span className="rounded-full border border-border/60 px-2.5 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {issue.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{issue.description}</p>
                    <p className="mt-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
                      {issue.recommendation}
                    </p>
                  </div>
                ))}

                {issues.length === 0 && (
                  <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
                    No major issues detected. The generated topology has good segmentation and an edge firewall in place.
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold">Security Recommendations</h2>
              <div className="mt-4 space-y-3">
                {latest.security.suggestions.map((suggestion) => (
                  <div key={suggestion} className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                    {suggestion}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-border/60 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-primary/70">Analyzed Scope</p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <p>Firewall nodes: {latest.nodes.filter((node) => node.type === "firewall").length}</p>
                  <p>VLAN segments: {latest.vlanPlan.length}</p>
                  <p>Open connections: {latest.links.filter((link) => link.open).length}</p>
                  <p>Routers in core: {latest.nodes.filter((node) => node.type === "router").length}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
