import { describe, it, expect } from "vitest";
import { autoMapColumns } from "@/lib/outbound-builder/csv-parser";

describe("CSV Parser — Column Mapping", () => {
  it("maps standard column names", () => {
    const headers = ["campaign_name", "channel", "sent", "open_rate", "reply_rate", "meetings_booked"];
    const mapping = autoMapColumns(headers);

    expect(mapping["campaign_name"]).toBe("campaign_name");
    expect(mapping["channel"]).toBe("channel");
    expect(mapping["sent"]).toBe("sent");
    expect(mapping["open_rate"]).toBe("open_rate");
    expect(mapping["reply_rate"]).toBe("reply_rate");
    expect(mapping["meetings_booked"]).toBe("meetings_booked");
  });

  it("maps common aliases", () => {
    const headers = ["campaign", "total_sent", "open rate", "reply rate", "meetings", "date"];
    const mapping = autoMapColumns(headers);

    expect(mapping["campaign"]).toBe("campaign_name");
    expect(mapping["total_sent"]).toBe("sent");
    expect(mapping["open rate"]).toBe("open_rate");
    expect(mapping["reply rate"]).toBe("reply_rate");
    expect(mapping["meetings"]).toBe("meetings_booked");
    expect(mapping["date"]).toBe("period");
  });

  it("maps 'name' to campaign_name", () => {
    const mapping = autoMapColumns(["name", "segment", "notes"]);
    expect(mapping["name"]).toBe("campaign_name");
    expect(mapping["segment"]).toBe("segment");
    expect(mapping["notes"]).toBe("notes");
  });

  it("ignores unrecognized columns", () => {
    const mapping = autoMapColumns(["foo_bar", "random_column", "campaign_name"]);
    expect(Object.keys(mapping)).toHaveLength(1);
    expect(mapping["campaign_name"]).toBe("campaign_name");
  });

  it("handles empty headers", () => {
    const mapping = autoMapColumns([]);
    expect(Object.keys(mapping)).toHaveLength(0);
  });

  it("normalizes special characters", () => {
    const mapping = autoMapColumns(["Campaign Name!", "Open Rate%"]);
    // After normalization: "campaign name" and "open rate"
    // "open rate" should map
    expect(mapping["open rate"]).toBe("open_rate");
  });
});
