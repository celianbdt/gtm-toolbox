"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Pause, Square, Send } from "lucide-react";

const PhaserRoom = dynamic(() => import("@/components/sandbox/phaser-room"), { ssr: false });

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA & DEBATE ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */

const MOCK_AGENTS = [
  { id: "1", name: "The Strategist", emoji: "🎯", color: "#8b5cf6", role: "GTM Strategist" },
  { id: "2", name: "Devil's Advocate", emoji: "😈", color: "#ef4444", role: "Critical Challenger" },
  { id: "3", name: "The CFO", emoji: "💰", color: "#22c55e", role: "Finance Analyst" },
  { id: "4", name: "Growth Hacker", emoji: "🚀", color: "#f59e0b", role: "Growth Expert" },
  { id: "5", name: "CS Leader", emoji: "💚", color: "#06b6d4", role: "Customer Success" },
];

const MOCK_MESSAGES = [
  "Je pense qu'on devrait doubler notre investissement sur le contenu organique. Les données montrent un CAC 3x inférieur sur les 3 derniers mois.",
  "Attendez — le contenu organique prend 6 mois avant de produire des résultats. On a besoin de pipeline maintenant, pas dans 6 mois.",
  "D'un point de vue financier, le paid a un payback de 4 mois. L'organique prend 12 mois mais le LTV est 2.3x meilleur sur le long terme.",
  "Et si on testait un growth loop ? Chaque client qui signe génère 2 referrals en moyenne. C'est scalable et le coût marginal est quasi nul.",
  "Nos meilleurs clients viennent du bouche-à-oreille. Le NPS est à 72. Le taux de rétention sur ce segment est de 95%. On devrait capitaliser là-dessus avant tout.",
  "Le risque du tout-organique c'est qu'on n'a aucun contrôle sur le timing. Si le board veut des résultats Q2, on ne peut pas se permettre d'attendre.",
  "Justement, un mix 60/40 paid/organic permettrait de sécuriser le short-term tout en construisant le moat long-terme. Le blended CAC resterait sous les $90.",
  "D'accord sur le principe, mais les unit economics du paid se dégradent depuis 2 trimestres. CPM +30%, CTR -15%. On brûle plus pour moins de résultat.",
];

type ChatMessage = {
  id: string;
  agentId: string | null;
  agentName: string;
  agentColor: string;
  text: string;
  timestamp: number;
  isUser?: boolean;
};

function useMockDebate() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [thinkingId, setThinkingId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [round, setRound] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerNextMessage = useCallback(() => {
    if (isPaused || isStopped) return;

    const agentIndex = round % MOCK_AGENTS.length;
    const msgIndex = round % MOCK_MESSAGES.length;
    const agent = MOCK_AGENTS[agentIndex];
    const fullText = MOCK_MESSAGES[msgIndex];

    setThinkingId(agent.id);
    setSpeakingId(null);
    setStreamingText("");

    setTimeout(() => {
      if (isPaused || isStopped) return;
      setThinkingId(null);
      setSpeakingId(agent.id);
      let i = 0;
      intervalRef.current = setInterval(() => {
        if (i < fullText.length) {
          setStreamingText(fullText.slice(0, i + 1));
          i++;
        } else {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setMessages((prev) => [...prev, {
            id: `msg-${Date.now()}`,
            agentId: agent.id,
            agentName: agent.name,
            agentColor: agent.color,
            text: fullText,
            timestamp: Date.now(),
          }]);
          setSpeakingId(null);
          setStreamingText("");
          setRound((r) => r + 1);
        }
      }, 20);
    }, 1000);
  }, [round, isPaused, isStopped]);

  useEffect(() => {
    if (isPaused || isStopped) return;
    const timer = setTimeout(triggerNextMessage, 1500);
    return () => clearTimeout(timer);
  }, [round, triggerNextMessage, isPaused, isStopped]);

  function pause() {
    setIsPaused(true);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setSpeakingId(null);
    setThinkingId(null);
    setStreamingText("");
  }

  function resume() {
    setIsPaused(false);
    setRound((r) => r + 1);
  }

  function stop() {
    setIsStopped(true);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setSpeakingId(null);
    setThinkingId(null);
    setStreamingText("");
  }

  function addUserMessage(text: string) {
    setMessages((prev) => [...prev, {
      id: `user-${Date.now()}`,
      agentId: null,
      agentName: "You",
      agentColor: "#a78bfa",
      text,
      timestamp: Date.now(),
      isUser: true,
    }]);
    // Resume if paused
    if (isPaused) {
      setIsPaused(false);
      setRound((r) => r + 1);
    }
  }

  return { messages, speakingId, thinkingId, streamingText, isPaused, isStopped, pause, resume, stop, addUserMessage };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIDE CHAT PANEL
   ═══════════════════════════════════════════════════════════════════════════ */

function SideChat({ messages, speakingId, streamingText, isPaused, isStopped, onPause, onResume, onStop, onSend }: {
  messages: ChatMessage[];
  speakingId: string | null;
  streamingText: string;
  isPaused: boolean;
  isStopped: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const speakingAgent = MOCK_AGENTS.find((a) => a.id === speakingId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streamingText]);

  function handleSend() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800/60">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Discussion</h3>
            <p className="text-[10px] text-zinc-500">{messages.length} messages · {MOCK_AGENTS.length} agents</p>
          </div>
          <div className="flex gap-1.5">
            {!isStopped && (
              <>
                {isPaused ? (
                  <button onClick={onResume} className="px-2.5 py-1 text-[10px] font-medium bg-violet-600 text-white rounded-md hover:bg-violet-500 transition-colors">
                    Resume
                  </button>
                ) : (
                  <button onClick={onPause} className="p-1.5 text-zinc-500 hover:text-white bg-zinc-800 rounded-md transition-colors" title="Pause">
                    <Pause className="h-3 w-3" />
                  </button>
                )}
                <button onClick={onStop} className="p-1.5 text-red-400/70 hover:text-red-400 bg-zinc-800 rounded-md transition-colors" title="Stop">
                  <Square className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Agent roster */}
        <div className="flex gap-1.5 mt-2">
          {MOCK_AGENTS.map((agent) => {
            const isActive = speakingId === agent.id;
            return (
              <div
                key={agent.id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all duration-300"
                style={{
                  backgroundColor: isActive ? `${agent.color}20` : "transparent",
                  border: isActive ? `1px solid ${agent.color}40` : "1px solid transparent",
                }}
              >
                <span className="text-xs">{agent.emoji}</span>
                <span className={`text-[9px] font-medium ${isActive ? "text-white" : "text-zinc-600"}`}>
                  {agent.name.split(" ").pop()}
                </span>
                {isActive && (
                  <div className="flex gap-0.5 ml-0.5">
                    <div className="w-0.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: agent.color }} />
                    <div className="w-0.5 h-2 rounded-full animate-pulse" style={{ backgroundColor: agent.color, animationDelay: "100ms" }} />
                    <div className="w-0.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: agent.color, animationDelay: "200ms" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-2.5">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.isUser ? "flex justify-end" : ""}>
            {msg.isUser ? (
              <div className="max-w-[85%] bg-violet-600/20 border border-violet-500/20 rounded-xl rounded-tr-sm px-3 py-2">
                <p className="text-[11px] text-violet-200 leading-relaxed">{msg.text}</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">{MOCK_AGENTS.find((a) => a.id === msg.agentId)?.emoji}</span>
                  <span className="text-[10px] font-semibold" style={{ color: msg.agentColor }}>{msg.agentName}</span>
                  <span className="text-[8px] text-zinc-700">{new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="pl-4 border-l" style={{ borderColor: `${msg.agentColor}30` }}>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">{msg.text}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {speakingAgent && streamingText && (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">{speakingAgent.emoji}</span>
              <span className="text-[10px] font-semibold" style={{ color: speakingAgent.color }}>{speakingAgent.name}</span>
              <span className="text-[8px] text-zinc-700">en cours...</span>
            </div>
            <div className="pl-4 border-l" style={{ borderColor: `${speakingAgent.color}30` }}>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {streamingText}
                <span className="inline-block w-0.5 h-3 ml-0.5 animate-pulse" style={{ backgroundColor: speakingAgent.color }} />
              </p>
            </div>
          </div>
        )}

        {messages.length === 0 && !speakingId && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[11px] text-zinc-600 italic">Le debat va commencer...</p>
          </div>
        )}

        {isStopped && (
          <div className="text-center py-4">
            <span className="text-[10px] text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">Debat termine</span>
          </div>
        )}

        {isPaused && (
          <div className="text-center py-4">
            <span className="text-[10px] text-amber-500/60 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">En pause — ecrivez un message ou cliquez Resume</span>
          </div>
        )}
      </div>

      {/* Input */}
      {!isStopped && (
        <div className="shrink-0 px-3 py-2.5 border-t border-zinc-800/60">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isPaused ? "Interjection..." : "Intervenir dans le debat..."}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-violet-600/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white rounded-lg transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SANDBOX PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function SandboxPage() {
  const { messages, speakingId, thinkingId, streamingText, isPaused, isStopped, pause, resume, stop, addUserMessage } = useMockDebate();

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left — Phaser room */}
      <div className="flex-1 flex items-center justify-center bg-[#16213e] min-w-0">
        <PhaserRoom
          agents={MOCK_AGENTS}
          speakingId={speakingId}
          thinkingId={thinkingId}
          streamingText={streamingText}
          width={700}
          height={500}
        />
      </div>

      {/* Right — Side chat */}
      <div className="w-[340px] shrink-0">
        <SideChat
          messages={messages}
          speakingId={speakingId}
          streamingText={streamingText}
          isPaused={isPaused}
          isStopped={isStopped}
          onPause={pause}
          onResume={resume}
          onStop={stop}
          onSend={addUserMessage}
        />
      </div>
    </div>
  );
}
