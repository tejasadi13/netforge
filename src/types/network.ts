export type DeviceType =
  | "internet"
  | "firewall"
  | "router"
  | "switch"
  | "pc";

export type NetworkLayer = "edge" | "core" | "distribution" | "access" | "endpoint";

export interface TopologyInput {
  routers: number;
  switches: number;
  pcs: number;
  vlans: number;
  name: string;
  department: string;
}

export interface VlanPlan {
  id: number;
  name: string;
  subnet: string;
  gateway: string;
  mask: string;
  devices: string[];
}

export interface NetworkNode {
  id: string;
  type: DeviceType;
  label: string;
  x: number;
  y: number;
  ip?: string;
  layer: NetworkLayer;
  vlanId?: number;
  subnet?: string;
  role?: string;
  zone?: "wan" | "transit" | "lan";
}

export interface NetworkLink {
  id: string;
  from: string;
  to: string;
  type: "uplink" | "trunk" | "access" | "edge";
  open?: boolean;
}

export interface ConfigurationBundle {
  router: string;
  switches: string;
  vlans: string;
  routing: string;
  combined: string;
}

export interface SecurityIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendation: string;
}

export interface SecurityAnalysisResult {
  score: number;
  status: "Secure" | "Needs Attention" | "At Risk";
  issues: SecurityIssue[];
  suggestions: string[];
}

export interface GeneratedTopology {
  id: string;
  name: string;
  createdAt: string;
  input: TopologyInput;
  nodes: NetworkNode[];
  links: NetworkLink[];
  vlanPlan: VlanPlan[];
  configs: ConfigurationBundle;
  security: SecurityAnalysisResult;
}
