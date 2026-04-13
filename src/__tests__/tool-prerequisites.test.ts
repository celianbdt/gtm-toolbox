import { describe, it, expect } from "vitest";
import { tools, getToolById, getToolsByStage } from "@/lib/tools/registry";

describe("Tool Registry", () => {
  describe("required fields", () => {
    it("all tools have required fields", () => {
      for (const tool of tools) {
        expect(tool.id, `tool missing id`).toBeTruthy();
        expect(tool.name, `${tool.id} missing name`).toBeTruthy();
        expect(tool.description, `${tool.id} missing description`).toBeTruthy();
        expect(tool.icon, `${tool.id} missing icon`).toBeTruthy();
        expect(tool.href, `${tool.id} missing href`).toBeTruthy();
        expect(tool.category, `${tool.id} missing category`).toBeTruthy();
        expect(tool.status, `${tool.id} missing status`).toBeTruthy();
      }
    });
  });

  describe("prerequisites reference valid tool IDs", () => {
    it("all prerequisite IDs exist in the registry", () => {
      const allIds = new Set(tools.map((t) => t.id));
      for (const tool of tools) {
        if (tool.prerequisites) {
          for (const prereqId of tool.prerequisites) {
            expect(allIds.has(prereqId), `${tool.id} has unknown prerequisite "${prereqId}"`).toBe(true);
          }
        }
      }
    });
  });

  describe("getToolById", () => {
    it("returns the correct tool for icp-audit", () => {
      const tool = getToolById("icp-audit");
      expect(tool).toBeDefined();
      expect(tool!.id).toBe("icp-audit");
      expect(tool!.name).toBe("ICP Audit");
    });

    it("returns undefined for nonexistent tool", () => {
      const tool = getToolById("nonexistent");
      expect(tool).toBeUndefined();
    });
  });

  describe("getToolsByStage", () => {
    it("returns discovery tools sorted by sequence_order", () => {
      const discoveryTools = getToolsByStage("discovery");
      expect(discoveryTools.length).toBeGreaterThan(0);
      for (let i = 1; i < discoveryTools.length; i++) {
        expect(
          (discoveryTools[i - 1].sequence_order ?? 99) <= (discoveryTools[i].sequence_order ?? 99),
          "discovery tools are not sorted by sequence_order"
        ).toBe(true);
      }
    });

    it("returns foundation tools", () => {
      const foundationTools = getToolsByStage("foundation");
      expect(foundationTools.length).toBeGreaterThan(0);
      for (const tool of foundationTools) {
        expect(tool.stage).toBe("foundation");
      }
    });
  });

  describe("prerequisite chains", () => {
    it("ICP Audit has no prerequisites (entry point)", () => {
      const tool = getToolById("icp-audit");
      expect(tool).toBeDefined();
      expect(tool!.prerequisites).toEqual([]);
    });

    it("Strategy Debate has icp-audit as prerequisite", () => {
      const tool = getToolById("strategy-debate");
      expect(tool).toBeDefined();
      expect(tool!.prerequisites).toEqual(["icp-audit"]);
    });

    it("Copywriting has messaging-lab as prerequisite", () => {
      const tool = getToolById("copywriting");
      expect(tool).toBeDefined();
      expect(tool!.prerequisites).toEqual(["messaging-lab"]);
    });
  });

  describe("sequence_order consistency", () => {
    it("each sequence_order is unique (except sandbox at 99)", () => {
      const nonSandbox = tools.filter((t) => t.id !== "sandbox");
      const orders = nonSandbox
        .map((t) => t.sequence_order)
        .filter((o): o is number => o !== undefined);
      const unique = new Set(orders);
      expect(unique.size).toBe(orders.length);
    });
  });

  describe("valid stages", () => {
    it("all stages are valid values or undefined", () => {
      const validStages = new Set(["discovery", "foundation", "optimization", "scaling", undefined]);
      for (const tool of tools) {
        expect(
          validStages.has(tool.stage),
          `${tool.id} has invalid stage "${tool.stage}"`
        ).toBe(true);
      }
    });
  });
});
