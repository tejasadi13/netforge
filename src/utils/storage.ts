import { GeneratedTopology } from "@/types/network";
import { API_BASE_URL, parseApiResponse } from "@/lib/api";

export interface StoredTopology {
  id: string;
  name: string;
  date: string;
  ownerId?: string;
  ownerName?: string;
  topology: GeneratedTopology;
  routerConfig: string;
  switchConfig: string;
  securityScore: number;
  securityStatus: string;
}

const API_BASE = `${API_BASE_URL}/topologies`;

export async function getTopologies() {
  const response = await fetch(API_BASE);
  return parseApiResponse<StoredTopology[]>(response);
}

export async function getSavedTopologies() {
  return getTopologies();
}

export async function getTopologyById(id: string) {
  const response = await fetch(`${API_BASE}/${id}`);
  return parseApiResponse<StoredTopology>(response);
}

export async function saveTopology(topology: StoredTopology) {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(topology),
  });

  return parseApiResponse<StoredTopology>(response);
}

export async function deleteTopology(id: string) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  });

  return parseApiResponse<{ success: boolean }>(response);
}

export function getAverageSecurity(topologies: StoredTopology[]) {
  if (topologies.length === 0) return 0;

  const total = topologies.reduce((sum, item) => sum + item.securityScore, 0);
  return Math.round(total / topologies.length);
}

export function getDepartmentCount(topologies: StoredTopology[]) {
  const departments = new Set(topologies.map((item) => item.topology.input.department));
  return departments.size;
}

export interface DepartmentAnalytics {
  id: string;
  name: string;
  description: string;
  topologies: number;
  avgScore: number;
  deviceCount: number;
  routers: number;
  switches: number;
  pcs: number;
  lastUpdated: string;
}

export function getDepartmentAnalytics(topologies: StoredTopology[]) {
  const grouped = new Map<string, StoredTopology[]>();

  topologies.forEach((item) => {
    const departmentName = item.topology.input.department?.trim() || "Unassigned";
    const bucket = grouped.get(departmentName) ?? [];
    bucket.push(item);
    grouped.set(departmentName, bucket);
  });

  return Array.from(grouped.entries())
    .map(([name, items]) => {
      const deviceCount = items.reduce((sum, item) => sum + item.topology.nodes.length, 0);
      const routers = items.reduce((sum, item) => sum + item.topology.nodes.filter((node) => node.type === "router").length, 0);
      const switches = items.reduce((sum, item) => sum + item.topology.nodes.filter((node) => node.type === "switch").length, 0);
      const pcs = items.reduce((sum, item) => sum + item.topology.nodes.filter((node) => node.type === "pc").length, 0);
      const avgScore = Math.round(items.reduce((sum, item) => sum + item.securityScore, 0) / items.length);

      return {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        description: `${name} network fabric and security analytics`,
        topologies: items.length,
        avgScore,
        deviceCount,
        routers,
        switches,
        pcs,
        lastUpdated: items[0]?.date ?? "N/A",
      } satisfies DepartmentAnalytics;
    })
    .sort((a, b) => b.topologies - a.topologies || a.name.localeCompare(b.name));
}
