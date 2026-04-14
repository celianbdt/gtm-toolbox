"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Pause,
  Square,
  Send,
  MessageSquare,
  Gamepad2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

const PhaserRoom = dynamic(
  () => import("@/components/sandbox/phaser-room"),
  { ssr: false },
);

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA & DEBATE ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */

const MOCK_AGENTS = [
  {
    id: "1",
    name: "The Strategist",
    emoji: "\u{1F3AF}",
    color: "#8a6e4e",
    role: "GTM Strategist",
  },
  {
    id: "2",
    name: "Devil's Advocate",
    emoji: "\u{1F608}",
    color: "#ef4444",
    role: "Critical Challenger",
  },
  {
    id: "3",
    name: "The CFO",
    emoji: "\u{1F4B0}",
    color: "#22c55e",
    role: "Finance Analyst",
  },
  {
    id: "4",
    name: "Growth Hacker",
    emoji: "\u{1F680}",
    color: "#f59e0b",
    role: "Growth Expert",
  },
  {
    id: "5",
    name: "CS Leader",
    emoji: "\u{1F49A}",
    color: "#06b6d4",
    role: "Customer Success",
  },
];

const MOCK_MESSAGES = [
  "Je pense qu'on devrait doubler notre investissement sur le contenu organique. Les donnees montrent un CAC 3x inferieur sur les 3 derniers mois.",
  "Attendez \u2014 le contenu organique prend 6 mois avant de produire des resultats. On a besoin de pipeline maintenant, pas dans 6 mois.",
  "D'un point de vue financier, le paid a un payback de 4 mois. L'organique prend 12 mois mais le LTV est 2.3x meilleur sur le long terme.",
  "Et si on testait un growth loop ? Chaque client qui signe genere 2 referrals en moyenne. C'est scalable et le cout marginal est quasi nul.",
  "Nos meilleurs clients viennent du bouche-a-oreille. Le NPS est a 72. Le taux de retention sur ce segment est de 95%. On devrait capitaliser la-dessus avant tout.",
  "Le risque du tout-organique c'est qu'on n'a aucun controle sur le timing. Si le board veut des resultats Q2, on ne peut pas se permettre d'attendre.",
  "Justement, un mix 60/40 paid/organic permettrait de securiser le short-term tout en construisant le moat long-terme. Le blended CAC resterait sous les $90.",
  "D'accord sur le principe, mais les unit economics du paid se degradent depuis 2 trimestres. CPM +30%, CTR -15%. On brule plus pour moins de resultat.",
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
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}`,
              agentId: agent.id,
              agentName: agent.name,
              agentColor: agent.color,
              text: fullText,
              timestamp: Date.now(),
            },
          ]);
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSpeakingId(null);
    setThinkingId(null);
    setStreamingText("");
  }

  function addUserMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        agentId: null,
        agentName: "You",
        agentColor: "#a78bfa",
        text,
        timestamp: Date.now(),
        isUser: true,
      },
    ]);
    if (isPaused) {
      setIsPaused(false);
      setRound((r) => r + 1);
    }
  }

  return {
    messages,
    speakingId,
    thinkingId,
    streamingText,
    isPaused,
    isStopped,
    pause,
    resume,
    stop,
    addUserMessage,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIDE CHAT PANEL
   ═══════════════════════════════════════════════════════════════════════════ */

function SideChat({
  messages,
  speakingId,
  streamingText,
  isPaused,
  isStopped,
  onPause,
  onResume,
  onStop,
  onSend,
  fullScreen,
}: {
  messages: ChatMessage[];
  speakingId: string | null;
  streamingText: string;
  isPaused: boolean;
  isStopped: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSend: (text: string) => void;
  fullScreen?: boolean;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const speakingAgent = MOCK_AGENTS.find((a) => a.id === speakingId);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, streamingText]);

  function handleSend() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  }

  return (
    <div
      className={`flex flex-col h-full ${fullScreen ? "bg-zinc-950" : ""}`}
    >
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Discussion</h3>
            <p className="text-[10px] text-muted-foreground">
              {messages.length} messages \u00B7 {MOCK_AGENTS.length} agents
            </p>
          </div>
          <div className="flex gap-1.5">
            {!isStopped && (
              <>
                {isPaused ? (
                  <button
                    onClick={onResume}
                    className="px-2.5 py-1 text-[10px] font-medium bg-violet-600 text-foreground rounded-md hover:bg-primary transition-colors"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={onPause}
                    className="p-1.5 text-muted-foreground hover:text-foreground bg-secondary rounded-md transition-colors"
                    title="Pause"
                  >
                    <Pause className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={onStop}
                  className="p-1.5 text-red-400/70 hover:text-red-400 bg-secondary rounded-md transition-colors"
                  title="Stop"
                >
                  <Square className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Agent roster */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {MOCK_AGENTS.map((agent) => {
            const isActive = speakingId === agent.id;
            return (
              <div
                key={agent.id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all duration-300"
                style={{
                  backgroundColor: isActive
                    ? `${agent.color}20`
                    : "transparent",
                  border: isActive
                    ? `1px solid ${agent.color}40`
                    : "1px solid transparent",
                }}
              >
                <span className="text-xs">{agent.emoji}</span>
                <span
                  className={`text-[9px] font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {agent.name.split(" ").pop()}
                </span>
                {isActive && (
                  <div className="flex gap-0.5 ml-0.5">
                    <div
                      className="w-0.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: agent.color }}
                    />
                    <div
                      className="w-0.5 h-2 rounded-full animate-pulse"
                      style={{
                        backgroundColor: agent.color,
                        animationDelay: "100ms",
                      }}
                    />
                    <div
                      className="w-0.5 h-1.5 rounded-full animate-pulse"
                      style={{
                        backgroundColor: agent.color,
                        animationDelay: "200ms",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-2.5"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={msg.isUser ? "flex justify-end" : ""}>
            {msg.isUser ? (
              <div className="max-w-[85%] bg-violet-600/20 border border-primary/20 rounded-xl rounded-tr-sm px-3 py-2">
                <p className="text-[11px] text-violet-200 leading-relaxed">
                  {msg.text}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">
                    {MOCK_AGENTS.find((a) => a.id === msg.agentId)?.emoji}
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: msg.agentColor }}
                  >
                    {msg.agentName}
                  </span>
                  <span className="text-[8px] text-zinc-700">
                    {new Date(msg.timestamp).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className="pl-4 border-l"
                  style={{ borderColor: `${msg.agentColor}30` }}
                >
                  <p className="text-[11px] text-foreground leading-relaxed">
                    {msg.text}
                  </p>
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
              <span
                className="text-[10px] font-semibold"
                style={{ color: speakingAgent.color }}
              >
                {speakingAgent.name}
              </span>
              <span className="text-[8px] text-zinc-700">en cours...</span>
            </div>
            <div
              className="pl-4 border-l"
              style={{ borderColor: `${speakingAgent.color}30` }}
            >
              <p className="text-[11px] text-foreground leading-relaxed">
                {streamingText}
                <span
                  className="inline-block w-0.5 h-3 ml-0.5 animate-pulse"
                  style={{ backgroundColor: speakingAgent.color }}
                />
              </p>
            </div>
          </div>
        )}

        {messages.length === 0 && !speakingId && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[11px] text-muted-foreground italic">
              Le debat va commencer...
            </p>
          </div>
        )}

        {isStopped && (
          <div className="text-center py-4">
            <span className="text-[10px] text-muted-foreground bg-secondary px-3 py-1 rounded-full">
              Debat termine
            </span>
          </div>
        )}

        {isPaused && (
          <div className="text-center py-4">
            <span className="text-[10px] text-amber-500/60 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              En pause \u2014 ecrivez un message ou cliquez Resume
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      {!isStopped && (
        <div className="shrink-0 px-3 py-2.5 border-t border-border/60">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                isPaused ? "Interjection..." : "Intervenir dans le debat..."
              }
              className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-[11px] text-foreground placeholder-zinc-600 focus:outline-none focus:border-violet-600/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-1.5 bg-violet-600 hover:bg-primary disabled:opacity-30 text-foreground rounded-lg transition-colors"
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
  const {
    messages,
    speakingId,
    thinkingId,
    streamingText,
    isPaused,
    isStopped,
    pause,
    resume,
    stop,
    addUserMessage,
  } = useMockDebate();

  const [view, setView] = useState<"game" | "chat">("game");
  const [chatOpen, setChatOpen] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative" ref={containerRef}>
      {/* ── View toggle (top-right corner) ── */}
      <div className="absolute top-3 right-3 z-50 flex gap-1.5">
        <button
          onClick={() => setView(view === "game" ? "chat" : "game")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium bg-card/90 backdrop-blur-sm text-foreground hover:text-foreground border border-border/50 rounded-lg transition-colors"
        >
          {view === "game" ? (
            <>
              <MessageSquare className="h-3 w-3" />
              Chat view
            </>
          ) : (
            <>
              <Gamepad2 className="h-3 w-3" />
              Game view
            </>
          )}
        </button>

        {view === "game" && (
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-card/90 backdrop-blur-sm text-foreground hover:text-foreground border border-border/50 rounded-lg transition-colors"
            title={chatOpen ? "Hide chat" : "Show chat"}
          >
            {chatOpen ? (
              <PanelRightClose className="h-3 w-3" />
            ) : (
              <PanelRightOpen className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* ── GAME VIEW ── */}
      {view === "game" && (
        <>
          {/* Phaser room — full width/height */}
          <div className="absolute inset-0 bg-[#16213e]">
            <PhaserRoom
              agents={MOCK_AGENTS}
              speakingId={speakingId}
              thinkingId={thinkingId}
              streamingText={streamingText}
              width={dimensions.width}
              height={dimensions.height}
              className="w-full h-full"
            />
          </div>

          {/* Floating chat overlay */}
          {chatOpen && (
            <div className="absolute top-0 right-0 h-full w-[350px] z-40 bg-zinc-950/90 backdrop-blur-sm border-l border-border/40">
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
          )}
        </>
      )}

      {/* ── CHAT VIEW (full screen chat) ── */}
      {view === "chat" && (
        <div className="absolute inset-0 z-40">
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
            fullScreen
          />
        </div>
      )}
    </div>
  );
}
