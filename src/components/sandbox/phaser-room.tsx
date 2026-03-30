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
  className?: string;
};

// ── Drawing helpers ─────────────────────────────────────────────────────

function hexToNum(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

const HAIR_COLORS = [0x3a2a1a, 0x1a1a2a, 0x8b4513, 0xdaa520, 0x800020];

function drawPixelChar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  color: number,
  scale: number,
  agentIndex: number,
) {
  const s = scale;
  const skin = 0xf0c8a0;
  const skinD = 0xd4a878;
  const pants = 0x2a2a3c;
  const shoes = 0x1a1a2a;
  const hair = HAIR_COLORS[agentIndex % HAIR_COLORS.length];
  const eye = 0x1a1a2a;
  const white = 0xffffff;

  // Hair top
  g.fillStyle(hair);
  g.fillRect(x + 1 * s, y, 4 * s, s);
  g.fillRect(x, y + s, 6 * s, s);

  // Hair sides
  g.fillRect(x, y + 2 * s, s, 2 * s);
  g.fillRect(x + 5 * s, y + 2 * s, s, 2 * s);

  // Face
  g.fillStyle(skin);
  g.fillRect(x + s, y + 2 * s, 4 * s, s);
  g.fillRect(x + s, y + 3 * s, 4 * s, s);
  g.fillRect(x + s, y + 4 * s, 4 * s, s);

  // Eyes (white + pupil)
  g.fillStyle(white);
  g.fillRect(x + 1 * s, y + 3 * s, s, s);
  g.fillRect(x + 4 * s, y + 3 * s, s, s);
  g.fillStyle(eye);
  g.fillRect(x + 2 * s, y + 3 * s, s, s);
  g.fillRect(x + 4 * s, y + 3 * s, s, s);

  // Mouth
  g.fillStyle(skinD);
  g.fillRect(x + 2 * s, y + 4 * s, 2 * s, s);

  // Neck
  g.fillStyle(skin);
  g.fillRect(x + 2 * s, y + 5 * s, 2 * s, s);

  // Shirt (business style with collar)
  g.fillStyle(color);
  g.fillRect(x, y + 6 * s, 6 * s, s);
  g.fillRect(x, y + 7 * s, 6 * s, s);
  g.fillRect(x, y + 8 * s, 6 * s, s);
  g.fillRect(x, y + 9 * s, 6 * s, s);
  // Collar detail
  g.fillStyle(white);
  g.fillRect(x + 2 * s, y + 6 * s, s, s);
  g.fillRect(x + 3 * s, y + 6 * s, s, s);

  // Pants
  g.fillStyle(pants);
  g.fillRect(x + s, y + 10 * s, 2 * s, 2 * s);
  g.fillRect(x + 3 * s, y + 10 * s, 2 * s, 2 * s);

  // Shoes
  g.fillStyle(shoes);
  g.fillRect(x, y + 12 * s, 2 * s, s);
  g.fillRect(x + 4 * s, y + 12 * s, 2 * s, s);

  // Arms (same color as shirt, extend slightly)
  g.fillStyle(color);
  g.fillRect(x - s, y + 7 * s, s, 2 * s);
  g.fillRect(x + 6 * s, y + 7 * s, s, 2 * s);
  // Hands
  g.fillStyle(skin);
  g.fillRect(x - s, y + 9 * s, s, s);
  g.fillRect(x + 6 * s, y + 9 * s, s, s);
}

export default function PhaserRoom({
  agents,
  speakingId,
  thinkingId,
  streamingText,
  width = 1200,
  height = 700,
  className,
}: RoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneDataRef = useRef<{
    agents: Agent[];
    speakingId: string | null;
    thinkingId: string | null;
    streamingText: string;
  }>({ agents, speakingId: null, thinkingId: null, streamingText: "" });

  useEffect(() => {
    sceneDataRef.current = { agents, speakingId, thinkingId, streamingText };
  }, [agents, speakingId, thinkingId, streamingText]);

  const initPhaser = useCallback(async () => {
    if (gameRef.current || !containerRef.current) return;

    const Phaser = (await import("phaser")).default;
    const dataRef = sceneDataRef;

    class OfficeScene extends Phaser.Scene {
      private agentContainers: Map<string, Phaser.GameObjects.Container> =
        new Map();
      private bubbles: Map<string, Phaser.GameObjects.Container> = new Map();
      private thinkDots: Map<string, Phaser.GameObjects.Container> = new Map();
      private charGraphics: Map<string, Phaser.GameObjects.Graphics> =
        new Map();
      private bounceTimers: Map<string, Phaser.Time.TimerEvent> = new Map();
      private seatPositions: Map<string, { x: number; y: number }> = new Map();
      private speakPositions: Map<string, { x: number; y: number }> =
        new Map();
      private idleTimers: Map<string, Phaser.Time.TimerEvent> = new Map();
      private prevSpeakingId: string | null = null;

      constructor() {
        super("OfficeScene");
      }

      create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.drawRoom(W, H);
        this.createAgents(W, H);

        this.time.addEvent({
          delay: 100,
          loop: true,
          callback: () => this.updateAgentStates(),
        });
      }

      drawRoom(W: number, H: number) {
        const g = this.add.graphics();

        // ═══ FLOOR ZONES ═══

        // Base floor (wood)
        g.fillStyle(0x2e2822);
        g.fillRect(0, 0, W, H);

        // Wood plank pattern (general area)
        for (let y = 0; y < H; y += 10) {
          g.fillStyle(y % 20 === 0 ? 0x322c26 : 0x2a2520);
          g.fillRect(0, y, W, 5);
          g.fillStyle(y % 20 === 0 ? 0x2a2520 : 0x322c26);
          g.fillRect(0, y + 5, W, 5);
        }
        for (let x = 0; x < W; x += 40) {
          g.lineStyle(1, 0x1a1814, 0.2);
          g.lineBetween(x, 0, x, H);
        }

        // Meeting area carpet (center)
        const meetX = W * 0.25;
        const meetY = H * 0.2;
        const meetW = W * 0.5;
        const meetH = H * 0.6;
        g.fillStyle(0x352a45, 0.5);
        g.fillRoundedRect(meetX, meetY, meetW, meetH, 10);
        g.lineStyle(1, 0x6c5ce7, 0.12);
        g.strokeRoundedRect(meetX, meetY, meetW, meetH, 10);
        // Carpet pattern
        for (let cy = meetY + 15; cy < meetY + meetH - 15; cy += 20) {
          g.lineStyle(1, 0x4a3a60, 0.1);
          g.lineBetween(meetX + 10, cy, meetX + meetW - 10, cy);
        }

        // Kitchen area floor (checkerboard, bottom-right)
        const kitX = W * 0.78;
        const kitY = H * 0.6;
        const kitW = W * 0.2;
        const kitH = H * 0.38;
        const tileSize = 14;
        for (let ty = kitY; ty < kitY + kitH; ty += tileSize) {
          for (let tx = kitX; tx < kitX + kitW; tx += tileSize) {
            const isLight =
              (Math.floor((tx - kitX) / tileSize) +
                Math.floor((ty - kitY) / tileSize)) %
                2 ===
              0;
            g.fillStyle(isLight ? 0x3a3a3a : 0x2a2a2a, 0.7);
            g.fillRect(
              tx,
              ty,
              Math.min(tileSize, kitX + kitW - tx),
              Math.min(tileSize, kitY + kitH - ty),
            );
          }
        }

        // ═══ WALLS ═══
        const wallThickness = 20;
        // Top wall
        g.fillStyle(0x1a1a2a);
        g.fillRect(0, 0, W, wallThickness);
        g.fillStyle(0x222238);
        g.fillRect(0, wallThickness - 3, W, 3);
        // Left wall
        g.fillStyle(0x1a1a2a);
        g.fillRect(0, 0, wallThickness, H);
        g.fillStyle(0x222238);
        g.fillRect(wallThickness - 3, 0, 3, H);
        // Right wall
        g.fillStyle(0x1a1a2a);
        g.fillRect(W - wallThickness, 0, wallThickness, H);
        g.fillStyle(0x222238);
        g.fillRect(W - wallThickness, 0, 3, H);
        // Bottom wall
        g.fillStyle(0x1a1a2a);
        g.fillRect(0, H - wallThickness / 2, W, wallThickness / 2);
        g.fillStyle(0x222238);
        g.fillRect(0, H - wallThickness / 2, W, 3);

        // ═══ WALL PARTITIONS ═══
        // Partition between meeting area and kitchen (vertical)
        const partX = W * 0.76;
        g.fillStyle(0x1a1a2a);
        g.fillRect(partX, H * 0.55, 6, H * 0.45);
        g.fillStyle(0x222238);
        g.fillRect(partX + 6, H * 0.55, 2, H * 0.45);
        // Door gap
        g.fillStyle(0x2e2822);
        g.fillRect(partX, H * 0.55, 6, 40);
        g.fillStyle(0x2e2822);
        g.fillRect(partX + 6, H * 0.55, 2, 40);

        // Partition between workstations and meeting (top horizontal)
        const partY2 = H * 0.15;
        g.fillStyle(0x1a1a2a);
        g.fillRect(W * 0.76, wallThickness, 6, H * 0.35);
        g.fillStyle(0x222238);
        g.fillRect(W * 0.76 + 6, wallThickness, 2, H * 0.35);
        // Door gap
        g.fillStyle(0x2e2822);
        g.fillRect(W * 0.76, H * 0.3, 6, 40);
        g.fillStyle(0x2e2822);
        g.fillRect(W * 0.76 + 6, H * 0.3, 2, 40);

        // ═══ ROOM LABELS ═══
        this.add
          .text(W * 0.5, meetY + 12, "SALLE DE REUNION", {
            fontSize: "9px",
            color: "#6c5ce780",
            fontStyle: "bold",
          })
          .setOrigin(0.5, 0);

        this.add
          .text(W * 0.88, H * 0.63, "CAFE", {
            fontSize: "8px",
            color: "#ffffff40",
            fontStyle: "bold",
          })
          .setOrigin(0.5, 0);

        this.add
          .text(W * 0.88, wallThickness + 8, "POSTES DE TRAVAIL", {
            fontSize: "8px",
            color: "#ffffff40",
            fontStyle: "bold",
          })
          .setOrigin(0.5, 0);

        // ═══ CONFERENCE TABLE (center of meeting area) ═══
        const tableX = W * 0.5;
        const tableY = H * 0.5;
        const tableRX = W * 0.14;
        const tableRY = H * 0.12;

        // Shadow
        g.fillStyle(0x000000, 0.25);
        g.fillEllipse(tableX + 3, tableY + 4, tableRX * 2, tableRY * 2);
        // Table body
        g.fillStyle(0x5a3d2b);
        g.fillEllipse(tableX, tableY, tableRX * 2, tableRY * 2);
        // Table top highlight
        g.fillStyle(0x7a5840);
        g.fillEllipse(tableX, tableY - 2, tableRX * 1.85, tableRY * 1.7);
        // Wood grain
        g.lineStyle(1, 0x4a3020, 0.25);
        for (let i = -3; i <= 3; i++) {
          g.strokeEllipse(
            tableX,
            tableY - 2,
            tableRX * 1.85 - Math.abs(i) * 15,
            tableRY * 1.7 - Math.abs(i) * 6,
          );
        }

        // Papers on table
        g.fillStyle(0xe8e8d8, 0.6);
        g.fillRect(tableX - 25, tableY - 12, 16, 20);
        g.fillStyle(0xd8e0e8, 0.5);
        g.fillRect(tableX + 10, tableY - 8, 14, 18);
        g.fillStyle(0xffeaa7, 0.5);
        g.fillRect(tableX - 6, tableY + 4, 12, 12);
        // Pen
        g.fillStyle(0x0984e3);
        g.fillRect(tableX + 28, tableY - 10, 2, 12);
        // Coffee mug
        g.fillStyle(0xd63031);
        g.fillCircle(tableX - 40, tableY + 8, 5);
        g.fillStyle(0x1a1a1a);
        g.fillCircle(tableX - 40, tableY + 8, 3);
        // Laptop
        g.fillStyle(0x636e72);
        g.fillRect(tableX + 35, tableY - 5, 18, 12);
        g.fillStyle(0x74b9ff, 0.4);
        g.fillRect(tableX + 36, tableY - 4, 16, 10);

        // ═══ WHITEBOARD (on top wall, above meeting area) ═══
        const wbX = W * 0.5 - 70;
        const wbY = wallThickness + 2;
        g.fillStyle(0xdfe6e9);
        g.fillRect(wbX, wbY, 140, 55);
        g.lineStyle(2, 0x636e72);
        g.strokeRect(wbX, wbY, 140, 55);
        // Content
        g.lineStyle(1, 0x0984e3, 0.6);
        g.beginPath();
        g.moveTo(wbX + 10, wbY + 12);
        g.lineTo(wbX + 40, wbY + 10);
        g.lineTo(wbX + 80, wbY + 16);
        g.lineTo(wbX + 120, wbY + 10);
        g.strokePath();
        g.lineStyle(1, 0xd63031, 0.5);
        g.beginPath();
        g.moveTo(wbX + 10, wbY + 25);
        g.lineTo(wbX + 60, wbY + 28);
        g.lineTo(wbX + 110, wbY + 24);
        g.strokePath();
        g.lineStyle(1, 0x00b894, 0.4);
        g.beginPath();
        g.moveTo(wbX + 15, wbY + 38);
        g.lineTo(wbX + 50, wbY + 36);
        g.lineTo(wbX + 90, wbY + 40);
        g.strokePath();
        // Sticky notes on whiteboard
        g.fillStyle(0xffeaa7, 0.7);
        g.fillRect(wbX + 100, wbY + 32, 14, 14);
        g.fillStyle(0x81ecec, 0.7);
        g.fillRect(wbX + 116, wbY + 30, 14, 14);
        // Marker tray
        g.fillStyle(0x636e72);
        g.fillRect(wbX + 30, wbY + 55, 80, 3);
        g.fillStyle(0xd63031);
        g.fillRect(wbX + 35, wbY + 55, 5, 3);
        g.fillStyle(0x0984e3);
        g.fillRect(wbX + 45, wbY + 55, 5, 3);
        g.fillStyle(0x00b894);
        g.fillRect(wbX + 55, wbY + 55, 5, 3);

        // ═══ WORKSTATION DESKS (right area, top) ═══
        const drawDesk = (
          dx: number,
          dy: number,
          facing: "left" | "down" = "left",
        ) => {
          if (facing === "left") {
            // Desk surface
            g.fillStyle(0x5a4530);
            g.fillRect(dx, dy, 45, 28);
            g.fillStyle(0x6d5540);
            g.fillRect(dx + 1, dy + 1, 43, 26);
            // Monitor
            g.fillStyle(0x2d3436);
            g.fillRect(dx + 5, dy + 2, 20, 14);
            g.fillStyle(0x74b9ff, 0.3);
            g.fillRect(dx + 6, dy + 3, 18, 12);
            // Monitor stand
            g.fillStyle(0x2d3436);
            g.fillRect(dx + 13, dy + 16, 4, 3);
            g.fillRect(dx + 10, dy + 19, 10, 2);
            // Keyboard
            g.fillStyle(0x3a3a3a);
            g.fillRect(dx + 5, dy + 22, 16, 4);
            // Mouse
            g.fillStyle(0x3a3a3a);
            g.fillRect(dx + 26, dy + 22, 4, 5);
            // Notepad
            g.fillStyle(0xffeaa7, 0.6);
            g.fillRect(dx + 33, dy + 3, 8, 10);
            // Pen
            g.fillStyle(0x0984e3);
            g.fillRect(dx + 35, dy + 15, 1, 8);
            // Coffee
            g.fillStyle(0xdfe6e9);
            g.fillCircle(dx + 38, dy + 24, 3);
            g.fillStyle(0x4a3020);
            g.fillCircle(dx + 38, dy + 24, 2);
          } else {
            // Desk surface (horizontal orientation)
            g.fillStyle(0x5a4530);
            g.fillRect(dx, dy, 36, 35);
            g.fillStyle(0x6d5540);
            g.fillRect(dx + 1, dy + 1, 34, 33);
            // Monitor
            g.fillStyle(0x2d3436);
            g.fillRect(dx + 8, dy + 3, 20, 14);
            g.fillStyle(0x74b9ff, 0.3);
            g.fillRect(dx + 9, dy + 4, 18, 12);
            // Keyboard
            g.fillStyle(0x3a3a3a);
            g.fillRect(dx + 10, dy + 20, 16, 4);
            // Mouse
            g.fillStyle(0x3a3a3a);
            g.fillRect(dx + 28, dy + 20, 4, 5);
          }
        };

        // Two desks on the right side
        drawDesk(W * 0.8, H * 0.1, "left");
        drawDesk(W * 0.8, H * 0.26, "left");
        // Desk chairs (right side workstations)
        g.fillStyle(0x2d3436);
        g.fillCircle(W * 0.8 + 55, H * 0.1 + 14, 8);
        g.fillStyle(0x4a4a6a);
        g.fillCircle(W * 0.8 + 55, H * 0.1 + 14, 6);
        g.fillStyle(0x2d3436);
        g.fillCircle(W * 0.8 + 55, H * 0.26 + 14, 8);
        g.fillStyle(0x4a4a6a);
        g.fillCircle(W * 0.8 + 55, H * 0.26 + 14, 6);

        // ═══ COFFEE / BREAK AREA (bottom-right) ═══
        // Counter
        g.fillStyle(0x4a4a4a);
        g.fillRect(W * 0.8, H * 0.72, 60, 20);
        g.fillStyle(0x5a5a5a);
        g.fillRect(W * 0.8 + 1, H * 0.72 + 1, 58, 18);
        // Coffee machine
        g.fillStyle(0x2d3436);
        g.fillRect(W * 0.8 + 5, H * 0.72 - 15, 16, 15);
        g.fillStyle(0xd63031);
        g.fillCircle(W * 0.8 + 13, H * 0.72 - 10, 2);
        g.fillStyle(0x636e72);
        g.fillRect(W * 0.8 + 8, H * 0.72 - 3, 10, 3);
        // Cups
        g.fillStyle(0xdfe6e9);
        g.fillRect(W * 0.8 + 25, H * 0.72 + 3, 5, 6);
        g.fillRect(W * 0.8 + 32, H * 0.72 + 3, 5, 6);
        g.fillRect(W * 0.8 + 39, H * 0.72 + 3, 5, 6);
        // Small table with chairs
        g.fillStyle(0x5a4530);
        g.fillRect(W * 0.84, H * 0.82, 24, 24);
        g.fillStyle(0x6d5540);
        g.fillRect(W * 0.84 + 1, H * 0.82 + 1, 22, 22);
        // Chairs around small table
        g.fillStyle(0x2d3436);
        g.fillCircle(W * 0.84 - 5, H * 0.82 + 12, 6);
        g.fillStyle(0x4a4a6a);
        g.fillCircle(W * 0.84 - 5, H * 0.82 + 12, 4);
        g.fillStyle(0x2d3436);
        g.fillCircle(W * 0.84 + 29, H * 0.82 + 12, 6);
        g.fillStyle(0x4a4a6a);
        g.fillCircle(W * 0.84 + 29, H * 0.82 + 12, 4);

        // ═══ BOOKSHELVES ═══
        const drawBookshelf = (bx: number, by: number, w: number) => {
          g.fillStyle(0x5a3e28);
          g.fillRect(bx, by, w, 65);
          for (let s = 0; s < 3; s++) {
            g.fillStyle(0x6d4c2e);
            g.fillRect(bx + 2, by + 2 + s * 22, w - 4, 20);
            g.fillStyle(0x4a3020);
            g.fillRect(bx + 2, by + s * 22, w - 4, 2);
            const colors = [
              0xd63031, 0x0984e3, 0xfdcb6e, 0x00b894, 0x6c5ce7, 0xe17055,
              0x74b9ff, 0xff6b81, 0xa29bfe,
            ];
            const bookCount = Math.floor((w - 8) / 6);
            for (let b = 0; b < bookCount; b++) {
              g.fillStyle(colors[b % colors.length]);
              const bh = 12 + (b % 3) * 2;
              g.fillRect(bx + 4 + b * 6, by + 4 + s * 22 + (16 - bh), 4, bh);
            }
          }
        };
        drawBookshelf(wallThickness + 2, wallThickness + 2, 55);
        drawBookshelf(wallThickness + 2, wallThickness + 72, 55);

        // ═══ PLANTS ═══
        const drawPlant = (px: number, py: number, size: number = 1) => {
          const sz = size;
          // Pot
          g.fillStyle(0x8b4513);
          g.fillRect(px - 7 * sz, py, 14 * sz, 12 * sz);
          g.fillStyle(0xa0522d);
          g.fillRect(px - 6 * sz, py + 1 * sz, 12 * sz, 10 * sz);
          g.fillStyle(0x3e2723);
          g.fillRect(px - 5 * sz, py, 10 * sz, 2 * sz);
          // Leaves
          g.fillStyle(0x27ae60);
          g.fillCircle(px, py - 6 * sz, 9 * sz);
          g.fillStyle(0x2ecc71);
          g.fillCircle(px - 5 * sz, py - 10 * sz, 6 * sz);
          g.fillCircle(px + 6 * sz, py - 8 * sz, 6 * sz);
          g.fillStyle(0x27ae60);
          g.fillCircle(px + 2 * sz, py - 12 * sz, 5 * sz);
        };
        drawPlant(45, H - 28, 1);
        drawPlant(W - 40, H - 28, 1);
        drawPlant(W * 0.76 - 15, H * 0.55 - 5, 0.8);
        drawPlant(wallThickness + 30, H * 0.55, 0.9);
        drawPlant(W - 35, H * 0.48, 0.8);

        // ═══ CLOCK ═══
        g.fillStyle(0xe8e8e0);
        g.fillCircle(W - 55, wallThickness + 15, 12);
        g.lineStyle(1, 0x636e72);
        g.strokeCircle(W - 55, wallThickness + 15, 12);
        g.lineStyle(2, 0x2d3436);
        g.lineBetween(W - 55, wallThickness + 15, W - 55, wallThickness + 7);
        g.lineStyle(1, 0x636e72);
        g.lineBetween(W - 55, wallThickness + 15, W - 49, wallThickness + 17);

        // ═══ LIGHT FIXTURES ═══
        const drawLight = (lx: number) => {
          g.fillStyle(0x636e72, 0.4);
          g.fillRect(lx - 1, wallThickness, 2, 8);
          g.fillStyle(0xffeaa7, 0.15);
          g.fillCircle(lx, wallThickness + 10, 15);
          g.fillStyle(0x636e72, 0.5);
          g.fillRect(lx - 8, wallThickness + 8, 16, 3);
        };
        drawLight(W * 0.35);
        drawLight(W * 0.65);

        // ═══ CHAIRS AROUND CONFERENCE TABLE ═══
        const agentCount = dataRef.current.agents.length;
        const seatAngles = this.getSeatAngles(agentCount);
        const cx = W * 0.5;
        const cy = H * 0.5;
        const chairRX = W * 0.18;
        const chairRY = H * 0.2;

        seatAngles.forEach((angle) => {
          const chairX = cx + chairRX * Math.cos(angle);
          const chairY = cy + chairRY * Math.sin(angle);
          // Chair
          g.fillStyle(0x2d3436);
          g.fillCircle(chairX, chairY + 18, 10);
          g.fillStyle(0x4a4a6a);
          g.fillCircle(chairX, chairY + 18, 8);
          // Chair back
          if (angle < 0) {
            // top chairs - back faces up
            g.fillStyle(0x3a3a5a);
            g.fillRect(chairX - 8, chairY + 25, 16, 5);
          } else {
            // bottom chairs - back faces down
            g.fillStyle(0x3a3a5a);
            g.fillRect(chairX - 8, chairY + 8, 16, 5);
          }
        });

        // ═══ SUBTLE GRID OVERLAY ═══
        g.lineStyle(1, 0xffffff, 0.015);
        for (let gx = 0; gx < W; gx += 30) {
          g.lineBetween(gx, 0, gx, H);
        }
        for (let gy = 0; gy < H; gy += 30) {
          g.lineBetween(0, gy, W, gy);
        }
      }

      getSeatAngles(count: number): number[] {
        // 5 agents: top-center, top-right, bottom-right, bottom-left, top-left
        if (count === 5) {
          return [
            -Math.PI / 2, // top-center
            -Math.PI / 5, // top-right
            Math.PI / 5, // bottom-right
            Math.PI - Math.PI / 5, // bottom-left
            Math.PI + Math.PI / 5, // top-left
          ];
        }
        const angles: number[] = [];
        for (let i = 0; i < count; i++) {
          angles.push((i / count) * Math.PI * 2 - Math.PI / 2);
        }
        return angles;
      }

      createAgents(W: number, H: number) {
        const cx = W * 0.5;
        const cy = H * 0.5;
        const seatRX = W * 0.18;
        const seatRY = H * 0.2;
        const speakRX = W * 0.1;
        const speakRY = H * 0.1;
        const angles = this.getSeatAngles(dataRef.current.agents.length);

        dataRef.current.agents.forEach((agent, i) => {
          const angle = angles[i];
          const seatX = cx + seatRX * Math.cos(angle);
          const seatY = cy + seatRY * Math.sin(angle);
          const speakX = cx + speakRX * Math.cos(angle);
          const speakY = cy + speakRY * Math.sin(angle);

          this.seatPositions.set(agent.id, { x: seatX, y: seatY });
          this.speakPositions.set(agent.id, { x: speakX, y: speakY });

          const container = this.add.container(seatX, seatY - 10);

          // Character graphic
          const charG = this.add.graphics();
          drawPixelChar(charG, -9, -20, hexToNum(agent.color), 3, i);
          container.add(charG);
          this.charGraphics.set(agent.id, charG);

          // Name label bg + text
          const label = this.add
            .text(0, 26, `${agent.emoji} ${agent.name}`, {
              fontSize: "10px",
              color: "#ffffff",
              backgroundColor: "#000000aa",
              padding: { x: 4, y: 2 },
              align: "center",
            })
            .setOrigin(0.5, 0);
          container.add(label);

          // Role label
          const roleLabel = this.add
            .text(0, 40, agent.role, {
              fontSize: "7px",
              color: agent.color,
              align: "center",
            })
            .setOrigin(0.5, 0);
          container.add(roleLabel);

          container.setDepth(10 + i);
          this.agentContainers.set(agent.id, container);

          // Idle animation
          const idleTimer = this.time.addEvent({
            delay: 3000 + Math.random() * 4000,
            loop: true,
            callback: () => {
              const d = dataRef.current;
              if (d.speakingId === agent.id || d.thinkingId === agent.id)
                return;
              // Subtle look-around: small X shift
              this.tweens.add({
                targets: container,
                x: seatX + (Math.random() - 0.5) * 4,
                duration: 600,
                yoyo: true,
                ease: "Sine.easeInOut",
              });
            },
          });
          this.idleTimers.set(agent.id, idleTimer);
        });
      }

      updateAgentStates() {
        const { speakingId, thinkingId, streamingText, agents } =
          dataRef.current;

        // Handle movement when speaking changes
        if (speakingId !== this.prevSpeakingId) {
          // Move previous speaker back to seat
          if (this.prevSpeakingId) {
            const prevContainer = this.agentContainers.get(
              this.prevSpeakingId,
            );
            const prevSeat = this.seatPositions.get(this.prevSpeakingId);
            if (prevContainer && prevSeat) {
              this.tweens.add({
                targets: prevContainer,
                x: prevSeat.x,
                y: prevSeat.y - 10,
                duration: 400,
                ease: "Back.easeOut",
              });
            }
          }

          // Move new speaker toward table
          if (speakingId) {
            const container = this.agentContainers.get(speakingId);
            const speakPos = this.speakPositions.get(speakingId);
            if (container && speakPos) {
              this.tweens.add({
                targets: container,
                x: speakPos.x,
                y: speakPos.y - 10,
                duration: 400,
                ease: "Back.easeOut",
              });
            }
          }

          this.prevSpeakingId = speakingId;
        }

        agents.forEach((agent) => {
          const container = this.agentContainers.get(agent.id);
          if (!container) return;

          const isSpeaking = speakingId === agent.id;
          const isThinking = thinkingId === agent.id;
          const isActive = isSpeaking || isThinking;

          container.setAlpha(isActive ? 1 : speakingId ? 0.45 : 0.7);

          // ── Speaking bubble ──
          if (isSpeaking && streamingText) {
            let bubble = this.bubbles.get(agent.id);
            if (!bubble) {
              bubble = this.add.container(container.x, container.y - 60);
              bubble.setDepth(100);

              const bg = this.add.graphics();
              bubble.add(bg);

              const text = this.add
                .text(0, 0, "", {
                  fontSize: "10px",
                  color: "#ffffff",
                  wordWrap: { width: 180 },
                  align: "left",
                  padding: { x: 8, y: 6 },
                  lineSpacing: 2,
                })
                .setOrigin(0.5, 1);
              bubble.add(text);

              this.bubbles.set(agent.id, bubble);
            }

            bubble.setPosition(container.x, container.y - 55);

            const text = bubble.getAt(1) as Phaser.GameObjects.Text;
            const truncated =
              streamingText.length > 60
                ? "..." + streamingText.slice(-57)
                : streamingText;
            text.setText(`${agent.emoji} ${truncated}`);

            const bg = bubble.getAt(0) as Phaser.GameObjects.Graphics;
            bg.clear();
            const tw = Math.min(text.width + 16, 210);
            const th = text.height + 12;
            // Bubble background
            bg.fillStyle(0x1a1a2a, 0.92);
            bg.fillRoundedRect(-tw / 2, -th, tw, th, 8);
            bg.lineStyle(2, hexToNum(agent.color), 0.6);
            bg.strokeRoundedRect(-tw / 2, -th, tw, th, 8);
            // Better tail
            bg.fillStyle(0x1a1a2a, 0.92);
            bg.fillTriangle(-6, 0, 6, 0, 0, 10);
            bg.lineStyle(2, hexToNum(agent.color), 0.6);
            bg.lineBetween(-6, 0, 0, 10);
            bg.lineBetween(6, 0, 0, 10);

            bubble.setVisible(true);

            // Bounce animation
            if (!this.bounceTimers.has(agent.id)) {
              const timer = this.time.addEvent({
                delay: 400,
                loop: true,
                callback: () => {
                  if (!container) return;
                  this.tweens.add({
                    targets: container,
                    y: container.y - 3,
                    duration: 200,
                    yoyo: true,
                    ease: "Sine.easeInOut",
                  });
                },
              });
              this.bounceTimers.set(agent.id, timer);
            }
          } else {
            const bubble = this.bubbles.get(agent.id);
            if (bubble) {
              bubble.setVisible(false);
            }
            const timer = this.bounceTimers.get(agent.id);
            if (timer) {
              timer.remove();
              this.bounceTimers.delete(agent.id);
            }
          }

          // ── Thinking: sway side to side ──
          if (isThinking) {
            let dots = this.thinkDots.get(agent.id);
            if (!dots) {
              dots = this.add.container(container.x, container.y - 40);
              dots.setDepth(100);

              const bg = this.add.graphics();
              bg.fillStyle(0x1a1a2a, 0.9);
              bg.fillRoundedRect(-22, -10, 44, 20, 10);
              bg.lineStyle(1.5, hexToNum(agent.color), 0.5);
              bg.strokeRoundedRect(-22, -10, 44, 20, 10);
              dots.add(bg);

              for (let d = 0; d < 3; d++) {
                const dot = this.add.circle(
                  -10 + d * 10,
                  0,
                  3,
                  hexToNum(agent.color),
                );
                dots.add(dot);
                this.tweens.add({
                  targets: dot,
                  y: -4,
                  alpha: 0.4,
                  duration: 450,
                  yoyo: true,
                  repeat: -1,
                  delay: d * 160,
                  ease: "Sine.easeInOut",
                });
              }

              this.thinkDots.set(agent.id, dots);

              // Side-to-side sway for thinking
              this.tweens.add({
                targets: container,
                x: container.x + 4,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
              });
            }
            dots.setPosition(container.x, container.y - 40);
            dots.setVisible(true);
          } else {
            const dots = this.thinkDots.get(agent.id);
            if (dots) {
              dots.setVisible(false);
              // Remove sway tween
              this.tweens.killTweensOf(container);
              // Reset to seat position if not speaking
              if (!isSpeaking) {
                const seat = this.seatPositions.get(agent.id);
                if (seat) {
                  container.x = seat.x;
                  container.y = seat.y - 10;
                }
              }
              this.thinkDots.delete(agent.id);
              dots.destroy();
            }
          }
        });
      }
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width,
      height,
      scene: [OfficeScene],
      pixelArt: true,
      backgroundColor: "#16213e",
      scale: { mode: Phaser.Scale.RESIZE },
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

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
