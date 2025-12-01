# Issues to fix:

1. Fix `fwdbtnCount` aggregation in `src/dataFunctions/processData.ts` so it correctly counts forward-button skips within Arquero rollups.
   - details:
     - The current expression evaluates `d.reason_end === "fwdbtn"` at rollup time, but `d.reason_end` is the column array, so the comparison always returns false.
     - Use an Arquero expression that inspects per-row values (for example, derive a column before the rollup or supply a function returning a numeric flag) so the sum reflects actual forward-button presses.
2. Replace SCSS-style nested selectors with valid CSS in `src/App.css`, `src/components/DataUpload/DataUpload.css`, and `src/components/Slideshow/Slideshow.css` (or enable nesting support). // NOT IMPORTANT, 90% of browsers support native css nesting now.
3. Update `handleFileChange` in `src/components/DataUpload/DataUpload.tsx` to reset UI state before starting the worker so progress messages persist.
4. Normalize worker error messages in `src/workers/fileProcessor.worker.ts` and the corresponding UI handling to surface readable text instead of `[object Object]`.
5. Use a composite React key (or use uuid if available) in `src/components/Slideshow/Page1.tsx` to avoid collisions when multiple songs share the same title.
