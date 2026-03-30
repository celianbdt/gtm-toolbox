"use client";

import { useEffect, useRef, useCallback } from "react";

type Agent = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
};

type RoomProps = {
  agents: Agent[];
  speakingId: string | null;
  thinkingId: string | null;
  streamingText: string;
  width?: number;
  height?: number;
};

// ─── Drawing helpers ────────────────────────────────────────────────────────

function hexToNum(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

function drawPixelChar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  color: number,
  scale: number = 2
) {
  const s = scale;
  const skin = 0xf0c8a0;
  const skinD = 0xd4a878;
  const pants = 0x3a3a5c;
  const shoes = 0x2a2a3a;
  const hair = 0x3a2a1a;
  const eye = 0x1a1a2a;

  // Head/hair
  g.fillStyle(hair); g.fillRect(x + 1*s, y, 3*s, s);
  g.fillStyle(hair); g.fillRect(x, y + s, 5*s, s);
  g.fillStyle(hair); g.fillRect(x, y + 2*s, s, 2*s);
  g.fillStyle(hair); g.fillRect(x + 4*s, y + 2*s, s, 2*s);
  g.fillStyle(skin); g.fillRect(x + s, y + 2*s, 3*s, s);
  // Eyes
  g.fillStyle(skin); g.fillRect(x + s, y + 3*s, s, s);
  g.fillStyle(eye);  g.fillRect(x + 2*s, y + 3*s, s, s);
  g.fillStyle(skin); g.fillRect(x + 3*s, y + 3*s, s, s);
  // Mouth
  g.fillStyle(skin); g.fillRect(x + s, y + 4*s, 3*s, s);
  g.fillStyle(skinD); g.fillRect(x + 2*s, y + 4*s, s, s);
  // Neck
  g.fillStyle(skin); g.fillRect(x + 2*s, y + 5*s, s, s);
  // Shirt
  g.fillStyle(color); g.fillRect(x, y + 6*s, 5*s, 3*s);
  // Pants
  g.fillStyle(pants); g.fillRect(x + s, y + 9*s, s, 2*s);
  g.fillStyle(pants); g.fillRect(x + 3*s, y + 9*s, s, 2*s);
  // Shoes
  g.fillStyle(shoes); g.fillRect(x, y + 11*s, 2*s, s);
  g.fillStyle(shoes); g.fillRect(x + 3*s, y + 11*s, 2*s, s);
}

export default function PhaserRoom({ agents, speakingId, thinkingId, streamingText, width = 700, height = 500 }: RoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneDataRef = useRef<{
    agents: Agent[];
    speakingId: string | null;
    thinkingId: string | null;
    streamingText: string;
  }>({ agents, speakingId: null, thinkingId: null, streamingText: "" });

  // Keep ref in sync
  useEffect(() => {
    sceneDataRef.current = { agents, speakingId, thinkingId, streamingText };
  }, [agents, speakingId, thinkingId, streamingText]);

  const initPhaser = useCallback(async () => {
    if (gameRef.current || !containerRef.current) return;

    const Phaser = (await import("phaser")).default;
    const dataRef = sceneDataRef;

    class MeetingScene extends Phaser.Scene {
      private agentContainers: Map<string, Phaser.GameObjects.Container> = new Map();
      private bubbles: Map<string, Phaser.GameObjects.Container> = new Map();
      private thinkDots: Map<string, Phaser.GameObjects.Container> = new Map();
      private charGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
      private bounceTimers: Map<string, Phaser.Time.TimerEvent> = new Map();

      constructor() { super("MeetingScene"); }

      create() {
        const W = width;
        const H = height;
        const g = this.add.graphics();

        // ═══ FLOOR ═══
        g.fillStyle(0x2e2822); g.fillRect(0, 0, W, H);

        // Wood plank pattern
        for (let y = 0; y < H; y += 12) {
          g.fillStyle(y % 24 === 0 ? 0x322c26 : 0x2a2520);
          g.fillRect(0, y, W, 6);
          g.fillStyle(y % 24 === 0 ? 0x2a2520 : 0x322c26);
          g.fillRect(0, y + 6, W, 6);
        }
        // Subtle plank lines
        for (let x = 0; x < W; x += 48) {
          g.lineStyle(1, 0x1a1814, 0.3);
          g.lineBetween(x, 0, x, H);
        }

        // ═══ WALLS ═══
        // Top wall
        g.fillStyle(0x1a1a2a); g.fillRect(0, 0, W, 24);
        g.fillStyle(0x222238); g.fillRect(0, 20, W, 4);
        // Left wall
        g.fillStyle(0x1a1a2a); g.fillRect(0, 0, 16, H);
        g.fillStyle(0x222238); g.fillRect(12, 0, 4, H);
        // Right wall
        g.fillStyle(0x1a1a2a); g.fillRect(W - 16, 0, 16, H);
        g.fillStyle(0x222238); g.fillRect(W - 16, 0, 4, H);
        // Bottom wall
        g.fillStyle(0x1a1a2a); g.fillRect(0, H - 12, W, 12);
        g.fillStyle(0x222238); g.fillRect(0, H - 12, W, 4);

        // ═══ CARPET under table ═══
        g.fillStyle(0x352a45, 0.4);
        g.fillRoundedRect(W/2 - 140, H/2 - 80, 280, 160, 8);
        g.lineStyle(1, 0x6c5ce7, 0.15);
        g.strokeRoundedRect(W/2 - 140, H/2 - 80, 280, 160, 8);

        // ═══ CONFERENCE TABLE ═══
        // Shadow
        g.fillStyle(0x000000, 0.2);
        g.fillEllipse(W/2 + 3, H/2 + 3, 200, 80);
        // Table body
        g.fillStyle(0x5a3d2b);
        g.fillEllipse(W/2, H/2, 200, 80);
        // Table top highlight
        g.fillStyle(0x7a5840);
        g.fillEllipse(W/2, H/2 - 2, 185, 68);
        // Wood grain lines
        g.lineStyle(1, 0x4a3020, 0.3);
        for (let i = -3; i <= 3; i++) {
          g.strokeEllipse(W/2, H/2 - 2, 185 - Math.abs(i) * 20, 68 - Math.abs(i) * 8);
        }

        // Papers on table
        g.fillStyle(0xe8e8d8, 0.6); g.fillRect(W/2 - 20, H/2 - 10, 14, 18);
        g.fillStyle(0xd8e0e8, 0.5); g.fillRect(W/2 + 8, H/2 - 5, 12, 16);
        g.fillStyle(0xffeaa7, 0.5); g.fillRect(W/2 - 5, H/2 + 2, 10, 10);
        // Pen
        g.fillStyle(0x0984e3); g.fillRect(W/2 + 22, H/2 - 8, 2, 10);
        // Coffee mug
        g.fillStyle(0xd63031); g.fillCircle(W/2 - 35, H/2 + 5, 4);
        g.fillStyle(0x1a1a1a); g.fillCircle(W/2 - 35, H/2 + 5, 2);

        // ═══ WHITEBOARD ═══
        g.fillStyle(0xdfe6e9); g.fillRect(W/2 - 50, 26, 100, 50);
        g.lineStyle(2, 0x636e72); g.strokeRect(W/2 - 50, 26, 100, 50);
        // Scribbles
        g.lineStyle(1, 0x0984e3, 0.6);
        g.beginPath(); g.moveTo(W/2 - 40, 40); g.lineTo(W/2 - 10, 36); g.lineTo(W/2 + 20, 44); g.lineTo(W/2 + 40, 38); g.strokePath();
        g.lineStyle(1, 0xd63031, 0.5);
        g.beginPath(); g.moveTo(W/2 - 40, 52); g.lineTo(W/2, 56); g.lineTo(W/2 + 30, 50); g.strokePath();
        g.lineStyle(1, 0x00b894, 0.4);
        g.beginPath(); g.moveTo(W/2 - 30, 64); g.lineTo(W/2 + 10, 62); g.strokePath();
        // Marker tray
        g.fillStyle(0x636e72); g.fillRect(W/2 - 20, 76, 40, 3);
        g.fillStyle(0xd63031); g.fillRect(W/2 - 15, 76, 4, 3);
        g.fillStyle(0x0984e3); g.fillRect(W/2 - 5, 76, 4, 3);
        g.fillStyle(0x00b894); g.fillRect(W/2 + 5, 76, 4, 3);

        // ═══ BOOKSHELVES ═══
        const drawBookshelf = (bx: number, by: number) => {
          g.fillStyle(0x5a3e28); g.fillRect(bx, by, 50, 60);
          // Shelves
          for (let s = 0; s < 3; s++) {
            g.fillStyle(0x6d4c2e); g.fillRect(bx + 2, by + 2 + s * 20, 46, 18);
            g.fillStyle(0x4a3020); g.fillRect(bx + 2, by + s * 20, 46, 2);
            // Books
            const colors = [0xd63031, 0x0984e3, 0xfdcb6e, 0x00b894, 0x6c5ce7, 0xe17055, 0x74b9ff];
            for (let b = 0; b < 7; b++) {
              g.fillStyle(colors[b]); g.fillRect(bx + 4 + b * 6, by + 4 + s * 20, 4, 14);
            }
          }
        };
        drawBookshelf(20, 26);
        drawBookshelf(W - 70, 26);

        // ═══ PLANTS ═══
        const drawPlant = (px: number, py: number) => {
          g.fillStyle(0x8b4513); g.fillRect(px - 6, py, 12, 10);
          g.fillStyle(0xa0522d); g.fillRect(px - 5, py + 1, 10, 8);
          g.fillStyle(0x3e2723); g.fillRect(px - 4, py, 8, 2);
          g.fillStyle(0x27ae60); g.fillCircle(px, py - 5, 8);
          g.fillStyle(0x2ecc71); g.fillCircle(px - 4, py - 8, 5);
          g.fillStyle(0x2ecc71); g.fillCircle(px + 5, py - 6, 5);
        };
        drawPlant(40, H - 30);
        drawPlant(W - 40, H - 30);
        drawPlant(W - 35, 100);
        drawPlant(35, 100);

        // ═══ CLOCK ═══
        g.fillStyle(0xe8e8e0); g.fillCircle(W - 55, 40, 10);
        g.lineStyle(1, 0x636e72); g.strokeCircle(W - 55, 40, 10);
        g.lineStyle(2, 0x2d3436); g.lineBetween(W - 55, 40, W - 55, 34);
        g.lineStyle(1, 0x636e72); g.lineBetween(W - 55, 40, W - 50, 42);

        // ═══ CHAIRS ═══
        const seatPositions = this.getSeatPositions(W, H, dataRef.current.agents.length);
        seatPositions.forEach((pos, i) => {
          if (i >= dataRef.current.agents.length) return;
          // Chair
          g.fillStyle(0x2d3436);
          g.fillCircle(pos.x, pos.y + 16, 9);
          g.fillStyle(0x4a4a6a);
          g.fillCircle(pos.x, pos.y + 16, 7);
        });

        // ═══ AGENTS ═══
        this.createAgents(W, H);

        // ═══ UPDATE LOOP ═══
        this.time.addEvent({
          delay: 100,
          loop: true,
          callback: () => this.updateAgentStates(),
        });
      }

      getSeatPositions(W: number, H: number, count: number) {
        const positions: { x: number; y: number }[] = [];
        const cx = W / 2;
        const cy = H / 2;
        const rx = 130;
        const ry = 70;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
          positions.push({
            x: cx + rx * Math.cos(angle),
            y: cy + ry * Math.sin(angle),
          });
        }
        return positions;
      }

      createAgents(W: number, H: number) {
        const positions = this.getSeatPositions(W, H, dataRef.current.agents.length);

        dataRef.current.agents.forEach((agent, i) => {
          const pos = positions[i];
          const container = this.add.container(pos.x, pos.y - 8);

          // Character graphic
          const charG = this.add.graphics();
          drawPixelChar(charG, -5, -12, hexToNum(agent.color), 2);
          container.add(charG);
          this.charGraphics.set(agent.id, charG);

          // Name label
          const label = this.add.text(0, 18, agent.name, {
            fontSize: "8px",
            color: "#ffffff",
            backgroundColor: "#00000088",
            padding: { x: 3, y: 1 },
            align: "center",
          }).setOrigin(0.5, 0);
          container.add(label);

          // Role label
          const roleLabel = this.add.text(0, 28, agent.role, {
            fontSize: "6px",
            color: agent.color,
            align: "center",
          }).setOrigin(0.5, 0);
          container.add(roleLabel);

          container.setDepth(10 + i);
          this.agentContainers.set(agent.id, container);
        });
      }

      updateAgentStates() {
        const { speakingId, thinkingId, streamingText, agents } = dataRef.current;

        agents.forEach((agent) => {
          const container = this.agentContainers.get(agent.id);
          if (!container) return;

          const isSpeaking = speakingId === agent.id;
          const isThinking = thinkingId === agent.id;
          const isActive = isSpeaking || isThinking;

          // Opacity
          container.setAlpha(isActive ? 1 : 0.55);

          // ── Speaking bubble ──
          if (isSpeaking && streamingText) {
            let bubble = this.bubbles.get(agent.id);
            if (!bubble) {
              bubble = this.add.container(container.x, container.y - 45);
              bubble.setDepth(50);

              const bg = this.add.graphics();
              bubble.add(bg);

              const text = this.add.text(0, 0, "", {
                fontSize: "8px",
                color: "#ffffff",
                wordWrap: { width: 140 },
                align: "left",
                padding: { x: 6, y: 4 },
              }).setOrigin(0.5, 1);
              bubble.add(text);

              this.bubbles.set(agent.id, bubble);
            }

            // Update position
            bubble.setPosition(container.x, container.y - 45);

            const text = bubble.getAt(1) as Phaser.GameObjects.Text;
            const truncated = streamingText.length > 80 ? "..." + streamingText.slice(-77) : streamingText;
            text.setText(truncated);

            // Redraw background
            const bg = bubble.getAt(0) as Phaser.GameObjects.Graphics;
            bg.clear();
            const tw = Math.min(text.width + 12, 160);
            const th = text.height + 8;
            bg.fillStyle(hexToNum(agent.color), 0.15);
            bg.fillRoundedRect(-tw/2, -th, tw, th, 6);
            bg.lineStyle(1.5, hexToNum(agent.color), 0.5);
            bg.strokeRoundedRect(-tw/2, -th, tw, th, 6);
            // Tail
            bg.fillStyle(hexToNum(agent.color), 0.15);
            bg.fillTriangle(-4, 0, 4, 0, 0, 6);

            bubble.setVisible(true);

            // Bounce animation
            if (!this.bounceTimers.has(agent.id)) {
              const timer = this.time.addEvent({
                delay: 350,
                loop: true,
                callback: () => {
                  if (!container) return;
                  this.tweens.add({
                    targets: container,
                    y: container.y - 3,
                    duration: 175,
                    yoyo: true,
                    ease: "Sine.easeInOut",
                  });
                },
              });
              this.bounceTimers.set(agent.id, timer);
            }
          } else {
            // Hide bubble
            const bubble = this.bubbles.get(agent.id);
            if (bubble) { bubble.setVisible(false); }
            // Stop bounce
            const timer = this.bounceTimers.get(agent.id);
            if (timer) { timer.remove(); this.bounceTimers.delete(agent.id); }
          }

          // ── Thinking dots ──
          if (isThinking) {
            let dots = this.thinkDots.get(agent.id);
            if (!dots) {
              dots = this.add.container(container.x, container.y - 35);
              dots.setDepth(50);

              const bg = this.add.graphics();
              bg.fillStyle(0x1a1a2a, 0.85);
              bg.fillRoundedRect(-18, -8, 36, 16, 8);
              bg.lineStyle(1, hexToNum(agent.color), 0.4);
              bg.strokeRoundedRect(-18, -8, 36, 16, 8);
              dots.add(bg);

              for (let d = 0; d < 3; d++) {
                const dot = this.add.circle(-8 + d * 8, 0, 2.5, hexToNum(agent.color));
                dots.add(dot);
                this.tweens.add({
                  targets: dot,
                  y: -3,
                  duration: 400,
                  yoyo: true,
                  repeat: -1,
                  delay: d * 150,
                  ease: "Sine.easeInOut",
                });
              }

              this.thinkDots.set(agent.id, dots);
            }
            dots.setPosition(container.x, container.y - 35);
            dots.setVisible(true);
          } else {
            const dots = this.thinkDots.get(agent.id);
            if (dots) dots.setVisible(false);
          }
        });
      }
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width,
      height,
      scene: [MeetingScene],
      pixelArt: true,
      backgroundColor: "#16213e",
      scale: { mode: Phaser.Scale.NONE },
      input: { keyboard: { capture: [] } },
    });

    gameRef.current = game;
  }, [width, height]);

  useEffect(() => {
    initPhaser();
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [initPhaser]);

  return <div ref={containerRef} className="rounded-lg overflow-hidden" style={{ width, height }} />;
}
