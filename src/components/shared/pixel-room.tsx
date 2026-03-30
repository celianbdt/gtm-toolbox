"use client";

import { useEffect, useRef, useCallback } from "react";

type Agent = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
};

export type RoomTheme =
  | "strategy"
  | "analysis"
  | "workshop"
  | "planning"
  | "outbound"
  | "default";

export type PixelRoomProps = {
  agents: Agent[];
  speakingId: string | null;
  thinkingId: string | null;
  streamingText: string;
  theme?: RoomTheme;
  width?: number;
  height?: number;
  className?: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────

function hexToNum(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

// World constants
const WORLD_W = 480;
const WORLD_H = 360;

// Seat positions (up to 10 agents around conference table, extended)
const SEAT_POSITIONS = [
  { x: 240, y: 155 },
  { x: 310, y: 180 },
  { x: 310, y: 225 },
  { x: 170, y: 225 },
  { x: 170, y: 180 },
  { x: 240, y: 240 },
  { x: 350, y: 200 },
  { x: 130, y: 200 },
  { x: 280, y: 155 },
  { x: 200, y: 155 },
];

const SPEAK_POSITIONS = [
  { x: 240, y: 170 },
  { x: 290, y: 190 },
  { x: 290, y: 215 },
  { x: 190, y: 215 },
  { x: 190, y: 190 },
  { x: 240, y: 230 },
  { x: 330, y: 200 },
  { x: 150, y: 200 },
  { x: 265, y: 170 },
  { x: 215, y: 170 },
];

// 10 diverse character configs — shirt color comes from agent's color prop
const CHAR_CONFIGS = [
  { hair: 0x6b4423, hairHi: 0x8b6443, skin: 0xf0c8a0, skinSh: 0xd4a878 },
  { hair: 0x1a1a2e, hairHi: 0x2a2a4e, skin: 0xe8c098, skinSh: 0xcc9a70 },
  { hair: 0x8a7a6a, hairHi: 0xaa9a8a, skin: 0xf0c8a0, skinSh: 0xd4a878 },
  { hair: 0xd4a050, hairHi: 0xf0c070, skin: 0xf0c8a0, skinSh: 0xd4a878 },
  { hair: 0x2a1a0e, hairHi: 0x4a3a2e, skin: 0xd4a070, skinSh: 0xb88050 },
  { hair: 0x1a0a04, hairHi: 0x3a2a1e, skin: 0xa07040, skinSh: 0x885830 },
  { hair: 0xc45030, hairHi: 0xe47050, skin: 0xf0d0b0, skinSh: 0xd4b090 },
  { hair: 0x4a3a2a, hairHi: 0x6a5a4a, skin: 0xc89060, skinSh: 0xaa7848 },
  { hair: 0x0a0a0a, hairHi: 0x2a2a2a, skin: 0x8a6030, skinSh: 0x704820 },
  { hair: 0x8a5a30, hairHi: 0xaa7a50, skin: 0xd8b888, skinSh: 0xbc9c70 },
];

type ThemeColors = {
  floor1: number;
  floor2: number;
  plankSep: number;
  carpet: number;
  carpetBorder: number;
  wall: number;
  wallEdge: number;
  table: number;
  tableTop: number;
  tableFront: number;
  tableLegs: number;
  bgColor: string;
};

const THEME_COLORS: Record<RoomTheme, ThemeColors> = {
  strategy: {
    floor1: 0xb89868, floor2: 0xaa8858, plankSep: 0x987848,
    carpet: 0x3a2a50, carpetBorder: 0x4a3a60,
    wall: 0x2a2a3a, wallEdge: 0x3a3a4a,
    table: 0x8b6843, tableTop: 0x9b7853, tableFront: 0x6b4823, tableLegs: 0x5a3813,
    bgColor: "#2a2a3a",
  },
  analysis: {
    floor1: 0x8a8a8a, floor2: 0x7a7a7a, plankSep: 0x6a6a6a,
    carpet: 0x2a4060, carpetBorder: 0x3a5070,
    wall: 0x252530, wallEdge: 0x353540,
    table: 0x607080, tableTop: 0x708090, tableFront: 0x506070, tableLegs: 0x405060,
    bgColor: "#252530",
  },
  workshop: {
    floor1: 0xc8a878, floor2: 0xb89868, plankSep: 0xa88858,
    carpet: 0x604020, carpetBorder: 0x705030,
    wall: 0x352a20, wallEdge: 0x453a30,
    table: 0x9b7853, tableTop: 0xab8863, tableFront: 0x7b5833, tableLegs: 0x6b4823,
    bgColor: "#352a20",
  },
  planning: {
    floor1: 0x4a4a4a, floor2: 0x3a3a3a, plankSep: 0x2a2a2a,
    carpet: 0x204a30, carpetBorder: 0x305a40,
    wall: 0x1a2a1a, wallEdge: 0x2a3a2a,
    table: 0x4a5a4a, tableTop: 0x5a6a5a, tableFront: 0x3a4a3a, tableLegs: 0x2a3a2a,
    bgColor: "#1a2a1a",
  },
  outbound: {
    floor1: 0xd4b898, floor2: 0xc4a888, plankSep: 0xb49878,
    carpet: 0x204040, carpetBorder: 0x305050,
    wall: 0x2a3040, wallEdge: 0x3a4050,
    table: 0xa08060, tableTop: 0xb09070, tableFront: 0x806040, tableLegs: 0x705030,
    bgColor: "#2a3040",
  },
  default: {
    floor1: 0xb89868, floor2: 0xaa8858, plankSep: 0x987848,
    carpet: 0x3a2a50, carpetBorder: 0x4a3a60,
    wall: 0x2a2a3a, wallEdge: 0x3a3a4a,
    table: 0x8b6843, tableTop: 0x9b7853, tableFront: 0x6b4823, tableLegs: 0x5a3813,
    bgColor: "#2a2a3a",
  },
};

const BOOK_COLORS = [
  0xc44444, 0x4488aa, 0x44aa88, 0xaa8844, 0x8844aa, 0x888888, 0xaa4488,
];

// ── Character Drawing (16x32 native pixels) ────────────────────────────

function drawChar(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  oy: number,
  cfg: (typeof CHAR_CONFIGS)[number],
  shirtColor: number,
  shirtDkColor: number,
  walkFrame: number = 0,
) {
  g.clear();

  const { hair, hairHi, skin, skinSh } = cfg;
  const shirt = shirtColor;
  const shirtDk = shirtDkColor;
  const eyeWhite = 0xffffff;
  const eyeDark = 0x1a1a2a;
  const mouthColor = 0xc08060;
  const collarWhite = 0xf0f0f0;
  const belt = 0x3a3020;
  const pants = 0x2a2a3c;
  const shoes = 0x1a1a2a;

  const p = (x: number, y: number, c: number) => {
    g.fillStyle(c, 1);
    g.fillRect(ox + x, oy + y, 1, 1);
  };

  const row = (y: number, startX: number, colors: (number | null)[]) => {
    for (let i = 0; i < colors.length; i++) {
      const c = colors[i];
      if (c !== null) p(startX + i, y, c);
    }
  };

  // ── HAIR (rows 0-8) ──
  row(0, 5, [hair, hair, hair, hair, hair, hair]);
  row(1, 4, [hair, hair, hairHi, hair, hair, hairHi, hair, hair]);
  row(2, 3, [hair, hairHi, hair, hair, hairHi, hairHi, hair, hair, hairHi, hair]);
  row(3, 3, [hair, hair, hairHi, hairHi, hair, hair, hairHi, hairHi, hair, hair]);
  row(4, 2, [hair, hair, hairHi, hair, hair, hairHi, hairHi, hair, hair, hairHi, hair, hair]);
  p(2, 5, hair); p(3, 5, hair);
  p(12, 5, hair); p(13, 5, hair);
  p(2, 6, hair); p(3, 6, hair);
  p(12, 6, hair); p(13, 6, hair);
  p(2, 7, hair);
  p(13, 7, hair);

  // ── FACE (rows 5-11) ──
  row(5, 4, [skin, skin, skin, skin, skin, skin, skin, skin]);
  row(6, 4, [skin, skin, skin, skin, skin, skin, skin, skin]);
  p(4, 6, skinSh); p(11, 6, skinSh);
  row(7, 3, [skin, skin, eyeWhite, eyeDark, skin, skin, skin, eyeWhite, eyeDark, skin]);
  row(8, 3, [skin, skin, skin, skin, skin, skin, skin, skin, skin, skin]);
  p(4, 8, skinSh); p(11, 8, skinSh);
  row(9, 3, [skin, skin, skin, skin, mouthColor, mouthColor, skin, skin, skin, skin]);
  row(10, 4, [skin, skin, skin, skin, skin, skin, skin, skin]);
  row(11, 6, [skin, skin, skin, skin]);

  // ── SHIRT/BODY (rows 12-20) ──
  row(12, 3, [collarWhite, collarWhite, collarWhite, collarWhite, collarWhite, collarWhite, collarWhite, collarWhite, collarWhite, collarWhite]);
  row(13, 2, [shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt]);
  row(14, 2, [shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt]);
  row(15, 2, [shirt, shirt, shirt, shirtDk, shirt, shirt, shirtDk, shirt, shirtDk, shirt, shirt, shirt]);
  row(16, 3, [shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt]);
  row(17, 3, [shirt, shirt, shirtDk, shirtDk, shirtDk, shirtDk, shirt, shirt, shirt, shirt]);
  row(18, 3, [shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt, null]);
  row(19, 4, [shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt]);
  row(20, 4, [shirt, shirt, shirt, shirt, shirt, shirt, shirt, shirt]);

  // Arms skin (hands)
  p(2, 15, skin); p(13, 15, skin);
  p(2, 16, skin); p(13, 16, skin);

  // ── BELT (row 21) ──
  row(21, 4, [belt, belt, belt, belt, belt, belt, belt, belt]);

  // ── PANTS (rows 22-27) ──
  for (let r = 22; r <= 27; r++) {
    if (r < 24) {
      row(r, 4, [pants, pants, pants, pants, pants, pants, pants, pants]);
    } else {
      const leftX = 4 + (walkFrame === 1 ? -1 : 0);
      const rightX = 9 + (walkFrame === 3 ? 1 : 0);
      p(leftX, r, pants); p(leftX + 1, r, pants); p(leftX + 2, r, pants);
      p(rightX, r, pants); p(rightX + 1, r, pants); p(rightX + 2, r, pants);
    }
  }

  // ── SHOES (rows 28-29) ──
  const leftShoeX = 3 + (walkFrame === 1 ? -1 : 0);
  const rightShoeX = 9 + (walkFrame === 3 ? 1 : 0);
  for (let r = 28; r <= 29; r++) {
    row(r, leftShoeX, [shoes, shoes, shoes, shoes]);
    row(r, rightShoeX, [shoes, shoes, shoes, shoes]);
  }

  // ── SHADOW (rows 30-31) ──
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(ox + 8, oy + 31, 12, 4);
}

/** Darken a hex color by a factor (0-1). */
function darkenHex(hex: string, factor: number): number {
  const n = hexToNum(hex);
  const r = Math.floor(((n >> 16) & 0xff) * (1 - factor));
  const gr = Math.floor(((n >> 8) & 0xff) * (1 - factor));
  const b = Math.floor((n & 0xff) * (1 - factor));
  return (r << 16) | (gr << 8) | b;
}

// ── Component ──────────────────────────────────────────────────────────

export default function PixelRoom({
  agents,
  speakingId,
  thinkingId,
  streamingText,
  theme = "default",
  width = 1200,
  height = 900,
  className,
}: PixelRoomProps) {
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

  const colors = THEME_COLORS[theme];

  const initPhaser = useCallback(async () => {
    if (gameRef.current || !containerRef.current) return;

    const Phaser = (await import("phaser")).default;
    const dataRef = sceneDataRef;
    const tc = colors;

    class OfficeScene extends Phaser.Scene {
      private agentContainers: Map<string, Phaser.GameObjects.Container> = new Map();
      private bubbles: Map<string, Phaser.GameObjects.Container> = new Map();
      private thinkDots: Map<string, Phaser.GameObjects.Container> = new Map();
      private charGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
      private bounceTimers: Map<string, Phaser.Time.TimerEvent> = new Map();
      private seatPositions: Map<string, { x: number; y: number }> = new Map();
      private speakPositions: Map<string, { x: number; y: number }> = new Map();
      private idleTimers: Map<string, Phaser.Time.TimerEvent> = new Map();
      private prevSpeakingId: string | null = null;

      constructor() {
        super("OfficeScene");
      }

      create() {
        this.physics?.world?.setBounds(0, 0, WORLD_W, WORLD_H);
        this.cameras.main.setZoom(2.5);
        this.cameras.main.centerOn(240, 180);

        this.drawRoom();
        this.createAgents();

        this.time.addEvent({
          delay: 100,
          loop: true,
          callback: () => this.updateAgentStates(),
        });
      }

      drawRoom() {
        const g = this.add.graphics();
        g.setDepth(0);

        // Floor: Wood planks
        for (let y = 20; y < WORLD_H - 14; y += 6) {
          const color = Math.floor((y - 20) / 6) % 2 === 0 ? tc.floor1 : tc.floor2;
          g.fillStyle(color);
          g.fillRect(14, y, WORLD_W - 28, 6);
        }
        g.fillStyle(tc.plankSep, 0.3);
        for (let x = 14; x < WORLD_W - 14; x += 24) {
          g.fillRect(x, 20, 1, WORLD_H - 34);
        }

        // Carpet under table
        const carpetX = 240 - 80;
        const carpetY = 200 - 45;
        g.setDepth(1);
        g.fillStyle(tc.carpet);
        g.fillRect(carpetX, carpetY, 160, 90);
        g.lineStyle(1, tc.carpetBorder);
        g.strokeRect(carpetX, carpetY, 160, 90);

        // Walls
        const wallG = this.add.graphics();
        wallG.setDepth(0);

        wallG.fillStyle(tc.wall);
        wallG.fillRect(0, 0, WORLD_W, 20);
        wallG.fillStyle(tc.wallEdge);
        wallG.fillRect(0, 19, WORLD_W, 1);

        wallG.fillStyle(tc.wall);
        wallG.fillRect(0, 0, 14, WORLD_H);
        wallG.fillStyle(tc.wallEdge);
        wallG.fillRect(13, 0, 1, WORLD_H);

        wallG.fillStyle(tc.wall);
        wallG.fillRect(WORLD_W - 14, 0, 14, WORLD_H);
        wallG.fillStyle(tc.wallEdge);
        wallG.fillRect(WORLD_W - 14, 0, 1, WORLD_H);

        const doorLeft = (WORLD_W - 36) / 2;
        wallG.fillStyle(tc.wall);
        wallG.fillRect(0, WORLD_H - 14, doorLeft, 14);
        wallG.fillRect(doorLeft + 36, WORLD_H - 14, WORLD_W - doorLeft - 36, 14);
        wallG.fillStyle(tc.wallEdge);
        wallG.fillRect(0, WORLD_H - 14, doorLeft, 1);
        wallG.fillRect(doorLeft + 36, WORLD_H - 14, WORLD_W - doorLeft - 36, 1);

        // Furniture
        const fg = this.add.graphics();
        fg.setDepth(2);

        // Conference Table
        const tX = 195;
        const tY = 178;
        fg.fillStyle(tc.tableTop);
        fg.fillRoundedRect(tX + 2, tY + 2, 86, 41, 4);
        fg.fillStyle(tc.table);
        fg.fillRoundedRect(tX, tY, 90, 45, 5);
        fg.fillStyle(tc.tableTop);
        fg.fillRoundedRect(tX + 3, tY + 3, 84, 39, 3);
        fg.fillStyle(tc.tableFront);
        fg.fillRect(tX, tY + 45, 90, 6);
        fg.fillStyle(tc.tableLegs);
        fg.fillRect(tX + 2, tY + 45, 2, 4);
        fg.fillRect(tX + 86, tY + 45, 2, 4);
        fg.fillRect(tX + 2, tY + 42, 2, 4);
        fg.fillRect(tX + 86, tY + 42, 2, 4);
        // Props: papers
        fg.fillStyle(0xf0f0e8);
        fg.fillRect(tX + 15, tY + 8, 6, 8);
        fg.fillRect(tX + 35, tY + 5, 6, 8);
        // Laptop
        fg.fillStyle(0x2a2a2a);
        fg.fillRect(tX + 55, tY + 10, 14, 10);
        fg.fillStyle(0x4488cc);
        fg.fillRect(tX + 57, tY + 12, 10, 6);
        // Mugs
        fg.fillStyle(0xd63031);
        fg.fillRect(tX + 25, tY + 30, 4, 4);
        fg.fillStyle(0xdfe6e9);
        fg.fillRect(tX + 60, tY + 28, 4, 4);

        // Chairs at seat positions
        const chairG = this.add.graphics();
        chairG.setDepth(4);
        const numAgents = dataRef.current.agents.length;
        for (let i = 0; i < Math.min(numAgents, SEAT_POSITIONS.length); i++) {
          const sp = SEAT_POSITIONS[i];
          chairG.fillStyle(0x3a3a4a);
          chairG.fillRect(sp.x - 4, sp.y + 8, 8, 4);
          chairG.fillStyle(0x4a4a5a);
          chairG.fillRect(sp.x - 4, sp.y + 12, 8, 6);
        }

        // Workstation Desks (top-left)
        const deskG = this.add.graphics();
        deskG.setDepth(2);

        const drawDesk = (dx: number, dy: number) => {
          deskG.fillStyle(tc.table);
          deskG.fillRect(dx, dy, 50, 28);
          deskG.fillStyle(tc.tableFront);
          deskG.fillRect(dx, dy + 28, 50, 5);
          deskG.fillStyle(0x2a2a2a);
          deskG.fillRect(dx + 18, dy + 2, 14, 10);
          deskG.fillStyle(0x4488cc);
          deskG.fillRect(dx + 20, dy + 3, 10, 6);
          deskG.fillStyle(0x2a2a2a);
          deskG.fillRect(dx + 24, dy + 12, 2, 4);
          deskG.fillStyle(0xcccccc);
          deskG.fillRect(dx + 19, dy + 18, 12, 4);
          deskG.fillStyle(0xcccccc);
          deskG.fillRect(dx + 34, dy + 19, 3, 4);
          deskG.fillStyle(0x3a3a4a);
          deskG.fillRect(dx + 17, dy + 36, 8, 4);
          deskG.fillStyle(0x4a4a5a);
          deskG.fillRect(dx + 17, dy + 40, 8, 6);
        };

        drawDesk(55, 60);
        drawDesk(55, 140);

        // Bookshelves (right wall)
        const shelfG = this.add.graphics();
        shelfG.setDepth(3);

        const drawBookshelf = (bx: number, by: number) => {
          shelfG.fillStyle(0x7b5833);
          shelfG.fillRect(bx, by, 40, 55);
          for (let s = 0; s < 3; s++) {
            const sy = by + 2 + s * 18;
            shelfG.fillStyle(tc.table);
            shelfG.fillRect(bx + 2, sy + 15, 36, 2);
            let bookX = bx + 3;
            for (let b = 0; b < 8; b++) {
              const bh = 12 + (b % 3) * 3;
              const bw = 3 + (b % 2);
              shelfG.fillStyle(BOOK_COLORS[b % BOOK_COLORS.length]);
              shelfG.fillRect(bookX, sy + (15 - bh), bw, bh);
              bookX += bw + 0.5;
            }
          }
        };

        drawBookshelf(420, 40);
        drawBookshelf(420, 120);

        // Coffee Corner (bottom-right)
        const coffeeG = this.add.graphics();
        coffeeG.setDepth(2);

        coffeeG.fillStyle(0x7b5833);
        coffeeG.fillRect(370, 282, 60, 16);
        coffeeG.fillStyle(0x5b3813);
        coffeeG.fillRect(370, 298, 60, 4);
        coffeeG.fillStyle(0x2a2a2a);
        coffeeG.fillRect(375, 268, 12, 16);
        coffeeG.fillStyle(0xd63031);
        coffeeG.fillRect(378, 272, 2, 2);
        coffeeG.fillStyle(0x22c55e);
        coffeeG.fillRect(381, 272, 2, 2);
        coffeeG.fillStyle(0xdfe6e9);
        coffeeG.fillRect(392, 284, 3, 4);
        coffeeG.fillRect(397, 284, 3, 4);
        coffeeG.fillRect(402, 284, 3, 4);
        coffeeG.fillStyle(0x7b5833);
        coffeeG.fillRect(398, 310, 24, 24);
        coffeeG.fillStyle(tc.table);
        coffeeG.fillRect(400, 312, 20, 20);
        coffeeG.fillStyle(0x3a3a4a);
        coffeeG.fillRect(390, 316, 6, 4);
        coffeeG.fillStyle(0x4a4a5a);
        coffeeG.fillRect(390, 320, 6, 6);
        coffeeG.fillStyle(0x3a3a4a);
        coffeeG.fillRect(424, 316, 6, 4);
        coffeeG.fillStyle(0x4a4a5a);
        coffeeG.fillRect(424, 320, 6, 6);
        coffeeG.fillStyle(0x555555);
        coffeeG.fillRect(440, 280, 14, 24);
        coffeeG.fillStyle(0x3a7aba);
        coffeeG.fillRect(442, 282, 10, 14);
        coffeeG.fillStyle(0x333333);
        coffeeG.fillRect(442, 298, 4, 4);

        // Plants
        const plantG = this.add.graphics();
        plantG.setDepth(3);

        const drawPlant = (px: number, py: number) => {
          plantG.fillStyle(0xf0e8d8);
          plantG.fillRect(px - 4, py, 8, 6);
          plantG.fillStyle(0x1a6a2a);
          plantG.fillRect(px - 3, py - 6, 6, 6);
          plantG.fillStyle(0x27ae60);
          plantG.fillRect(px - 5, py - 10, 5, 6);
          plantG.fillRect(px + 1, py - 8, 5, 5);
          plantG.fillStyle(0x2ecc71);
          plantG.fillRect(px - 2, py - 12, 4, 4);
          plantG.fillRect(px + 2, py - 11, 3, 3);
        };

        drawPlant(26, 42);
        drawPlant(WORLD_W - 26, 42);
        drawPlant(26, WORLD_H - 28);
        drawPlant(WORLD_W - 26, WORLD_H - 28);

        // Whiteboard (top wall)
        const wbG = this.add.graphics();
        wbG.setDepth(2);
        const wbX = 240 - 35;
        const wbY = 2;
        wbG.fillStyle(0xf0f0f0);
        wbG.fillRect(wbX, wbY, 70, 28);
        wbG.lineStyle(1, 0x808080);
        wbG.strokeRect(wbX, wbY, 70, 28);
        wbG.lineStyle(1, 0x0984e3, 0.7);
        wbG.lineBetween(wbX + 4, wbY + 6, wbX + 40, wbY + 8);
        wbG.lineStyle(1, 0xd63031, 0.6);
        wbG.lineBetween(wbX + 4, wbY + 13, wbX + 45, wbY + 14);
        wbG.lineStyle(1, 0x00b894, 0.5);
        wbG.lineBetween(wbX + 4, wbY + 19, wbX + 35, wbY + 18);
        wbG.fillStyle(0xffeaa7, 0.9);
        wbG.fillRect(wbX + 50, wbY + 4, 4, 4);
        wbG.fillStyle(0x81ecec, 0.9);
        wbG.fillRect(wbX + 56, wbY + 8, 4, 4);

        // Clock
        const clkG = this.add.graphics();
        clkG.setDepth(2);
        clkG.fillStyle(0xf0f0f0);
        clkG.fillCircle(400, 10, 7);
        clkG.lineStyle(1, 0x808080);
        clkG.strokeCircle(400, 10, 7);
        clkG.lineStyle(1.5, 0x2d3436);
        clkG.lineBetween(400, 10, 400, 5);
        clkG.lineStyle(1, 0x636e72);
        clkG.lineBetween(400, 10, 404, 12);

        // Picture Frame
        const picG = this.add.graphics();
        picG.setDepth(2);
        picG.fillStyle(0x6b4823);
        picG.fillRect(WORLD_W - 13, 80, 12, 10);
        picG.fillStyle(0x44aa88);
        picG.fillRect(WORLD_W - 11, 82, 8, 3);
        picG.fillStyle(0x4488cc);
        picG.fillRect(WORLD_W - 11, 85, 8, 3);
      }

      createAgents() {
        const agentList = dataRef.current.agents;

        agentList.forEach((agent, i) => {
          const seatIdx = i % SEAT_POSITIONS.length;
          const seat = SEAT_POSITIONS[seatIdx];
          const speak = SPEAK_POSITIONS[seatIdx];

          this.seatPositions.set(agent.id, seat);
          this.speakPositions.set(agent.id, speak);

          const container = this.add.container(seat.x, seat.y);

          // Character graphic — shirt from agent color
          const charG = this.add.graphics();
          const cfg = CHAR_CONFIGS[i % CHAR_CONFIGS.length];
          const shirtColor = hexToNum(agent.color);
          const shirtDkColor = darkenHex(agent.color, 0.25);
          drawChar(charG, -8, -32, cfg, shirtColor, shirtDkColor, 0);
          container.add(charG);
          this.charGraphics.set(agent.id, charG);

          // Name label
          const label = this.add
            .text(0, 4, `${agent.emoji} ${agent.name}`, {
              fontSize: "7px",
              color: "#ffffff",
              backgroundColor: "#000000aa",
              padding: { x: 3, y: 1 },
              align: "center",
            })
            .setOrigin(0.5, 0);
          container.add(label);

          // Role label
          const roleLabel = this.add
            .text(0, 14, agent.role, {
              fontSize: "5px",
              color: agent.color,
              align: "center",
            })
            .setOrigin(0.5, 0);
          container.add(roleLabel);

          container.setDepth(10 + i);
          this.agentContainers.set(agent.id, container);

          // Idle animation
          const idleTimer = this.time.addEvent({
            delay: 4000 + Math.random() * 4000,
            loop: true,
            callback: () => {
              const d = dataRef.current;
              if (d.speakingId === agent.id || d.thinkingId === agent.id)
                return;
              this.tweens.add({
                targets: container,
                x: seat.x + (Math.random() - 0.5) * 3,
                duration: 600,
                yoyo: true,
                ease: "Sine.easeInOut",
              });
            },
          });
          this.idleTimers.set(agent.id, idleTimer);
        });
      }

      walkAgent(agentId: string, targetX: number, targetY: number) {
        const container = this.agentContainers.get(agentId);
        const charG = this.charGraphics.get(agentId);
        if (!container || !charG) return;

        const agentList = dataRef.current.agents;
        const idx = agentList.findIndex((a) => a.id === agentId);
        if (idx < 0) return;

        const cfg = CHAR_CONFIGS[idx % CHAR_CONFIGS.length];
        const agent = agentList[idx];
        const shirtColor = hexToNum(agent.color);
        const shirtDkColor = darkenHex(agent.color, 0.25);
        let walkFrame = 0;

        const walkTimer = this.time.addEvent({
          delay: 180,
          repeat: 4,
          callback: () => {
            walkFrame = (walkFrame + 1) % 4;
            drawChar(charG, -8, -32, cfg, shirtColor, shirtDkColor, walkFrame);
          },
        });

        this.tweens.add({
          targets: container,
          x: targetX,
          y: targetY,
          duration: 800,
          ease: "Quad.easeInOut",
          onComplete: () => {
            walkTimer.remove();
            drawChar(charG, -8, -32, cfg, shirtColor, shirtDkColor, 0);
          },
        });
      }

      updateAgentStates() {
        const { speakingId, thinkingId, streamingText, agents } =
          dataRef.current;

        if (speakingId !== this.prevSpeakingId) {
          if (this.prevSpeakingId) {
            const prevSeat = this.seatPositions.get(this.prevSpeakingId);
            const prevContainer = this.agentContainers.get(this.prevSpeakingId);
            if (prevSeat && prevContainer) {
              prevContainer.setDepth(
                10 + agents.findIndex((a) => a.id === this.prevSpeakingId),
              );
              this.walkAgent(this.prevSpeakingId, prevSeat.x, prevSeat.y);
            }
          }

          if (speakingId) {
            const speakPos = this.speakPositions.get(speakingId);
            const speakContainer = this.agentContainers.get(speakingId);
            if (speakPos && speakContainer) {
              speakContainer.setDepth(20);
              this.walkAgent(speakingId, speakPos.x, speakPos.y);
            }
          }

          this.prevSpeakingId = speakingId;
        }

        agents.forEach((agent, i) => {
          const container = this.agentContainers.get(agent.id);
          if (!container) return;

          const isSpeaking = speakingId === agent.id;
          const isThinking = thinkingId === agent.id;
          const isActive = isSpeaking || isThinking;

          container.setAlpha(isActive ? 1 : speakingId ? 0.45 : 0.7);

          // Speech Bubble
          if (isSpeaking && streamingText) {
            let bubble = this.bubbles.get(agent.id);
            if (!bubble) {
              bubble = this.add.container(container.x, container.y - 40);
              bubble.setDepth(50);

              const bg = this.add.graphics();
              bubble.add(bg);

              const text = this.add
                .text(0, 0, "", {
                  fontSize: "9px",
                  color: "#ffffff",
                  wordWrap: { width: 140 },
                  align: "left",
                  padding: { x: 6, y: 4 },
                  lineSpacing: 1,
                })
                .setOrigin(0.5, 1);
              bubble.add(text);

              this.bubbles.set(agent.id, bubble);
            }

            bubble.setPosition(container.x, container.y - 40);

            const text = bubble.getAt(1) as Phaser.GameObjects.Text;
            const truncated =
              streamingText.length > 45
                ? "..." + streamingText.slice(-42)
                : streamingText;
            text.setText(`${agent.emoji} ${truncated}`);

            const bg = bubble.getAt(0) as Phaser.GameObjects.Graphics;
            bg.clear();
            const tw = Math.min(text.width + 12, 150);
            const th = text.height + 8;
            bg.fillStyle(0x0a0a14, 0.95);
            bg.fillRoundedRect(-tw / 2, -th, tw, th, 6);
            bg.lineStyle(1.5, hexToNum(agent.color), 0.6);
            bg.strokeRoundedRect(-tw / 2, -th, tw, th, 6);
            bg.fillStyle(0x0a0a14, 0.95);
            bg.fillTriangle(-4, 0, 4, 0, 0, 8);

            bubble.setVisible(true);

            if (!this.bounceTimers.has(agent.id)) {
              const timer = this.time.addEvent({
                delay: 400,
                loop: true,
                callback: () => {
                  if (!container) return;
                  this.tweens.add({
                    targets: container,
                    y: container.y - 2,
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

          // Thinking Dots
          if (isThinking) {
            let dots = this.thinkDots.get(agent.id);
            if (!dots) {
              dots = this.add.container(container.x, container.y - 35);
              dots.setDepth(50);

              for (let d = 0; d < 3; d++) {
                const dot = this.add.circle(
                  -8 + d * 8,
                  0,
                  3,
                  hexToNum(agent.color),
                );
                dots.add(dot);
                this.tweens.add({
                  targets: dot,
                  y: -3,
                  alpha: 0.4,
                  duration: 450,
                  yoyo: true,
                  repeat: -1,
                  delay: d * 160,
                  ease: "Sine.easeInOut",
                });
              }

              this.thinkDots.set(agent.id, dots);

              this.tweens.add({
                targets: container,
                x: container.x + 3,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
              });
            }
            dots.setPosition(container.x, container.y - 35);
            dots.setVisible(true);
          } else {
            const dots = this.thinkDots.get(agent.id);
            if (dots) {
              dots.setVisible(false);
              this.tweens.killTweensOf(container);
              if (!isSpeaking) {
                const seat = this.seatPositions.get(agent.id);
                if (seat) {
                  container.x = seat.x;
                  container.y = seat.y;
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
      backgroundColor: tc.bgColor,
      scale: { mode: Phaser.Scale.FIT },
      input: { keyboard: { capture: [] } },
    });

    gameRef.current = game;
  }, [width, height, colors]);

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
