import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Cpu, Download, Network, Save, Shield, Sparkles, Zap } from "lucide-react";

import AssistantChatbox from "@/components/AssistantChatbox";
import TopologyVisualizer from "@/components/TopologyVisualizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { generateTopology, getTopologyMetrics } from "@/lib/network-intelligence";
import { TopologyInput } from "@/types/network";
import { useAuth } from "@/contexts/AuthContext";
import { getTopologyById, saveTopology } from "@/utils/storage";

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
}

const initialInput: TopologyInput = {
  name: "Campus Secure Fabric",
  department: "IT",
  routers: 2,
  switches: 4,
  pcs: 16,
  vlans: 4,
};

export default function CreateTopology() {
  const { user } = useAuth();
  const location = useLocation();
  const editTopologyId = (location.state as { topologyId?: string } | null)?.topologyId;

  const [input, setInput] = useState<TopologyInput>(initialInput);
  const [topology, setTopology] = useState(() => generateTopology(initialInput));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editTopologyId) return;

    let mounted = true;

    const loadTopology = async () => {
      try {
        const saved = await getTopologyById(editTopologyId);
        if (!mounted) return;

        setInput(saved.topology.input);
        setTopology(saved.topology);
      } catch (error) {
        console.error("Failed to load topology for editing", error);
      }
    };

    void loadTopology();

    return () => {
      mounted = false;
    };
  }, [editTopologyId]);

  const metrics = useMemo(() => getTopologyMetrics(topology), [topology]);

  const handleGenerate = () => {
    setTopology(generateTopology(input, editTopologyId ?? topology.id));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveTopology({
        id: topology.id,
        name: topology.name,
        date: topology.createdAt,
        ownerId: user?.id,
        ownerName: user?.name,
        topology,
        routerConfig: topology.configs.router,
        switchConfig: topology.configs.switches,
        securityScore: topology.security.score,
        securityStatus: topology.security.status,
      });
      toast.success("Topology saved to MongoDB");
    } catch (error) {
      console.error("Failed to save topology", error);
      const message = error instanceof Error ? error.message : "Unable to save topology";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary/70">Auto Topology Generator</p>
          <h1 className="mt-2 text-3xl font-bold flex items-center gap-3">
            <Network className="h-7 w-7 text-primary" />
            Intelligent Topology Builder
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Build core, distribution, and access layers automatically, then export an opinionated VLAN, subnet, and routing baseline.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleGenerate}>
            <Zap className="mr-2 h-4 w-4" />
            Generate
          </Button>
          <Button variant="secondary" onClick={() => void handleSave()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Topology"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Generation Inputs</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Topology Name</Label>
              <Input id="name" value={input.name} onChange={(event) => setInput({ ...input, name: event.target.value })} />
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={input.department} onChange={(event) => setInput({ ...input, department: event.target.value })} />
            </div>

            <div>
              <Label htmlFor="routers">Routers</Label>
              <Input id="routers" type="number" min={1} value={input.routers} onChange={(event) => setInput({ ...input, routers: Number(event.target.value) })} />
            </div>

            <div>
              <Label htmlFor="switches">Switches</Label>
              <Input id="switches" type="number" min={1} value={input.switches} onChange={(event) => setInput({ ...input, switches: Number(event.target.value) })} />
            </div>

            <div>
              <Label htmlFor="pcs">End Devices (PCs)</Label>
              <Input id="pcs" type="number" min={1} value={input.pcs} onChange={(event) => setInput({ ...input, pcs: Number(event.target.value) })} />
            </div>

            <div>
              <Label htmlFor="vlans">VLANs</Label>
              <Input id="vlans" type="number" min={1} value={input.vlans} onChange={(event) => setInput({ ...input, vlans: Number(event.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Devices</p>
              <p className="mt-2 text-2xl font-bold">{metrics.deviceCount}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Links</p>
              <p className="mt-2 text-2xl font-bold">{metrics.linkCount}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">VLANs</p>
              <p className="mt-2 text-2xl font-bold">{topology.vlanPlan.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Security</p>
              <p className="mt-2 text-2xl font-bold text-primary">{topology.security.score}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-primary" />
              Security posture
            </div>
            <p className="mt-2 text-3xl font-bold">{topology.security.score}/100</p>
            <p className="mt-1 text-sm text-muted-foreground">{topology.security.status}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {topology.security.suggestions.map((suggestion) => (
                <li key={suggestion} className="rounded-xl border border-border/50 bg-background/40 px-3 py-2">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Structured Topology View</h2>
          </div>
          <TopologyVisualizer topology={topology} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Configuration Generator</h2>
              <p className="text-sm text-muted-foreground mt-1">Auto-assigned IPs, subnets, VLAN IDs, and baseline routing.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => downloadFile(`${topology.name}-router.txt`, topology.configs.router)}>
                <Download className="mr-2 h-4 w-4" />
                Router
              </Button>
              <Button variant="outline" onClick={() => downloadFile(`${topology.name}-switches.txt`, topology.configs.switches)}>
                <Download className="mr-2 h-4 w-4" />
                Switches
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <h3 className="font-semibold">VLAN Plan</h3>
              <div className="mt-3 space-y-2">
                {topology.vlanPlan.map((vlan) => (
                  <div key={vlan.id} className="rounded-xl border border-border/50 bg-background/40 p-3 text-sm">
                    <p className="font-mono text-primary">VLAN {vlan.id} - {vlan.name}</p>
                    <p className="mt-1 text-muted-foreground">Subnet {vlan.subnet} - Gateway {vlan.gateway}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Assigned: {vlan.devices.join(", ")}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <h3 className="font-semibold">Generated Config Panel</h3>
              <Textarea value={topology.configs.combined} readOnly className="mt-3 min-h-[24rem] bg-slate-950/70 font-mono text-xs" />
            </div>
          </div>
        </div>

        <AssistantChatbox topology={topology} />
      </div>
    </div>
  );
}
