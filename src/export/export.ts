import type { FieldHeat } from "../evaluation/heatmap";
import type { SuiteSummary } from "../benchmarks/summary";
import type { BenchmarkRun, BenchmarkSuite } from "../storage/types";

export const EXPORT_FORMAT_VERSION = 1;

export interface SuiteExportBundle {
  formatVersion: number;
  appBuild: string;
  exportedAt: string;
  suite: BenchmarkSuite;
  runs: BenchmarkRun[];
  summary: SuiteSummary;
  fieldAccuracy: FieldHeat[];
}

/**
 * Full JSON export of one suite (SPEC FR-018). Runs contain safe raw
 * responses only; API keys are memory-only and never reach exports.
 */
export function buildSuiteExportJson(bundle: SuiteExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/** RFC 4180-style CSV field escaping. */
export function csvEscape(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(",");
}

export interface SummaryCsvRow {
  suiteId: string;
  suiteName: string;
  status: string;
  model: string;
  inputMode: string;
  summary: SuiteSummary;
}

const SUMMARY_HEADER = [
  "suite_id",
  "suite_name",
  "status",
  "model",
  "input_mode",
  "requested_runs",
  "attempted_runs",
  "succeeded_runs",
  "schema_invalid_runs",
  "provider_error_runs",
  "exact_pass_rate",
  "schema_valid_rate",
  "avg_leaf_accuracy",
  "row_accuracy",
  "consistency_rate",
  "unique_variants",
  "error_rate",
  "latency_avg_ms",
  "latency_p95_ms",
  "cost_total_usd",
  "cost_avg_usd",
];

/** One row per suite with the dashboard summary metrics. */
export function buildSummaryCsv(rows: SummaryCsvRow[]): string {
  const lines = [csvRow(SUMMARY_HEADER)];
  for (const row of rows) {
    const s = row.summary;
    lines.push(
      csvRow([
        row.suiteId,
        row.suiteName,
        row.status,
        row.model,
        row.inputMode,
        s.requestedRuns,
        s.attemptedRuns,
        s.succeededRuns,
        s.schemaInvalidRuns,
        s.providerErrorRuns,
        s.exactPassRate,
        s.schemaValidRate,
        s.avgLeafAccuracy,
        s.rowAccuracy,
        s.consistencyRate,
        s.uniqueVariants,
        s.errorRate,
        s.latency.avg,
        s.latency.p95,
        s.cost.totalUsd,
        s.cost.avgPerRun,
      ]),
    );
  }
  return lines.join("\n") + "\n";
}

/** Field accuracy rows for a suite (heatmap export). */
export function buildFieldCsv(heatmap: FieldHeat[]): string {
  const lines = [
    csvRow(["path", "mismatched_runs", "evaluated_runs", "mismatch_rate", "expected", "actual", "count"]),
  ];
  for (const heat of heatmap) {
    if (heat.valueFrequencies.length === 0) {
      lines.push(csvRow([heat.path, heat.mismatchedRuns, heat.evaluatedRuns, heat.mismatchRate, "", "", ""]));
      continue;
    }
    for (const freq of heat.valueFrequencies) {
      lines.push(
        csvRow([
          heat.path,
          heat.mismatchedRuns,
          heat.evaluatedRuns,
          heat.mismatchRate,
          JSON.stringify(freq.expected),
          JSON.stringify(freq.actual),
          freq.count,
        ]),
      );
    }
  }
  return lines.join("\n") + "\n";
}

/** Browser download helper (SECURITY.md: exports carry no secrets). */
export function downloadText(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
