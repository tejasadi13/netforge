import { useState } from "react";
import { motion } from "framer-motion";
import { Server, Play, Download, FileJson, FileText, CheckCircle, Clock, XCircle, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LogEntry {
  time: string;
  message: string;
  status: "success" | "pending" | "error";
}

export default function GNS3Integration() {
  const [serverUrl, setServerUrl] = useState("http://localhost:3080");
  const [deploying, setDeploying] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const simulateDeploy = async () => {
    setDeploying(true);
    setLogs([]);
    const steps: Omit<LogEntry, "time">[] = [
      { message: "Connecting to GNS3 server...", status: "pending" },
      { message: `Connected to ${serverUrl}`, status: "success" },
      { message: "Creating new project: NetForge_Topology", status: "pending" },
      { message: "Project created (ID: nf-2024-001)", status: "success" },
      { message: "Adding Router-1 (Cisco IOSv 15.9)", status: "success" },
      { message: "Adding Router-2 (Cisco IOSv 15.9)", status: "success" },
      { message: "Adding Switch-1 (IOSvL2 15.2)", status: "success" },
      { message: "Creating link: R1 Gi0/0 ↔ SW1 Gi0/1", status: "success" },
      { message: "Creating link: R2 Gi0/0 ↔ SW1 Gi0/2", status: "success" },
      { message: "Pushing startup configuration to Router-1...", status: "success" },
      { message: "Pushing startup configuration to Router-2...", status: "success" },
      { message: "Starting all nodes...", status: "pending" },
      { message: "Deployment complete! Open GNS3 to view.", status: "success" },
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
      setLogs(prev => [...prev, { ...step, time: new Date().toLocaleTimeString() }]);
    }
    setDeploying(false);
  };

  const statusIcon = (s: LogEntry["status"]) => {
    if (s === "success") return <CheckCircle className="h-3.5 w-3.5 status-green shrink-0" />;
    if (s === "pending") return <Clock className="h-3.5 w-3.5 status-yellow shrink-0" />;
    return <XCircle className="h-3.5 w-3.5 status-red shrink-0" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Server className="h-6 w-6 text-primary" /> GNS3 Integration
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Deploy topologies to GNS3 network simulator</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection & Actions */}
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Server Connection</h2>
            <div className="space-y-2">
              <Label className="text-xs">GNS3 Server URL</Label>
              <Input value={serverUrl} onChange={e => setServerUrl(e.target.value)} className="bg-muted/50 border-border font-mono text-sm" />
            </div>
            <Button onClick={simulateDeploy} disabled={deploying} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
              <Play className="mr-2 h-4 w-4" /> {deploying ? "Deploying..." : "Deploy to GNS3"}
            </Button>
          </div>

          <div className="glass-card p-6 space-y-3">
            <h2 className="font-semibold text-foreground">Export Options</h2>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start"><FileJson className="mr-2 h-4 w-4 text-primary" /> Export .gns3 Project JSON</Button>
              <Button variant="outline" className="w-full justify-start"><FileText className="mr-2 h-4 w-4 text-primary" /> Export Configuration Files (.txt)</Button>
              <Button variant="outline" className="w-full justify-start"><Download className="mr-2 h-4 w-4 text-primary" /> Download Complete Project Folder</Button>
            </div>
          </div>

          <div className="glass-card p-6 space-y-3">
            <h2 className="font-semibold text-foreground">Quick Start Guide</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Open GNS3 on your local machine</li>
              <li>Ensure GNS3 server is running on port 3080</li>
              <li>Click "Deploy to GNS3" above</li>
              <li>Open the created project in GNS3</li>
              <li>Start all nodes and begin simulation</li>
            </ol>
          </div>
        </div>

        {/* Deployment Logs */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" /> Deployment Logs
          </h2>
          <div className="bg-muted/30 rounded-lg border border-border/30 p-4 h-[500px] overflow-y-auto font-mono text-sm space-y-1.5">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Click Deploy to start...</p>
            ) : (
              logs.map((log, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2">
                  {statusIcon(log.status)}
                  <span className="text-muted-foreground text-xs">[{log.time}]</span>
                  <span className="text-foreground text-xs">{log.message}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
