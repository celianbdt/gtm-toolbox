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

// ── Helpers ─────────────────────────────────────────────────────────────

function hexToNum(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

const HAIR_COLORS = [0x3a2a1a, 0x1a1a2a, 0xdaa520, 0x808080, 0x8b2500];

const BOOK_COLORS = [
  0xc44444, 0x4488aa, 0x44aa88, 0xaa8844, 0x8844aa, 0x888888, 0xaa4488,
];

// World constants
const WORLD_W = 640;
const WORLD_H = 480;

// Seat positions (5 agents around conference table)
const SEAT_POSITIONS = [
  { x: 320, y: 185 }, // Agent 0 (top)
  { x: 400, y: 215 }, // Agent 1 (right-top)
  { x: 400, y: 265 }, // Agent 2 (right-bottom)
  { x: 240, y: 265 }, // Agent 3 (left-bottom)
  { x: 240, y: 215 }, // Agent 4 (left-top)
];

const SPEAK_POSITIONS = [
  { x: 320, y: 200 }, // Agent 0
  { x: 375, y: 225 }, // Agent 1
  { x: 375, y: 255 }, // Agent 2
  { x: 265, y: 255 }, // Agent 3
  { x: 265, y: 225 }, // Agent 4
];

// ── Character Drawing (12x20 native pixels) ────────────────────────────

function drawCharacter(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  oy: number,
  shirtColor: number,
  agentIndex: number,
  walkFrame: number = 0,
) {
  g.clear();

  const hair = HAIR_COLORS[agentIndex % HAIR_COLORS.length];
  const skin = 0xf0c8a0;
  const skinDark = 0xd4a878;
  const eyeWhite = 0xffffff;
  const eyePupil = 0x1a1a2a;
  const brow = 0x2a2a2a;
  const mouth = 0xc4907a;
  const white = 0xffffff;
  const belt = 0x1a1a1a;
  const pants = 0x1e1e30;
  const shoes = 0x2a1a10;

  const p = (x: number, y: number, w: number, h: number, c: number) => {
    g.fillStyle(c);
    g.fillRect(ox + x, oy + y, w, h);
  };

  // Row 0-2: HAIR
  // Row 0
  p(2, 0, 8, 1, hair);
  // Row 1
  p(1, 1, 10, 1, hair);
  // Row 2
  p(1, 2, 10, 1, hair);

  // Row 3-5: FACE
  // Row 3 - forehead + eyebrows
  p(0, 3, 1, 1, hair); // left hair side
  p(11, 3, 1, 1, hair); // right hair side
  p(1, 3, 10, 1, skin);
  p(3, 3, 2, 1, brow); // left eyebrow
  p(7, 3, 2, 1, brow); // right eyebrow

  // Row 4 - eyes
  p(0, 4, 1, 1, hair);
  p(11, 4, 1, 1, hair);
  p(1, 4, 10, 1, skin);
  // Left eye: sclera + pupil
  p(3, 4, 1, 1, eyeWhite);
  p(4, 4, 1, 1, eyePupil);
  // Right eye: sclera + pupil
  p(7, 4, 1, 1, eyeWhite);
  p(8, 4, 1, 1, eyePupil);

  // Row 5 - mouth
  p(1, 5, 10, 1, skin);
  p(5, 5, 2, 1, mouth);

  // Row 6: NECK
  p(4, 6, 4, 1, skin);

  // Row 7-11: SHIRT / TORSO
  // Row 7 - collar
  p(2, 7, 8, 1, shirtColor);
  p(5, 7, 2, 1, white); // collar

  // Row 8
  p(1, 8, 10, 1, shirtColor);
  p(5, 8, 1, 1, white); // button line center

  // Row 9
  p(1, 9, 10, 1, shirtColor);
  p(5, 9, 1, 1, white);

  // Row 10
  p(1, 10, 10, 1, shirtColor);
  p(5, 10, 1, 1, white);

  // Row 11 - bottom of shirt
  p(2, 11, 8, 1, shirtColor);

  // Arms (slight protrusion)
  p(0, 8, 1, 3, shirtColor);
  p(11, 8, 1, 3, shirtColor);
  // Hands
  p(0, 11, 1, 1, skin);
  p(11, 11, 1, 1, skin);

  // Row 12: BELT
  p(3, 12, 6, 1, belt);

  // Row 13-16: PANTS (2 separate legs)
  if (walkFrame === 0) {
    // Standing
    p(3, 13, 2, 4, pants);
    p(7, 13, 2, 4, pants);
  } else if (walkFrame === 1) {
    // Left forward
    p(2, 13, 2, 4, pants);
    p(7, 13, 2, 4, pants);
  } else if (walkFrame === 3) {
    // Right forward
    p(3, 13, 2, 4, pants);
    p(8, 13, 2, 4, pants);
  } else {
    // Frame 2 = standing
    p(3, 13, 2, 4, pants);
    p(7, 13, 2, 4, pants);
  }

  // Row 17-18: SHOES
  if (walkFrame === 0 || walkFrame === 2) {
    p(2, 17, 3, 2, shoes);
    p(7, 17, 3, 2, shoes);
  } else if (walkFrame === 1) {
    p(1, 17, 3, 2, shoes);
    p(7, 17, 3, 2, shoes);
  } else {
    p(2, 17, 3, 2, shoes);
    p(8, 17, 3, 2, shoes);
  }

  // Row 19: SHADOW
  g.fillStyle(0x000000, 0.15);
  g.fillEllipse(ox + 6, oy + 19.5, 10, 2);
}

// ── Component ──────────────────────────────────────────────────────────

export default function PhaserRoom({
  agents,
  speakingId,
  thinkingId,
  streamingText,
  width = 1280,
  height = 960,
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
        // Set world bounds
        this.physics?.world?.setBounds(0, 0, WORLD_W, WORLD_H);

        // Camera zoom
        this.cameras.main.setZoom(2.0);
        this.cameras.main.centerOn(WORLD_W / 2, WORLD_H / 2);

        this.drawRoom();
        this.createAgents();

        this.time.addEvent({
          delay: 100,
          loop: true,
          callback: () => this.updateAgentStates(),
        });
      }

      // ── Room Drawing ──────────────────────────────────────────────

      drawRoom() {
        const g = this.add.graphics();
        g.setDepth(0);

        // ═══ FLOOR: Wood planks ═══
        for (let y = 0; y < WORLD_H; y += 8) {
          const color = y % 16 === 0 ? 0x3a3020 : 0x342a1c;
          g.fillStyle(color);
          g.fillRect(0, y, WORLD_W, 8);
        }
        // Vertical plank lines
        g.lineStyle(1, 0x2a2018, 0.15);
        for (let x = 0; x < WORLD_W; x += 32) {
          g.lineBetween(x, 0, x, WORLD_H);
        }

        // ═══ CARPET under table ═══
        const carpetX = (WORLD_W - 240) / 2;
        const carpetY = (WORLD_H - 120) / 2;
        g.fillStyle(0x2a2540);
        g.fillRect(carpetX, carpetY, 240, 120);
        g.lineStyle(1, 0x4a3a6a);
        g.strokeRect(carpetX, carpetY, 240, 120);

        // ═══ WALLS (16px thick) ═══
        const wallColor = 0x1e1e2e;
        const trimColor = 0x3a3a4a;

        // Top wall
        g.fillStyle(wallColor);
        g.fillRect(0, 0, WORLD_W, 16);
        g.fillStyle(trimColor);
        g.fillRect(0, 14, WORLD_W, 2);

        // Left wall
        g.fillStyle(wallColor);
        g.fillRect(0, 0, 16, WORLD_H);
        g.fillStyle(trimColor);
        g.fillRect(14, 0, 2, WORLD_H);

        // Right wall
        g.fillStyle(wallColor);
        g.fillRect(WORLD_W - 16, 0, 16, WORLD_H);
        g.fillStyle(trimColor);
        g.fillRect(WORLD_W - 16, 0, 2, WORLD_H);

        // Bottom wall with door gap
        g.fillStyle(wallColor);
        const doorLeft = (WORLD_W - 40) / 2;
        g.fillRect(0, WORLD_H - 12, doorLeft, 12);
        g.fillRect(doorLeft + 40, WORLD_H - 12, WORLD_W - doorLeft - 40, 12);
        g.fillStyle(trimColor);
        g.fillRect(0, WORLD_H - 12, doorLeft, 2);
        g.fillRect(doorLeft + 40, WORLD_H - 12, WORLD_W - doorLeft - 40, 2);

        // ═══ FURNITURE ═══
        const fg = this.add.graphics();
        fg.setDepth(1);

        // ── Conference Table (center) ──
        const tX = 320 - 50;
        const tY = 240 - 25;
        // Edge
        fg.fillStyle(0x4a3020);
        fg.fillRoundedRect(tX - 1, tY - 1, 102, 52, 6);
        // Body
        fg.fillStyle(0x6d4c2e);
        fg.fillRoundedRect(tX, tY, 100, 50, 5);
        // Top highlight
        fg.fillStyle(0x7d5c3e);
        fg.fillRoundedRect(tX + 2, tY + 2, 96, 46, 4);

        // Props on table
        // 3 papers
        fg.fillStyle(0xe8e8d8, 0.7);
        fg.fillRect(295, 232, 6, 8);
        fg.fillRect(310, 228, 6, 8);
        fg.fillRect(340, 234, 6, 8);
        // Laptop
        fg.fillStyle(0x2d3436);
        fg.fillRect(350, 236, 12, 8);
        fg.fillStyle(0x4488cc, 0.5);
        fg.fillRect(351, 237, 10, 6);
        // Coffee mugs
        fg.fillStyle(0xd63031);
        fg.fillCircle(300, 250, 3);
        fg.fillStyle(0x1a1a1a);
        fg.fillCircle(300, 250, 1.5);
        fg.fillStyle(0xdfe6e9);
        fg.fillCircle(330, 248, 3);
        fg.fillStyle(0x4a3020);
        fg.fillCircle(330, 248, 1.5);
        // Pen
        fg.fillStyle(0x0984e3);
        fg.fillRect(322, 255, 1, 6);

        // ── Chairs at seat positions ──
        const chairG = this.add.graphics();
        chairG.setDepth(4);
        for (let i = 0; i < 5; i++) {
          const sp = SEAT_POSITIONS[i];
          chairG.fillStyle(0x3a3a4a);
          chairG.fillCircle(sp.x, sp.y + 12, 7);
        }

        // ── Workstation Desks (3 along top wall) ──
        const deskG = this.add.graphics();
        deskG.setDepth(2);
        const deskPositions = [120, 280, 440];

        for (const dx of deskPositions) {
          const dy = 40;
          // Desk surface
          deskG.fillStyle(0x5a3e28);
          deskG.fillRect(dx - 20, dy - 12, 40, 24);
          deskG.fillStyle(0x6d4c2e);
          deskG.fillRect(dx - 19, dy - 11, 38, 22);

          // Monitor
          deskG.fillStyle(0x2d3436);
          deskG.fillRect(dx - 9, dy - 10, 18, 12);
          deskG.fillStyle(0x4488cc, 0.4);
          deskG.fillRect(dx - 7, dy - 8, 14, 8);
          // Stand
          deskG.fillStyle(0x2d3436);
          deskG.fillRect(dx - 2, dy + 2, 4, 3);
          deskG.fillRect(dx - 5, dy + 5, 10, 2);

          // Keyboard
          deskG.fillStyle(0x3a3a3a);
          deskG.fillRect(dx - 5, dy + 8, 10, 3);
          // Mouse
          deskG.fillStyle(0x3a3a3a);
          deskG.fillRect(dx + 8, dy + 8, 4, 3);

          // Chair in front
          deskG.fillStyle(0x2d3436);
          deskG.fillCircle(dx, dy + 20, 7);
          deskG.fillStyle(0x4a4a6a);
          deskG.fillCircle(dx, dy + 20, 5);
        }

        // ── Bookshelves ──
        const shelfG = this.add.graphics();
        shelfG.setDepth(3);

        const drawBookshelf = (bx: number, by: number) => {
          // Frame
          shelfG.fillStyle(0x5a3e28);
          shelfG.fillRect(bx - 15, by - 25, 30, 50);

          for (let s = 0; s < 3; s++) {
            const shelfY = by - 25 + 2 + s * 16;
            // Shelf board
            shelfG.fillStyle(0x6d4c2e);
            shelfG.fillRect(bx - 13, shelfY + 14, 26, 2);
            // Books
            let bookX = bx - 12;
            for (let b = 0; b < 7; b++) {
              const bh = 10 + (b % 3) * 2;
              shelfG.fillStyle(BOOK_COLORS[b % BOOK_COLORS.length]);
              shelfG.fillRect(bookX, shelfY + (14 - bh), 3, bh);
              bookX += 3.5;
            }
          }
        };

        // Left wall shelves
        drawBookshelf(24 + 15, 60);
        drawBookshelf(24 + 15, 140);
        // Right wall shelves
        drawBookshelf(590 + 15, 60);
        drawBookshelf(590 + 15, 140);

        // ── Coffee Area (bottom-right) ──
        const coffeeG = this.add.graphics();
        coffeeG.setDepth(2);

        // Counter
        coffeeG.fillStyle(0x4a4a4a);
        coffeeG.fillRect(515, 392, 50, 16);
        coffeeG.fillStyle(0x5a5a5a);
        coffeeG.fillRect(516, 393, 48, 14);
        // Coffee machine
        coffeeG.fillStyle(0x2d3436);
        coffeeG.fillRect(518, 374, 14, 18);
        coffeeG.fillStyle(0xd63031);
        coffeeG.fillCircle(525, 380, 2);
        // Cups on counter
        coffeeG.fillStyle(0xdfe6e9);
        coffeeG.fillRect(536, 394, 4, 5);
        coffeeG.fillRect(542, 394, 4, 5);
        coffeeG.fillRect(548, 394, 4, 5);
        // Small round table
        coffeeG.fillStyle(0x5a4530);
        coffeeG.fillCircle(560, 440, 12);
        coffeeG.fillStyle(0x6d5540);
        coffeeG.fillCircle(560, 440, 10);
        // 2 chairs
        coffeeG.fillStyle(0x2d3436);
        coffeeG.fillCircle(545, 440, 5);
        coffeeG.fillStyle(0x4a4a6a);
        coffeeG.fillCircle(545, 440, 3.5);
        coffeeG.fillStyle(0x2d3436);
        coffeeG.fillCircle(575, 440, 5);
        coffeeG.fillStyle(0x4a4a6a);
        coffeeG.fillCircle(575, 440, 3.5);

        // ── Plants ──
        const plantG = this.add.graphics();
        plantG.setDepth(3);

        const drawPlant = (px: number, py: number) => {
          // Pot (trapezoid approximation)
          plantG.fillStyle(0x8b4513);
          plantG.fillRect(px - 5, py, 10, 8);
          plantG.fillStyle(0xa0522d);
          plantG.fillRect(px - 4, py + 1, 8, 6);
          // Soil
          plantG.fillStyle(0x3e2723);
          plantG.fillRect(px - 4, py, 8, 2);
          // Leaves
          plantG.fillStyle(0x27ae60);
          plantG.fillCircle(px, py - 4, 6);
          plantG.fillStyle(0x2ecc71);
          plantG.fillCircle(px - 4, py - 8, 4);
          plantG.fillCircle(px + 4, py - 6, 4);
          plantG.fillStyle(0x27ae60);
          plantG.fillCircle(px + 1, py - 10, 3);
        };

        drawPlant(40, 420);
        drawPlant(600, 420);
        drawPlant(50, 300);
        drawPlant(590, 300);

        // ── Whiteboard (top wall) ──
        const wbG = this.add.graphics();
        wbG.setDepth(2);
        const wbX = 320 - 40;
        const wbY = 4;
        // White fill
        wbG.fillStyle(0xdfe6e9);
        wbG.fillRect(wbX, wbY, 80, 36);
        // Gray frame
        wbG.lineStyle(1, 0x636e72);
        wbG.strokeRect(wbX, wbY, 80, 36);
        // Marker scribbles
        wbG.lineStyle(1, 0x0984e3, 0.6);
        wbG.lineBetween(wbX + 5, wbY + 8, wbX + 45, wbY + 10);
        wbG.lineStyle(1, 0xd63031, 0.5);
        wbG.lineBetween(wbX + 5, wbY + 16, wbX + 50, wbY + 18);
        wbG.lineStyle(1, 0x00b894, 0.4);
        wbG.lineBetween(wbX + 5, wbY + 24, wbX + 40, wbY + 22);
        // Sticky notes
        wbG.fillStyle(0xffeaa7, 0.8);
        wbG.fillRect(wbX + 56, wbY + 6, 8, 8);
        wbG.fillStyle(0x81ecec, 0.8);
        wbG.fillRect(wbX + 66, wbY + 10, 8, 8);
        // Marker tray
        wbG.fillStyle(0x636e72);
        wbG.fillRect(wbX + 20, wbY + 36, 40, 3);
        wbG.fillStyle(0xd63031);
        wbG.fillCircle(wbX + 28, wbY + 37, 1.5);
        wbG.fillStyle(0x0984e3);
        wbG.fillCircle(wbX + 35, wbY + 37, 1.5);
        wbG.fillStyle(0x00b894);
        wbG.fillCircle(wbX + 42, wbY + 37, 1.5);

        // ── Clock ──
        const clkG = this.add.graphics();
        clkG.setDepth(2);
        clkG.fillStyle(0xe8e8e0);
        clkG.fillCircle(500, 24, 8);
        clkG.lineStyle(1, 0x636e72);
        clkG.strokeCircle(500, 24, 8);
        clkG.lineStyle(1.5, 0x2d3436);
        clkG.lineBetween(500, 24, 500, 18); // hour hand
        clkG.lineStyle(1, 0x636e72);
        clkG.lineBetween(500, 24, 505, 26); // minute hand

        // ── Picture frame ──
        const picG = this.add.graphics();
        picG.setDepth(2);
        picG.fillStyle(0x5a3e28);
        picG.fillRect(152, 18, 16, 12);
        picG.fillStyle(0x44aa88);
        picG.fillRect(154, 20, 12, 4); // landscape top (green)
        picG.fillStyle(0x4488cc);
        picG.fillRect(154, 24, 12, 4); // landscape bottom (blue)
      }

      // ── Agent Creation ────────────────────────────────────────────

      createAgents() {
        const agentList = dataRef.current.agents;

        agentList.forEach((agent, i) => {
          const seatIdx = i % SEAT_POSITIONS.length;
          const seat = SEAT_POSITIONS[seatIdx];
          const speak = SPEAK_POSITIONS[seatIdx];

          this.seatPositions.set(agent.id, seat);
          this.speakPositions.set(agent.id, speak);

          const container = this.add.container(seat.x, seat.y);

          // Character graphic
          const charG = this.add.graphics();
          drawCharacter(charG, -6, -20, hexToNum(agent.color), i, 0);
          container.add(charG);
          this.charGraphics.set(agent.id, charG);

          // Name label
          const label = this.add
            .text(0, 6, `${agent.emoji} ${agent.name}`, {
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
            .text(0, 16, agent.role, {
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

      // ── Walking animation ─────────────────────────────────────────

      walkAgent(agentId: string, targetX: number, targetY: number) {
        const container = this.agentContainers.get(agentId);
        const charG = this.charGraphics.get(agentId);
        if (!container || !charG) return;

        const agentList = dataRef.current.agents;
        const idx = agentList.findIndex((a) => a.id === agentId);
        if (idx < 0) return;
        const agent = agentList[idx];

        let walkFrame = 0;

        // Walk frame animation
        const walkTimer = this.time.addEvent({
          delay: 200,
          repeat: 3,
          callback: () => {
            walkFrame = (walkFrame + 1) % 4;
            drawCharacter(charG, -6, -20, hexToNum(agent.color), idx, walkFrame);
          },
        });

        // Position tween
        this.tweens.add({
          targets: container,
          x: targetX,
          y: targetY,
          duration: 800,
          ease: "Sine.easeInOut",
          onComplete: () => {
            walkTimer.remove();
            // Reset to standing
            drawCharacter(charG, -6, -20, hexToNum(agent.color), idx, 0);
          },
        });
      }

      // ── State Updates ─────────────────────────────────────────────

      updateAgentStates() {
        const { speakingId, thinkingId, streamingText, agents } =
          dataRef.current;

        // Handle movement when speaking changes
        if (speakingId !== this.prevSpeakingId) {
          // Move previous speaker back to seat
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

          // Move new speaker toward table
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

          // ── Speech Bubble ──
          if (isSpeaking && streamingText) {
            let bubble = this.bubbles.get(agent.id);
            if (!bubble) {
              bubble = this.add.container(container.x, container.y - 30);
              bubble.setDepth(50);

              const bg = this.add.graphics();
              bubble.add(bg);

              const text = this.add
                .text(0, 0, "", {
                  fontSize: "9px",
                  color: "#ffffff",
                  wordWrap: { width: 150 },
                  align: "left",
                  padding: { x: 6, y: 4 },
                  lineSpacing: 1,
                })
                .setOrigin(0.5, 1);
              bubble.add(text);

              this.bubbles.set(agent.id, bubble);
            }

            bubble.setPosition(container.x, container.y - 30);

            const text = bubble.getAt(1) as Phaser.GameObjects.Text;
            const truncated =
              streamingText.length > 50
                ? "..." + streamingText.slice(-47)
                : streamingText;
            text.setText(`${agent.emoji} ${truncated}`);

            const bg = bubble.getAt(0) as Phaser.GameObjects.Graphics;
            bg.clear();
            const tw = Math.min(text.width + 12, 160);
            const th = text.height + 8;
            // Background
            bg.fillStyle(0x0a0a14, 0.95);
            bg.fillRoundedRect(-tw / 2, -th, tw, th, 6);
            bg.lineStyle(1.5, hexToNum(agent.color), 0.6);
            bg.strokeRoundedRect(-tw / 2, -th, tw, th, 6);
            // Tail
            bg.fillStyle(0x0a0a14, 0.95);
            bg.fillTriangle(-4, 0, 4, 0, 0, 8);

            bubble.setVisible(true);

            // Bounce animation while speaking
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

          // ── Thinking Dots ──
          if (isThinking) {
            let dots = this.thinkDots.get(agent.id);
            if (!dots) {
              dots = this.add.container(container.x, container.y - 25);
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

              // Side sway
              this.tweens.add({
                targets: container,
                x: container.x + 3,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
              });
            }
            dots.setPosition(container.x, container.y - 25);
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
      backgroundColor: "#16213e",
      scale: { mode: Phaser.Scale.FIT },
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
