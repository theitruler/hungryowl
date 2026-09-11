"use client";
import { useEffect } from "react";
import { flushSync } from "react-dom";
import { z } from "zod";
import { DIETS, type Diet } from "@/lib/config";
type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
const filters = z.object({
  query: z.string().max(100),
  diet: z.enum(["all", ...DIETS]),
  sort: z.enum(["distance", "rating"]),
});
export function useExploreTools(
  setFilters: (input: { query: string; diet: Diet | "all"; sort: string }) => void,
) {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "set_food_discovery_filters",
            description:
              "Update the visible food search, dietary preference and sort. This stages filters; live results load separately and require user-granted location permission.",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", maxLength: 100 },
                diet: { type: "string", enum: ["all", ...DIETS] },
                sort: { type: "string", enum: ["distance", "rating"] },
              },
              required: ["query", "diet", "sort"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute(input) {
              const selected = filters.parse(input);
              flushSync(() => setFilters(selected));
              return { status: "filters_updated", ...selected };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* The experimental interface is optional in unsupported browsers. */
    }
    return () => lifecycle.abort();
  }, [setFilters]);
}
