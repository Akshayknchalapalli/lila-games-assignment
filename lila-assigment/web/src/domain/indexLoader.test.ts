import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("first paint load shape (T055)", () => {
  it("App initial fetch is index.json (+ diagnostics), not every match file", () => {
    const app = readFileSync(resolve(__dirname, "../ui/App.tsx"), "utf8");
    const start = app.indexOf("useEffect(() => {");
    const end = app.indexOf("}, []);", start);
    const firstEffect = app.slice(start, end);
    expect(firstEffect).toContain('loadIndex("/data/index.json")');
    expect(firstEffect).not.toContain("loadMatchDetail");
    expect(app).toContain("loadMatchDetail(row.detailPath)");
    expect(app.includes("hyparquet") || app.includes("parquet-wasm")).toBe(false);
  });
});
