"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Gamepad2, MessageSquare, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { RoomTheme } from "./pixel-room";

const PixelRoom = dynamic(() => import("@/components/shared/pixel-room"), {
  ssr: false,
});

type PixelAgent = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
};

export type PixelArenaWrapperProps = {
  agents: PixelAgent[];
  speakingId: string | null;
  thinkingId: string | null;
  streamingText: string;
  theme?: RoomTheme;
  children: React.ReactNode;
};

export function PixelArenaWrapper({
  agents,
  speakingId,
  thinkingId,
  streamingText,
  theme = "default",
  children,
}: PixelArenaWrapperProps) {
  const [view, setView] = useState<"classic" | "pixel">("classic");
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
    <div ref={containerRef} className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Toggle button — top-right corner */}
      <div className="absolute top-2 right-2 z-50 flex gap-1.5">
        <button
          onClick={() => setView(view === "classic" ? "pixel" : "classic")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium bg-zinc-900/90 backdrop-blur-sm text-zinc-300 hover:text-white border border-zinc-700/50 rounded-lg transition-colors"
        >
          {view === "classic" ? (
            <>
              <Gamepad2 className="h-3 w-3" />
              Vue pixel
            </>
          ) : (
            <>
              <MessageSquare className="h-3 w-3" />
              Vue classique
            </>
          )}
        </button>

        {view === "pixel" && (
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-zinc-900/90 backdrop-blur-sm text-zinc-300 hover:text-white border border-zinc-700/50 rounded-lg transition-colors"
            title={chatOpen ? "Masquer le chat" : "Afficher le chat"}
          >
            {chatOpen ? (
              <PanelRightClose className="h-3 w-3" />
            ) : (
              <PanelRightOpen className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* Classic view — children fill the space */}
      {view === "classic" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      )}

      {/* Pixel view — Phaser background + floating overlay */}
      {view === "pixel" && (
        <>
          {/* Phaser room — absolute, full size */}
          <div className="absolute inset-0 bg-[#16213e]">
            <PixelRoom
              agents={agents}
              speakingId={speakingId}
              thinkingId={thinkingId}
              streamingText={streamingText}
              theme={theme}
              width={dimensions.width}
              height={dimensions.height}
              className="w-full h-full"
            />
          </div>

          {/* Floating chat overlay on the right */}
          {chatOpen && (
            <div className="absolute top-0 right-0 h-full w-[350px] z-40 bg-zinc-950/90 backdrop-blur-sm border-l border-zinc-800/40 overflow-y-auto">
              {children}
            </div>
          )}
        </>
      )}
    </div>
  );
}
