import { useEffect, useRef } from "react";

import { GeneratedTopology, NetworkLayer } from "@/types/network";

interface Props {
  topology?: GeneratedTopology | null;
}

const colors = {
  internet: { fill: "#f97316", stroke: "#fb923c", text: "#fff" },
  firewall: { fill: "#ef4444", stroke: "#f87171", text: "#fff" },
  router: { fill: "#0ea5e9", stroke: "#38bdf8", text: "#fff" },
  switch: { fill: "#8b5cf6", stroke: "#a78bfa", text: "#fff" },
  pc: { fill: "#10b981", stroke: "#34d399", text: "#fff" },
} as const;

const layerBands: Record<NetworkLayer, { label: string; y: number }> = {
  edge: { label: "Edge", y: 110 },
  core: { label: "Core", y: 260 },
  distribution: { label: "Distribution", y: 440 },
  access: { label: "Access", y: 520 },
  endpoint: { label: "Endpoint", y: 660 },
};

export default function TopologyVisualizer({ topology }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!topology?.nodes?.length || !topology?.links?.length) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const xs = topology.nodes.map((node) => node.x);
    const ys = topology.nodes.map((node) => node.y);

    const minX = Math.min(...xs) - 110;
    const maxX = Math.max(...xs) + 110;
    const minY = Math.min(...ys) - 100;
    const maxY = Math.max(...ys) + 90;

    const sx = width / (maxX - minX);
    const sy = height / (maxY - minY);
    const scale = Math.min(sx, sy, 1);

    const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale;
    const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale;

    const tx = (x: number) => x * scale + offsetX;
    const ty = (y: number) => y * scale + offsetY;

    Object.values(layerBands).forEach((band) => {
      const y = ty(band.y);
      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      ctx.fillRect(18, y - 34, width - 36, 54);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.16)";
      ctx.strokeRect(18, y - 34, width - 36, 54);
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.font = "600 11px Inter";
      ctx.fillText(band.label.toUpperCase(), 30, y - 12);
    });

    topology.links.forEach((link) => {
      const from = topology.nodes.find((node) => node.id === link.from);
      const to = topology.nodes.find((node) => node.id === link.to);
      if (!from || !to) return;

      ctx.beginPath();
      ctx.strokeStyle = link.open ? "rgba(248, 113, 113, 0.7)" : "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = link.type === "trunk" ? 2.4 : 1.6;
      ctx.setLineDash(link.open ? [6, 4] : []);
      ctx.moveTo(tx(from.x), ty(from.y));
      ctx.lineTo(tx(to.x), ty(to.y));
      ctx.stroke();
      ctx.setLineDash([]);
    });

    topology.nodes.forEach((node) => {
      const theme = colors[node.type];
      const x = tx(node.x);
      const y = ty(node.y);
      const radius =
        node.type === "firewall"
          ? 20
          : node.type === "router"
            ? 18
            : node.type === "switch"
              ? 16
              : node.type === "internet"
                ? 15
                : 13;

      ctx.beginPath();
      ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
      ctx.fillStyle = `${theme.fill}33`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = theme.fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.stroke;
      ctx.stroke();

      ctx.fillStyle = theme.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 10px Inter";
      ctx.fillText(node.id, x, y);

      ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
      ctx.font = "500 9px Inter";
      ctx.fillText(node.label, x, y + radius + 12);

      if (node.ip) {
        ctx.fillStyle = "rgba(125, 211, 252, 0.8)";
        ctx.font = "8px JetBrains Mono";
        ctx.fillText(node.ip, x, y + radius + 24);
      }

      if (node.vlanId) {
        ctx.fillStyle = "rgba(253, 224, 71, 0.82)";
        ctx.font = "8px JetBrains Mono";
        ctx.fillText(`VLAN ${node.vlanId}`, x, y + radius + 35);
      }
    });
  }, [topology]);

  if (!topology?.nodes?.length) {
    return (
      <div className="h-[28rem] flex items-center justify-center text-muted-foreground text-sm border border-border/30 rounded-2xl bg-muted/10">
        No topology to display
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[28rem] rounded-2xl bg-slate-950/60 border border-border/30"
    />
  );
}
