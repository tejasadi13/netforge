import { describe, expect, it } from "vitest";

import { answerTopologyQuestion, generateTopology } from "@/lib/network-intelligence";

describe("network intelligence", () => {
  it("generates a layered topology with configuration and security output", () => {
    const topology = generateTopology({
      name: "QA Fabric",
      department: "QA",
      routers: 2,
      switches: 4,
      pcs: 12,
      vlans: 3,
    });

    expect(topology.nodes.some((node) => node.type === "firewall")).toBe(true);
    expect(topology.vlanPlan).toHaveLength(3);
    expect(topology.configs.combined).toContain("### VLAN CONFIGURATION ###");
    expect(topology.security.score).toBeGreaterThan(0);
  });

  it("answers assistant questions from the current topology", () => {
    const topology = generateTopology({
      name: "Support Fabric",
      department: "Support",
      routers: 1,
      switches: 2,
      pcs: 8,
      vlans: 2,
    });

    expect(answerTopologyQuestion("Is my network secure?", topology)).toContain("Current security score");
    expect(answerTopologyQuestion("Where to add firewall?", topology)).toContain("firewall");
  });
});
