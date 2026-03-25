function fallbackAnswer(question, topology, history = []) {
  const safeQuestion = String(question || "").trim().toLowerCase();
  const previousUserQuestion = [...history]
    .reverse()
    .find((item) => item.role === "user" && item.text?.trim());
  const previousTopic = previousUserQuestion?.text?.toLowerCase() ?? "";

  if (!topology) {
    return "Generate or open a topology first, and I can help with segmentation, firewall placement, VLAN planning, and security posture.";
  }

  if (safeQuestion.includes("secure") || previousTopic.includes("secure")) {
    return [
      `The current topology scores ${topology.security?.score ?? 0}/100 and is marked ${topology.security?.status ?? "Unknown"}.`,
      topology.security?.issues?.[0]?.description ?? "I do not see a critical issue dominating the design right now.",
      topology.security?.suggestions?.[0] ?? "Review segmentation and edge policy to improve the posture further.",
    ].join(" ");
  }

  if (safeQuestion.includes("firewall")) {
    const firstRouter = topology.nodes?.find((node) => node.type === "router");
    return firstRouter
      ? `I would place the firewall between the WAN edge and ${firstRouter.label}. That creates a single inspection point before internal routing and keeps north-south traffic controlled.`
      : "Place the firewall at the network edge before internal routing begins, so external traffic is filtered before it reaches user VLANs.";
  }

  if (safeQuestion.includes("vlan") || previousTopic.includes("vlan")) {
    const vlanCount = topology.vlanPlan?.length ?? 0;
    const vlanDetails = (topology.vlanPlan ?? [])
      .slice(0, 3)
      .map((vlan) => `${vlan.name} on ${vlan.subnet}`)
      .join(", ");

    return [
      `This design currently uses ${vlanCount} VLAN${vlanCount === 1 ? "" : "s"}.`,
      vlanDetails ? `Right now the main segments are ${vlanDetails}.` : "",
      vlanCount < 3
        ? "If you want stronger isolation, separate users, management, and sensitive services into distinct VLANs."
        : "The segmentation baseline is decent; the next step is tightening ACLs between sensitive VLANs.",
    ].filter(Boolean).join(" ");
  }

  if (safeQuestion.includes("improve") || safeQuestion.includes("topology")) {
    return [
      `To improve ${topology.name}, I would start by strengthening segmentation across the ${topology.vlanPlan?.length ?? 0} configured VLANs.`,
      "Keep routers at the core, switches at distribution and access, and avoid any unnecessary flat connectivity.",
      topology.security?.issues?.[0]?.recommendation ?? "Also review open links, ACL coverage, and edge protection.",
    ].join(" ");
  }

  return [
    `Based on ${topology.name}, the strongest next step is`,
    topology.security?.issues?.[0]?.recommendation ?? "hardening switch ports and validating policy between VLANs",
    "If you want, ask me specifically about VLANs, firewall placement, routing, or Cisco configuration.",
  ].join(" ");
}

function summarizeTopology(topology) {
  if (!topology) {
    return "No topology is currently loaded.";
  }

  const nodes = topology.nodes ?? [];
  const links = topology.links ?? [];
  const routers = nodes.filter((node) => node.type === "router").length;
  const switches = nodes.filter((node) => node.type === "switch").length;
  const pcs = nodes.filter((node) => node.type === "pc").length;
  const firewalls = nodes.filter((node) => node.type === "firewall").length;
  const openLinks = links.filter((link) => link.open).length;
  const vlanSummary = (topology.vlanPlan ?? [])
    .map((vlan) => `${vlan.name}(${vlan.id}) subnet ${vlan.subnet} gateway ${vlan.gateway}`)
    .join("; ");
  const issues = (topology.security?.issues ?? [])
    .map((issue) => `${issue.severity}: ${issue.title} - ${issue.recommendation}`)
    .join(" | ");

  return [
    `Topology name: ${topology.name}`,
    `Department: ${topology.input?.department ?? "Unknown"}`,
    `Routers: ${routers}, Switches: ${switches}, PCs: ${pcs}, Firewalls: ${firewalls}`,
    `VLAN count: ${topology.vlanPlan?.length ?? 0}`,
    `Open links: ${openLinks}`,
    `Security score: ${topology.security?.score ?? 0}/100`,
    `Security status: ${topology.security?.status ?? "Unknown"}`,
    `VLAN summary: ${vlanSummary || "No VLANs available"}`,
    `Known findings: ${issues || "No findings"}`,
    `Router config summary: ${String(topology.configs?.router ?? "").slice(0, 1200)}`,
    `Switch config summary: ${String(topology.configs?.switches ?? "").slice(0, 1200)}`,
  ].join("\n");
}

function extractResponseText(payload) {
  if (payload.output_text) {
    return payload.output_text.trim();
  }

  const outputs = payload.output ?? [];
  const text = outputs
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("\n")
    .trim();

  return text;
}

export async function generateAiAssistantReply({ question, topology, history = [] }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      answer: fallbackAnswer(question, topology, history),
      provider: "fallback",
      fallbackUsed: true,
    };
  }

  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const prompt = [
    "You are NETFORGE Network Copilot, an AI assistant for secure network topology design.",
    "Give concise, practical, topology-aware advice.",
    "Prioritize firewall placement, segmentation, Cisco-friendly guidance, and security improvements.",
    "Do not invent missing topology facts. If data is missing, state that briefly.",
    "",
    "Current topology context:",
    summarizeTopology(topology),
    "",
    "Recent conversation context:",
    history
      .slice(-6)
      .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.text}`)
      .join("\n") || "No previous messages.",
    "",
    `User question: ${question}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      reasoning: {
        effort: "low",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    let friendlyMessage = `OpenAI request failed (${response.status}), switching to built-in intelligent assistant.`;

    try {
      const payload = JSON.parse(text);
      const code = payload?.error?.code;

      if (code === "insufficient_quota") {
        friendlyMessage = "OpenAI quota exceeded, switching to built-in intelligent assistant.";
      } else if (code === "invalid_api_key") {
        friendlyMessage = "OpenAI API key is invalid, switching to built-in intelligent assistant.";
      } else if (payload?.error?.message) {
        friendlyMessage = `${payload.error.message} Switching to built-in intelligent assistant.`;
      }
    } catch {
      // Keep the default friendly message.
    }

    return {
      answer: `${friendlyMessage}\n\n${fallbackAnswer(question, topology, history)}`,
      provider: "fallback",
      fallbackUsed: true,
    };
  }

  const payload = await response.json();
  const answer = extractResponseText(payload);

  return {
    answer: answer || fallbackAnswer(question, topology, history),
    provider: "openai",
    fallbackUsed: !answer,
  };
}
