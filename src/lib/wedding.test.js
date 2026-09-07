import { describe, expect, it } from "vitest";
import {
  filterResponses,
  mapEntourageRow,
  summarizeResponses,
} from "./wedding";

describe("wedding helpers", () => {
  it("maps a couple invitation to a friendly short name", () => {
    expect(
      mapEntourageRow({
        entourage_id: "1",
        full_name: "Mr. & Mrs. Charlie Perez",
        role: "Candle Sponsor",
        response_status: "pending",
      }),
    ).toMatchObject({ shortName: "Charlie", category: "candle" });
  });

  it("counts responses separately from invited people", () => {
    const summary = summarizeResponses([
      { response: "accepted", party_size: 2 },
      { response: "declined", party_size: 1 },
      { response: "pending", party_size: 2 },
    ]);
    expect(summary).toEqual({
      totalResponses: 2,
      acceptedPeople: 2,
      declinedPeople: 1,
      awaitingPeople: 2,
    });
  });

  it("filters responded records by name", () => {
    const rows = [
      { person_name: "Mary Grace", response: "accepted" },
      { person_name: "Noel Rashed", response: "pending" },
    ];
    expect(filterResponses(rows, "responded", "mary")).toEqual([rows[0]]);
  });
});
