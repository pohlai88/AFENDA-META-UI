import { describe, expect, it } from "vitest";
import * as MetaListV2Module from "../MetaListV2";

describe("MetaListV2 renderer contract", () => {
  it("exports MetaListV2 as a callable component", () => {
    expect(typeof MetaListV2Module.MetaListV2).toBe("function");
  });
});
