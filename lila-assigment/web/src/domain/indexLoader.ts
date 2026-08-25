import type { LoadReport, MatchDetail, MatchIndex } from "./types";

export async function loadIndex(url = "/data/index.json"): Promise<MatchIndex> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return (await response.json()) as MatchIndex;
}

export async function loadMatchDetail(detailPath: string): Promise<MatchDetail> {
  const url = detailPath.startsWith("/") ? detailPath : `/data/${detailPath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load match ${detailPath}`);
  }
  return (await response.json()) as MatchDetail;
}

export async function loadDiagnostics(url = "/data/diagnostics.json"): Promise<{
  loadReport: LoadReport;
} | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as { loadReport: LoadReport };
  } catch {
    return null;
  }
}

export function isPartialData(report: LoadReport | undefined): boolean {
  if (!report) return false;
  return (
    report.filesSkipped > 0 ||
    report.unknownActors > 0 ||
    report.unknownEvents > 0 ||
    report.unknownMaps > 0
  );
}
