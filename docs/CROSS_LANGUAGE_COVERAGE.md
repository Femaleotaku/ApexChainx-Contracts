# Cross-Language Coverage Matrix (#632)

> **Status:** Active
> **Last audit:** February 2026 cross-language sweep (#632 / issue-606-632)
> **Owner:** `offchain/coverageMatrix.ts` (single source of truth for CI)

The ApexChainx calculus contract is consumed from four surfaces that live in
different languages/registries. They must describe the **same** behaviour, or a
consumer in one language drifts from the contract that another language tested.

This document is the human-readable half of the coverage gate; the machine half
is `offchain/coverageMatrix.ts`, which is wired into `npm run test:offchain` so
a missing required surface fails the offchain job in CI.

## Surfaces

| Surface | What lives there | Required for |
|---------|------------------|--------------|
| `rust`  | Soroban contract implementation + in-repo contract tests (`apexchainx_calculator/src/`) | the authoritative behaviour |
| `ts`    | TS parity helpers/tests (`tests/*.test.ts`, `ts/parity/*`) that re-run on-chain reads off-ledger | every behaviour that must stay usable from TS |
| `parity` | The cross-language parity fixtures (`ts/fixtures/contract-read-semantics.json`) shared verbatim by the Rust fixture generator and the TS parity suite | every value the contract reports |
| `offchain` | Scripts that run fully off-ledger (`offchain/*`) to bound cost/size regressions | cost-bound budgets and the matrix itself |

## Matrix rows (subset)

| Row | Behaviour | rust | ts | parity | offchain |
|-----|-----------|:----:|:--:|:------:|:--------:|
| #606 | O(1) cached `get_config_count` read | ✓ | ✓ | ✓ | — |
| #606 value | fixture `constants.configCount` == severity vocabulary size | ✓ | ✓ | ✓ | ✓ |
| #632 | cross-language coverage gate (this doc + checker) | — | ✓ | — | ✓ |
| SC-W5-027 | Event-size regression budget | ✓ | — | — | ✓ |
| SC-016 | Read-cost regression budget | ✓ | ✓ | ✓ | ✓ |
| SC-W5-029 | Governance state/event consistency | ✓ | ✓ | — | ✓ |

> ✓ = live artifact committed; — = not required.
> The matrix refuses to go green on stale-but-present files: the `#606 value`
> row also re-reads the committed parity fixture and requires its `configCount`
> to equal the number of `severity.*` symbols the fixture itself defines.

## Why a single file exists instead of per-language docs

A per-language doc can drift in each repo. One matrix (this doc + the TS
checker) is the single cross-referenced artifact: the Rust side generates the
parity fixture, the TS parity suite consumes it, and the offchain checker
verifies both still agree with the matrix — every time `npm run test:offchain`
runs in CI.

## Extending the matrix

1. Add a row to `offchain/coverageMatrix.ts` (required surfaces + the committed
   paths that must carry the behaviour).
2. Add the matching human row above.
3. Wire any new required surface's path into a real committed file, or the
   offchain job fails.

The value-level tie-in is the important part: paths are checked for existence,
**and** the `#606` value row checks the fixture's `constants.configCount`
against the fixture's own severity vocabulary, so the matrix cannot rot into
"files exist" — it has to agree with what the contract actually reported.
