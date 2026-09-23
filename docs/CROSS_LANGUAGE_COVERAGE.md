# Cross-language coverage matrix

> **#632** – Femaleotaku/issue-606-632 · adds a cross-language coverage report so
> gaps between the Rust contract, the TypeScript parity layer and the off-chain
> regression suite are CI-visible instead of silently drifting.

## What the matrix covers

The ApexChainx calculator is consumed from four different surfaces that must
stay in step:

| Surface | What lives here |
|---------|-----------------|
| `rust`  | The Soroban contract (`apexchainx_calculator/src/*`) and its in-repo tests. |
| `ts`    | The TypeScript read helpers, their parity tests and the generated constants. |
| `parity`| The fixture-driven cross-language parity tests (`ts/parity/*`) and the JSON read-semantics fixture. |
| `offchain` | Committed off-chain regression/consistency scripts (`offchain/*`) that never touch the ledger. |

Every behaviour row in `offchain/coverageMatrix.ts` declares which surfaces are
**required** to carry a live artifact hearth. The checker (`test:offchain`) then:

1. Resolves each required path from the repo root.
2. Fails the offchain job if any required surface has no on-disk artifact.
3. Re-reads the committed parity fixture and compares the contract-reported
   cached `configCount` (#606) against the canonical severity vocabulary the
   matrix knows – so the report cannot regress into a stale list of filenames.

## What "CI-visible gap" means here

`package.json` wires the coverage matrix into the offchain job:

```bash
"test:offchain": "tsx offchain/eventSizeRegression.ts && ... && tsx offchain/coverageMatrix.ts"
```

Because the matrix exits non-zero when a required surface is missing, a change
that removes or renames a parity artifact (while leaving the TS side in sync)
fails CI instead of shipping a silent cross-language gap.

## Rows in the committed matrix

| ID | Feature | Required surfaces |
|----|---------|-------------------|
| #606 | O(1) cached `get_config_count` (rust + ts + parity rows live) | rust, ts, parity |
| #604 | Severity vocabulary mirrored on the TS side | rust, ts |
| #605 | Read semantics (pagination, history paging, result schema version) | rust, ts, parity |
| SC-018 | Auth/role matrix parity | rust, ts |
| SC-W5-027 | Read-cost regression budget | rust, offchain |
| SC-016 | Event-size regression budget | rust, offchain |
| SC-W5-029 | Severity symbol mapping parity | rust, ts |
| SC-010 | Governance snapshot/state consistency | rust, ts |
| SC-017 | Detailed-history parity fixture shape | rust, ts |

`#606` is the only value-checked row: `configCount` read back from the parity
fixture must equal the number of committed severity symbols, which is exactly
the O(1) surface #606 introduced.

## Running it locally

```bash
npm run test:offchain   # includes the coverage matrix gate
```

A healthy repo prints each row with `✓` on every required surface and exits 0.
