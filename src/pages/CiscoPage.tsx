import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, ClipboardList, Download, Router, Shield, TerminalSquare, Waypoints } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getTopologies } from "@/utils/storage";

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
}

function buildCiscoVerification(topology: Awaited<ReturnType<typeof getTopologies>>[number]["topology"]) {
  const vlanChecks = topology.vlanPlan
    .map((vlan) => `show vlan id ${vlan.id}`)
    .join("\n");

  return [
    "show ip interface brief",
    "show running-config",
    "show ip route",
    "show cdp neighbors detail",
    "show interfaces trunk",
    vlanChecks,
    "show spanning-tree summary",
    "show access-lists",
  ].join("\n");
}

function buildCiscoHardening(topology: Awaited<ReturnType<typeof getTopologies>>[number]["topology"]) {
  return [
    "service password-encryption",
    "no ip http server",
    "no ip http secure-server",
    "banner motd ^CUnauthorized access prohibited^C",
    "line console 0",
    " logging synchronous",
    " exec-timeout 10 0",
    "line vty 0 4",
    " transport input ssh",
    " login local",
    topology.security.score < 80
      ? "ip access-list extended CAMPUS_EDGE_FILTER\n deny ip any 10.0.0.0 0.255.255.255\n permit ip any any"
      : "! Existing segmentation is strong; keep ACLs between user and management VLANs",
  ].join("\n");
}

export default function CiscoPage() {
  const [topologies, setTopologies] = useState<Awaited<ReturnType<typeof getTopologies>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const saved = await getTopologies();
        if (mounted) {
          setTopologies(saved);
        }
      } catch (error) {
        console.error("Failed to load Cisco workspace data", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const latest = topologies[0]?.topology ?? null;

  const ciscoBundle = useMemo(() => {
    if (!latest) return null;

    const deviceSummary = latest.nodes
      .filter((node) => node.type === "router" || node.type === "switch")
      .map((node) => `${node.label} (${node.type}) - ${node.ip ?? "no mgmt ip"}`)
      .join("\n");

    return {
      summary: deviceSummary,
      router: latest.configs.router,
      switching: latest.configs.switches,
      vlan: latest.configs.vlans,
      routing: latest.configs.routing,
      verify: buildCiscoVerification(latest),
      hardening: buildCiscoHardening(latest),
    };
  }, [latest]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-primary/70">Cisco Workspace</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold">
          <Router className="h-7 w-7 text-primary" />
          Cisco IOS Config Center
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Convert the latest NETFORGE topology into Cisco-friendly router, switch, VLAN, routing, and verification command sets.
        </p>
      </div>

      {loading && (
        <div className="glass-card p-5 text-sm text-muted-foreground">
          Loading Cisco configuration workspace...
        </div>
      )}

      {!loading && !latest && (
        <div className="glass-card p-8 text-sm text-muted-foreground">
          No saved topology found. Generate and save a topology first to populate Cisco configuration output.
        </div>
      )}

      {latest && ciscoBundle && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Topology</p>
              <p className="mt-2 text-xl font-semibold">{latest.name}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cisco Nodes</p>
              <p className="mt-2 text-xl font-semibold">
                {latest.nodes.filter((node) => node.type === "router" || node.type === "switch").length}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">VLANs</p>
              <p className="mt-2 text-xl font-semibold">{latest.vlanPlan.length}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Security Score</p>
              <p className="mt-2 text-xl font-semibold text-primary">{latest.security.score}/100</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Device Summary
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Router and switch inventory prepared for Cisco deployment.</p>
                </div>
                <Button variant="outline" onClick={() => downloadFile(`${latest.name}-cisco-summary.txt`, ciscoBundle.summary)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
              <Textarea value={ciscoBundle.summary} readOnly className="min-h-[12rem] bg-slate-950/70 font-mono text-xs" />
            </div>

            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-primary" />
                    Cisco Security Hardening
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Baseline IOS hardening lines aligned with the current topology posture.</p>
                </div>
                <Button variant="outline" onClick={() => downloadFile(`${latest.name}-cisco-hardening.txt`, ciscoBundle.hardening)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
              <Textarea value={ciscoBundle.hardening} readOnly className="min-h-[12rem] bg-slate-950/70 font-mono text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Router className="h-5 w-5 text-primary" />
                  Cisco Router Config
                </h2>
                <Button variant="outline" onClick={() => downloadFile(`${latest.name}-cisco-router.txt`, ciscoBundle.router)}>
                  <Download className="mr-2 h-4 w-4" />
                  Router
                </Button>
              </div>
              <Textarea value={ciscoBundle.router} readOnly className="min-h-[20rem] bg-slate-950/70 font-mono text-xs" />
            </div>

            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Waypoints className="h-5 w-5 text-primary" />
                  Cisco Switch and VLAN Config
                </h2>
                <Button variant="outline" onClick={() => downloadFile(`${latest.name}-cisco-switching.txt`, `${ciscoBundle.switching}\n\n${ciscoBundle.vlan}`)}>
                  <Download className="mr-2 h-4 w-4" />
                  Switching
                </Button>
              </div>
              <Textarea value={`${ciscoBundle.switching}\n\n${ciscoBundle.vlan}`} readOnly className="min-h-[20rem] bg-slate-950/70 font-mono text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TerminalSquare className="h-5 w-5 text-primary" />
                  Routing and Verification
                </h2>
                <Button variant="outline" onClick={() => downloadFile(`${latest.name}-cisco-verify.txt`, `${ciscoBundle.routing}\n\n${ciscoBundle.verify}`)}>
                  <Download className="mr-2 h-4 w-4" />
                  Verify
                </Button>
              </div>
              <Textarea value={`${ciscoBundle.routing}\n\n${ciscoBundle.verify}`} readOnly className="min-h-[18rem] bg-slate-950/70 font-mono text-xs" />
            </div>

            <div className="glass-card p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Cisco Deployment Notes
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  Use `copy tftp: running-config` or paste the generated sections directly into Packet Tracer, GNS3, or real IOS lab devices.
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  Map the generated VLAN gateways to router subinterfaces, then confirm trunks with `show interfaces trunk`.
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  Current security posture is <span className="font-semibold text-foreground">{latest.security.status}</span>. Review hardening commands before production deployment.
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  Latest owner: <span className="font-semibold text-foreground">{topologies[0]?.ownerName || "Unknown"}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
