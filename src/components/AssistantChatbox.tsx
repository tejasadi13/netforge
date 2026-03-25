import { useMemo, useState } from "react";
import { Bot, SendHorizonal, ShieldCheck, Sparkles } from "lucide-react";

import { API_BASE_URL, parseApiResponse } from "@/lib/api";
import { GeneratedTopology } from "@/types/network";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AssistantChatboxProps {
  topology?: GeneratedTopology | null;
}

interface Message {
  role: "assistant" | "user";
  text: string;
  source?: "openai" | "fallback";
}

const starterQuestions = [
  "Is my network secure?",
  "How to improve topology?",
  "Where to add firewall?",
];

function getIntroMessage(topology?: GeneratedTopology | null) {
  return topology
    ? `I'm monitoring ${topology.name}. Ask about segmentation, firewall placement, or security posture.`
    : "Generate or open a topology and I'll become your network copilot.";
}

export default function AssistantChatbox({ topology }: AssistantChatboxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: getIntroMessage(topology),
      source: "fallback",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  const headline = useMemo(
    () =>
      topology
        ? `Security ${topology.security.score}/100`
        : "AI insights unlocked after topology generation",
    [topology],
  );

  const ask = async (value: string) => {
    if (!value.trim()) return;

    const userMessage: Message = { role: "user", text: value };
    const nextHistory = [...messages.slice(-5), userMessage].map((message) => ({
      role: message.role,
      text: message.text,
    }));

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setAsking(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: value,
          topology,
          history: nextHistory,
        }),
      });

      const data = await parseApiResponse<{
        answer: string;
        provider: "openai" | "fallback";
        fallbackUsed: boolean;
      }>(response);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.answer,
          source: data.provider,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: error instanceof Error ? error.message : "AI assistant is unavailable right now.",
          source: "fallback",
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-primary/80">AI Assistant</p>
          <h3 className="text-xl font-semibold flex items-center gap-2 mt-1">
            <Bot className="h-5 w-5 text-primary" />
            Network Copilot
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{headline}</p>
        </div>
        <div className="rounded-full border border-primary/30 bg-primary/10 p-2">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {starterQuestions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => void ask(item)}
            disabled={asking}
            className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-60"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="max-h-72 space-y-3 overflow-auto pr-1">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-2xl border px-4 py-3 text-sm ${
              message.role === "assistant"
                ? "border-primary/20 bg-primary/10 text-foreground"
                : "border-border/60 bg-muted/30 text-muted-foreground"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
              {message.role === "assistant" ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Assistant
                  <span className="rounded-full border border-primary/20 bg-background/50 px-2 py-0.5 text-[10px] tracking-[0.14em] text-primary/80">
                    {message.source === "openai" ? "OpenAI" : "Fallback"}
                  </span>
                </>
              ) : (
                "You"
              )}
            </div>
            <p className="whitespace-pre-line">{message.text}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void ask(question);
            }
          }}
          placeholder="Ask about security, firewall placement, or improvements"
          className="bg-muted/20"
        />
        <Button onClick={() => void ask(question)} disabled={asking}>
          <SendHorizonal className="mr-2 h-4 w-4" />
          {asking ? "Thinking..." : "Ask"}
        </Button>
      </div>
    </div>
  );
}
