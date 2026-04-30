# Workflow preservation — agreed invariants

Short contract for `PreservationEngine`, `SessionController` continuity, and related tests. Aligned with product decisions **D1–D4** (no ratio-only emergency; progress regressions penalize score below 0.9; compression ratio may exceed 1 with explanation; batch perf checks run twice with stable spread).

## Must hold

1. **No emergency swap from ratio alone** — Successful normal compaction returns `prioritizeEssentialData` output. We do **not** replace that with a minimal emergency snapshot only because `compactedSize / originalSize` is high.

2. **Emergency compaction** — `emergency-*` algorithms apply only on real failure/recovery paths (e.g. compaction throws and `ErrorHandler` returns recovered minimal state), not as an automatic “poor ratio” fallback.

3. **Dates after sanitize** — Filters and sorts treat `lastModified` / `timestamp` via coercion (`Date` or ISO string) so behavior matches property-test expectations.

4. **Documents kept (normal compaction)** — Recently modified (≥ 1h), or `approved`, or `in_review`. If none match but documents exist, keep up to **two** most recently modified (fallback).

5. **Decisions kept (normal compaction)** — Within 24h, or `impact === 'high'`, or `category === 'technical'`.

6. **Audit log stream** — Write failures on the audit `WriteStream` must not surface as uncaught process-level errors (listener on `'error'`).

7. **Progress regression vs continuity score** — Any `validateProgressContinuity` issue applies a penalty so that **one** progress regression forces `continuityScore` **below 0.9** (formula: `0.11 + (n−1)×0.06`, capped).

## Should hold

8. **Compression ratio semantics** — `compressionRatio` is `compactedSize / originalSize`. It **may be greater than 1**. When it is, `reconstructionMetadata.reconstructionInstructions` must begin with a plain-language note explaining that this can happen without discarding essential data.

9. **Performance batch tests** — Preservation and restoration consistency suites each run **two** full passes with a clean storage dir; each pass enforces time caps and a spread check using `maxTime / max(minTime, 25ms)` to avoid unstable ratios on sub-millisecond samples.

## Non-goals / not guaranteed

- Byte size always decreases after compaction.
- Continuity score thresholds other than the progress-regression rule above (phase/task/type penalties unchanged unless explicitly revised).
