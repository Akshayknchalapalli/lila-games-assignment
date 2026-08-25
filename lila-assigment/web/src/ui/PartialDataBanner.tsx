import type { LoadReport } from "../domain/types";
import { isPartialData } from "../domain/indexLoader";

export function PartialDataBanner({ report }: { report?: LoadReport }) {
  if (!report || !isPartialData(report)) return null;
  return (
    <div className="partial-banner" role="status">
      Partial data: skipped {report.filesSkipped} file(s); unknown actors{" "}
      {report.unknownActors}, events {report.unknownEvents}, maps {report.unknownMaps}.
      Quarantined rows are not drawn.
    </div>
  );
}
