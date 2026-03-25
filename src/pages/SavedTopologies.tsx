import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Eye, Pencil, Shield, Trash2 } from "lucide-react";

import TopologyVisualizer from "@/components/TopologyVisualizer";
import { Button } from "@/components/ui/button";
import { getTopologyMetrics } from "@/lib/network-intelligence";
import { deleteTopology, getTopologies, StoredTopology } from "@/utils/storage";

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
}

export default function SavedTopologies() {
  const navigate = useNavigate();
  const [topologies, setTopologies] = useState<StoredTopology[]>([]);
  const [selected, setSelected] = useState<StoredTopology | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const saved = await getTopologies();
      setTopologies(saved);
      setSelected((current) => saved.find((item) => item.id === current?.id) ?? saved[0] ?? null);
    } catch (error) {
      console.error("Failed to load topologies", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteTopology(id);
      await refresh();
    } catch (error) {
      console.error("Failed to delete topology", error);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.05fr]">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Saved Topologies</h1>
            <p className="text-sm text-muted-foreground mt-1">View, edit, and export every MongoDB-backed topology with its live security status.</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {loading && (
            <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
              Loading saved topologies from MongoDB...
            </div>
          )}

          {!loading && topologies.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              No saved topologies yet. Generate one from the topology builder to populate this library.
            </div>
          )}

          {topologies.map((item) => {
            const metrics = getTopologyMetrics(item.topology);
            const statusTone =
              item.securityScore >= 85
                ? "text-green-400 border-green-500/20 bg-green-500/10"
                : item.securityScore >= 65
                  ? "text-yellow-400 border-yellow-500/20 bg-yellow-500/10"
                  : "text-red-400 border-red-500/20 bg-red-500/10";

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 transition ${
                  selected?.id === item.id
                    ? "border-primary/40 bg-primary/10"
                    : "border-border/60 bg-muted/20"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-semibold">{item.name}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone}`}>
                        {item.securityStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.date}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {metrics.deviceCount} devices - {metrics.routers} routers - {metrics.switches} switches - {metrics.pcs} PCs
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setSelected(item)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/dashboard/create", { state: { topologyId: item.id } })}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" onClick={() => downloadFile(`${item.name}-router.txt`, item.routerConfig)}>
                      <Download className="mr-2 h-4 w-4" />
                      Router
                    </Button>
                    <Button variant="outline" onClick={() => downloadFile(`${item.name}-switches.txt`, item.switchConfig)}>
                      <Download className="mr-2 h-4 w-4" />
                      Switches
                    </Button>
                    <Button variant="outline" onClick={() => void handleDelete(item.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-6 space-y-5">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">Preview the structured topology and inspect its current security posture.</p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Security Score</p>
                <p className="mt-1 text-3xl font-bold">{selected.securityScore}</p>
              </div>
            </div>

            <TopologyVisualizer topology={selected.topology} />

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4 text-primary" />
                Security findings
              </div>
              <div className="mt-3 space-y-2">
                {selected.topology.security.issues.map((issue) => (
                  <div key={issue.id} className="rounded-xl border border-border/50 bg-background/40 px-3 py-3">
                    <p className="font-medium">{issue.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-primary/80">{issue.recommendation}</p>
                  </div>
                ))}
                {selected.topology.security.issues.length === 0 && (
                  <p className="text-sm text-muted-foreground">No major findings. The topology has a clean baseline posture.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[26rem] items-center justify-center text-sm text-muted-foreground">
            Select a topology to preview it here.
          </div>
        )}
      </div>
    </div>
  );
}
