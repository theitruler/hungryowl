import { describe, expect, it } from "vitest";
import { errorDiagnostics } from "../src/lib/error-diagnostics";

describe("safe server error diagnostics", () => {
  it("preserves filesystem failure codes without exposing paths or messages", () => {
    const error = Object.assign(new Error("write failed at private/path"), {
      code: "EROFS",
      path: "private/path",
    });
    expect(errorDiagnostics(error)).toEqual([{ type: "Error", code: "EROFS" }]);
  });

  it("finds wrapped database codes without exposing SQL or credentials", () => {
    const cause = Object.assign(new Error("password=secret"), { code: "42501" });
    const error = new Error("insert into photos (private data)", { cause });
    expect(errorDiagnostics(error)).toEqual([
      { type: "Error" },
      { type: "Error", code: "42501" },
    ]);
  });

  it("handles cycles, primitive errors, and unexpected metadata safely", () => {
    const cyclic = { name: "Error", code: "postgres://secret", cause: {} };
    cyclic.cause = cyclic;
    expect(errorDiagnostics(cyclic)).toEqual([{ type: "Error" }]);
    expect(errorDiagnostics("password=secret")).toEqual([{ type: "UnknownError" }]);
    expect(errorDiagnostics({ name: "Error with private data" })).toEqual([
      { type: "UnknownError" },
    ]);
  });
});
