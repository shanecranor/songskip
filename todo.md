# Issues to fix:

2. Replace SCSS-style nested selectors with valid CSS in `src/App.css`, `src/components/DataUpload/DataUpload.css`, and `src/components/Slideshow/Slideshow.css` (or enable nesting support). // NOT IMPORTANT, 90% of browsers support native css nesting now.
3. Update `handleFileChange` in `src/components/DataUpload/DataUpload.tsx` to reset UI state before starting the worker so progress messages persist.
4. Normalize worker error messages in `src/workers/fileProcessor.worker.ts` and the corresponding UI handling to surface readable text instead of `[object Object]`.
5. Use a composite React key (or use uuid if available) in `src/components/Slideshow/Page1.tsx` to avoid collisions when multiple songs share the same title.

## Data feature tracking

- Determine if any events have `reason_end === "fwdbtn"` while `skipped !== true`. If these events exist, figure out how we should account for that in the skip logic.
- Should we weigh time time listed against track duration to determine if a track was really skipped (ie maybe if the user skips within the first 30% of the track it's a skip).
- Could be cool to include a graph of skip events over time during playback to visualize when you skip most often or how long you typically listen before skipping.
