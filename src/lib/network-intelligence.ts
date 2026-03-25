import {
  ConfigurationBundle,
  GeneratedTopology,
  NetworkLink,
  NetworkNode,
  SecurityAnalysisResult,
  TopologyInput,
  VlanPlan,
} from "@/types/network";

const DEFAULT_MASK = "255.255.255.0";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createId(prefix: string, index: number) {
  return `${prefix}${index + 1}`;
}

function makeVlanId(index: number) {
  return (index + 1) * 10;
}

function makeSubnet(index: number) {
  return `10.${index + 10}.0.0/24`;
}

function makeGateway(index: number) {
  return `10.${index + 10}.0.1`;
}

function makeHostIp(index: number, host: number) {
  return `10.${index + 10}.0.${host}`;
}

function splitAcrossBuckets(total: number, bucketCount: number) {
  const safeBuckets = Math.max(bucketCount, 1);
  return Array.from({ length: safeBuckets }, (_, index) =>
    Math.floor(total / safeBuckets) + (index < total % safeBuckets ? 1 : 0),
  );
}

function buildVlanPlan(vlans: number) {
  return Array.from({ length: Math.max(vlans, 1) }, (_, index) => ({
    id: makeVlanId(index),
    name: `VLAN_${makeVlanId(index)}`,
    subnet: makeSubnet(index),
    gateway: makeGateway(index),
    mask: DEFAULT_MASK,
    devices: [],
  })) satisfies VlanPlan[];
}

function buildConfigs(
  topologyName: string,
  routers: NetworkNode[],
  switches: NetworkNode[],
  vlanPlan: VlanPlan[],
) {
  const routerConfig = routers
    .map((router, index) => {
      const transitOctet = 200 + index;
      const subinterfaces = vlanPlan
        .map(
          (vlan) => `interface g0/0.${vlan.id}
 encapsulation dot1Q ${vlan.id}
 ip address ${vlan.gateway} ${vlan.mask}
 no shutdown`,
        )
        .join("\n!\n");

      return `hostname ${router.label}
interface g0/0
 description Uplink-to-Firewall
 ip address 172.16.${transitOctet}.2 255.255.255.252
 no shutdown
!
${subinterfaces}
!
ip route 0.0.0.0 0.0.0.0 172.16.${transitOctet}.1`;
    })
    .join("\n\n");

  const switchConfig = switches
    .map((switchNode, index) => {
      const uplinkVlan = vlanPlan[index % vlanPlan.length];
      const vlanBlocks = vlanPlan
        .map(
          (vlan) => `vlan ${vlan.id}
 name ${vlan.name}`,
        )
        .join("\n!\n");

      return `hostname ${switchNode.label}
${vlanBlocks}
!
interface g0/1
 description Uplink trunk
 switchport trunk encapsulation dot1q
 switchport mode trunk
!
interface g0/2
 description Native access for ${uplinkVlan.name}
 switchport mode access
 switchport access vlan ${uplinkVlan.id}
 spanning-tree portfast`;
    })
    .join("\n\n");

  const vlanConfig = vlanPlan
    .map(
      (vlan) => `VLAN ${vlan.id} (${vlan.name})
Subnet: ${vlan.subnet}
Gateway: ${vlan.gateway}
Mask: ${vlan.mask}
Assigned Devices: ${vlan.devices.join(", ") || "None"}`,
    )
    .join("\n\n");

  const routingConfig = `Routing Plan for ${topologyName}
Mode: Basic inter-VLAN routing
Default route: Firewall upstream
Internal routes: ${vlanPlan.map((vlan) => vlan.subnet).join(", ")}`;

  const combined = [
    "### VLAN CONFIGURATION ###",
    vlanConfig,
    "",
    "### ROUTER CONFIGURATION ###",
    routerConfig,
    "",
    "### SWITCH CONFIGURATION ###",
    switchConfig,
    "",
    "### ROUTING SUMMARY ###",
    routingConfig,
  ].join("\n");

  return {
    router: routerConfig,
    switches: switchConfig,
    vlans: vlanConfig,
    routing: routingConfig,
    combined,
  } satisfies ConfigurationBundle;
}

export function analyzeTopologySecurity(topology: Pick<GeneratedTopology, "nodes" | "links" | "vlanPlan">) {
  const issues = [];
  let score = 100;

  const hasFirewall = topology.nodes.some((node) => node.type === "firewall");
  const vlanCount = topology.vlanPlan.length;
  const openLinks = topology.links.filter((link) => link.open);
  const accessSwitches = topology.nodes.filter((node) => node.layer === "access");
  const routers = topology.nodes.filter((node) => node.type === "router");

  if (!hasFirewall) {
    score -= 25;
    issues.push({
      id: "missing-firewall",
      severity: "critical" as const,
      title: "Edge firewall missing",
      description: "Traffic reaches internal routing without a dedicated inspection point.",
      recommendation: "Place a firewall between the internet edge and the core router pair.",
    });
  }

  if (vlanCount < 2 && accessSwitches.length > 1) {
    score -= 20;
    issues.push({
      id: "segmentation",
      severity: "critical" as const,
      title: "Poor segmentation",
      description: "Multiple access segments share the same broadcast domain.",
      recommendation: "Create at least 2 to 3 VLANs and map endpoints by function or department.",
    });
  }

  if (openLinks.length > 2) {
    score -= 15;
    issues.push({
      id: "open-links",
      severity: "warning" as const,
      title: "Too many open links",
      description: "Several access links are marked as unrestricted, increasing lateral movement risk.",
      recommendation: "Restrict unused ports, add ACLs, and limit trunking to uplinks only.",
    });
  }

  if (routers.length < 2) {
    score -= 8;
    issues.push({
      id: "single-router",
      severity: "info" as const,
      title: "Single-router edge",
      description: "The topology relies on one router for core traffic forwarding.",
      recommendation: "Add a second router or a standby path if uptime matters.",
    });
  }

  const status =
    score >= 85 ? "Secure" : score >= 65 ? "Needs Attention" : "At Risk";

  return {
    score: clamp(score, 0, 100),
    status,
    issues,
    suggestions: [
      hasFirewall
        ? "Keep the firewall between WAN and core routing, and harden inbound policy."
        : "Add a dedicated firewall at the north-south edge before traffic reaches routers.",
      vlanCount >= 3
        ? "Your segmentation baseline is solid; consider ACLs between sensitive VLANs."
        : "Increase VLAN count to isolate users, servers, and management traffic.",
      "Audit trunk ports and disable unused switch interfaces to reduce exposure.",
    ],
  } satisfies SecurityAnalysisResult;
}

export function generateTopology(input: TopologyInput, existingId?: string) {
  const normalizedInput = {
    ...input,
    routers: clamp(input.routers, 1, 8),
    switches: clamp(input.switches, 1, 12),
    pcs: clamp(input.pcs, 1, 96),
    vlans: clamp(input.vlans, 1, 12),
  };

  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  const vlanPlan = buildVlanPlan(normalizedInput.vlans);

  const internetNode: NetworkNode = {
    id: "WAN",
    label: "Internet",
    type: "internet",
    x: 540,
    y: 60,
    layer: "edge",
    zone: "wan",
  };
  const firewallNode: NetworkNode = {
    id: "FW1",
    label: "Firewall",
    type: "firewall",
    x: 540,
    y: 150,
    ip: "172.16.255.1",
    layer: "edge",
    role: "Perimeter security",
    zone: "transit",
  };

  nodes.push(internetNode, firewallNode);
  links.push({ id: "WAN-FW1", from: "WAN", to: "FW1", type: "edge", open: false });

  const routerSpread = splitAcrossBuckets(normalizedInput.routers, normalizedInput.routers);
  const routerStartX = 540 - ((normalizedInput.routers - 1) * 220) / 2;
  const routers = routerSpread.map((_, index) => {
    const router: NetworkNode = {
      id: createId("R", index),
      label: `Router-${index + 1}`,
      type: "router",
      x: routerStartX + index * 220,
      y: 280,
      ip: `172.16.${200 + index}.2`,
      layer: "core",
      role: index === 0 ? "Primary core router" : "Secondary core router",
      zone: "transit",
    };
    nodes.push(router);
    links.push({
      id: `FW1-${router.id}`,
      from: "FW1",
      to: router.id,
      type: "uplink",
      open: false,
    });
    return router;
  });

  const switchBuckets = splitAcrossBuckets(normalizedInput.switches, normalizedInput.routers);
  const pcsPerSwitch = splitAcrossBuckets(normalizedInput.pcs, normalizedInput.switches);

  let switchIndex = 0;
  let pcSequence = 0;

  routers.forEach((router, routerIndex) => {
    const distributionCount = switchBuckets[routerIndex] ?? 0;
    const distributionStartX = router.x - ((distributionCount - 1) * 190) / 2;

    for (let i = 0; i < distributionCount; i++) {
      const currentSwitchIndex = switchIndex++;
      const switchId = createId("SW", currentSwitchIndex);
      const vlan = vlanPlan[currentSwitchIndex % vlanPlan.length];
      const switchNode: NetworkNode = {
        id: switchId,
        label: `Switch-${currentSwitchIndex + 1}`,
        type: "switch",
        x: distributionStartX + i * 190,
        y: 450,
        ip: makeHostIp(currentSwitchIndex % vlanPlan.length, 2 + currentSwitchIndex),
        layer: distributionCount > 1 ? "distribution" : "access",
        vlanId: vlan.id,
        subnet: vlan.subnet,
        role: "Access aggregation",
        zone: "lan",
      };

      nodes.push(switchNode);
      links.push({
        id: `${router.id}-${switchId}`,
        from: router.id,
        to: switchId,
        type: "trunk",
        open: false,
      });

      const currentPcCount = pcsPerSwitch[currentSwitchIndex] ?? 0;
      const accessStartX = switchNode.x - ((currentPcCount - 1) * 100) / 2;

      for (let pcIndex = 0; pcIndex < currentPcCount; pcIndex++) {
        const endpointId = createId("PC", pcSequence);
        const endpoint: NetworkNode = {
          id: endpointId,
          label: `Workstation-${pcSequence + 1}`,
          type: "pc",
          x: accessStartX + pcIndex * 100,
          y: 650,
          ip: makeHostIp(currentSwitchIndex % vlanPlan.length, 20 + pcSequence),
          layer: "endpoint",
          vlanId: vlan.id,
          subnet: vlan.subnet,
          role: "End user",
          zone: "lan",
        };
        pcSequence += 1;
        vlan.devices.push(endpoint.id);
        nodes.push(endpoint);
        links.push({
          id: `${switchId}-${endpointId}`,
          from: switchId,
          to: endpointId,
          type: "access",
          open: currentPcCount > 5 && pcIndex >= 4,
        });
      }
    }
  });

  const topologyId = existingId ?? Date.now().toString();
  const topologyBase = {
    id: topologyId,
    name: normalizedInput.name || `${normalizedInput.department} Intelligent Fabric`,
    createdAt: new Date().toLocaleString(),
    input: normalizedInput,
    nodes,
    links,
    vlanPlan,
  };

  const security = analyzeTopologySecurity(topologyBase);
  const configs = buildConfigs(topologyBase.name, routers, nodes.filter((node) => node.type === "switch"), vlanPlan);

  return {
    ...topologyBase,
    configs,
    security,
  } satisfies GeneratedTopology;
}

export function getTopologyMetrics(topology: GeneratedTopology) {
  return {
    deviceCount: topology.nodes.length,
    linkCount: topology.links.length,
    routers: topology.nodes.filter((node) => node.type === "router").length,
    switches: topology.nodes.filter((node) => node.type === "switch").length,
    pcs: topology.nodes.filter((node) => node.type === "pc").length,
    firewalls: topology.nodes.filter((node) => node.type === "firewall").length,
  };
}

export function answerTopologyQuestion(question: string, topology?: GeneratedTopology | null) {
  const safeQuestion = question.trim().toLowerCase();
  if (!topology) {
    return "Generate or open a topology first, and I’ll analyze where to segment traffic, place controls, and tighten the design.";
  }

  if (safeQuestion.includes("secure")) {
    return `Current security score is ${topology.security.score}/100 (${topology.security.status}). ${topology.security.suggestions[0]}`;
  }

  if (safeQuestion.includes("firewall")) {
    const firstRouter = topology.nodes.find((node) => node.type === "router");
    return firstRouter
      ? `Place the firewall between the WAN edge and ${firstRouter.label}. That gives you one inspection choke point before internal routing.`
      : "Place the firewall at the north-south edge before traffic reaches your first internal router or switch.";
  }

  if (safeQuestion.includes("improve") || safeQuestion.includes("topology")) {
    return [
      `Increase segmentation across ${topology.vlanPlan.length} VLANs with ACLs between user and management zones.`,
      "Keep routers in the core, switches in distribution/access, and avoid direct PC-to-router links.",
      topology.security.suggestions[2],
    ].join(" ");
  }

  return `I reviewed ${topology.name}. Focus next on ${topology.security.issues[0]?.recommendation ?? "hardening switch ports and validating routing boundaries"}.`;
}
