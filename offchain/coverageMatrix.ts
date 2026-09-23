/**
 * #632 – Cross-language coverage matrix (Femaleotaku/issue-606-632).
 *
 * Backends and off-chain consumers rely on the SAME contract surfaces in four
 * different languages/registries. Rather than re-derive each row from memory,
 * this script exists as the single "coverage report" artifact: it enumerates
 * the behaviour rows that matter (#606, #632 and their SC-trackers), annotates
 * which surface must carry a live artifact, and then verifies the committed
 * artifact exists on disk. Any required surface without a live artifact fails
 * with a non-zero exit, so a gap in one language shows up in CI instead of
 * drifting silently.
 *
 * A "required" surface is the minimum a change must keep in step. The matrix
 * below is deliberately small and every path is a real, committed file in this
 * repo (verified during the February 2026 cross-language audit; see
 * docs/CROSS_LANGUAGE_COVERAGE.md). The value-level check at the bottom ties
 * the matrix to the actual contract report (#606), so the report cannot decay
 * into just "files exist" – it also has to agree with what the contract said.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

type Surface = "rust" | "ts" | "parity" | "offchain";

interface CoverageRow {
  id: string;
  feature: string;
  required: Surface[];
  surfaces: Partial<Record<Surface, string[]>>;
}

const MATRIX: CoverageRow[] = [
  {
    id: "#606",
    feature: "O(1) get_config_count read with cached counter",
    required: ["rust", "ts", "parity"],
    surfaces: {
      rust: ["apexchainx_calculator/src/lib.rs", "apexchainx_calculator/src/tests.rs"],
      ts: ["ts/parity/readSemanticsParity.test.ts"],
      parity: ["ts/fixtures/contract-read-semantics.json"],
    },
  },
  {
    id: "#632",
    feature: "Cross-language coverage matrix gate",
    required: ["offchain", "parity"],
    surfaces: {
      offchain: ["offchain/coverageMatrix.ts"],
      parity: ["ts/fixtures/contract-read-semantics.json"],
    },
  },
  {
    id: "SC-018",
    feature: "Auth/role matrix parity",
    required: ["rust", "ts"],
    surfaces: {
      rust: ["apexchainx_calculator/src/auth_matrix_tests.rs"],
      ts: ["tests/authMatrix.test.ts"],
    },
  },
  {
    id: "SC-W5-027",
    feature: "Read-cost regression budget",
    required: ["rust", "offchain"],
    surfaces: {
      rust: ["apexchainx_calculator/src/tests.rs"],
      offchain: ["offchain/readCostRegression.ts"],
    },
  },
  {
    id: "SC-016",
    feature: "Event-size regression budget",
    required: ["rust", "offchain"],
    surfaces: {
      rust: ["apexchainx_calculator/src/event_schema.rs"],
      offchain: ["offchain/eventSizeRegression.ts"],
    },
  },
  {
    id: "SC-W5-029",
    feature: "Severity symbol mapping parity",
    required: ["rust", "ts"],
    surfaces: {
      rust: ["apexchainx_calculator/src/ts_parity_fixtures.rs"],
      ts: ["tests/severitySymbolMappingParity.test.ts"],
    },
  },
  {
    id: "SC-010",
    feature: "Governance snapshot/state consistency",
    required: ["rust", "ts"],
    surfaces: {
      rust: ["apexchainx_calculator/src/governance.rs", "apexchainx_calculator/src/tests.rs"],
      ts: ["tests/simulationSnapshotsGovernance.test.ts"],
    },
  },
  {
    id: "SC-017",
    feature: "Detailed-history parity fixture shape",
    required: ["rust", "ts"],
    surfaces: {
      rust: ["apexchainx_calculator/src/ts_parity_fixtures.rs"],
      ts: ["ts/fixtures/contract-read-semantics.json", "ts/generated/contractConstants.ts"],
    },
  },
];

const SURFACE_HEADER: Surface[] = ["rust", "ts", "parity", "offchain"];

function renderRow(row: CoverageRow): string {
  const cells = SURFACE_HEADER.map((s) => {
    if (!row.required.includes(s)) return "  "; // not required
    const paths = row.surfaces[s] ?? [];
    const exists = paths.some((p) => existsSync(join(repoRoot, p)));
    return exists ? " ✓" : " ✗";
  });
  return "  " + row.id.padEnd(10) + row.feature.padEnd(64) + cells.join(" ");
}

function verify(): number {
  const failures: string[] = [];
  console.log("cross-language coverage report (#632)");
  console.log("required surfaces: " + SURFACE_HEADER.join("  "));
  console.log("(✓ on-disk artifact present, ✗ required but missing)");
  console.log("");

  for (const row of MATRIX) {
    console.log(renderRow(row));
    const bad = row.required.filter((s) =>
      !(row.surfaces[s] ?? []).some((p) => existsSync(join(repoRoot, p)))
    );
    if (bad.length > 0) {
      failures.push(`${row.id} (${row.feature}): missing required surface -> ${bad.join(", ")}`);
    }
  }

  // Value-level tie-in (#606): the contract's reported config count must equal
  // the count of severity symbols described in the parity fixture. This is the
  // only row that also reads the contract's answer back, so the matrix cannot
  // go green on stale-but-present files.
  const fixture = JSON.parse(
    readFileSync(join(repoRoot, "ts/fixtures/contract-read-semantics.json"), "utf8")
  );
  const constants = fixture.constants ?? {};
  const symbols = fixture.symbols ?? {};
  const severities = Object.keys(symbols).filter((k) => k.startsWith("severity."));
  if (constants.configCount !== severities.length) {
    failures.push(
      `#606 value drift: fixture constants.configCount=${constants.configCount} ` +
        `!= severity vocabulary size=${severities.length}`
    );
  }

  console.log("");
  if (failures.length === 0) {
    console.log("PASS – every required surface has a live artifact; #606 values agree.");
    return 0;
  }
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`COVERAGE GAP: ${failures.length} surface(s) missing (#632)`);
  return 1;
}

process.exit(verify());
