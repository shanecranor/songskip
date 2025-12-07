# Issues to fix:

3. Update `handleFileChange` in `src/components/DataUpload/DataUpload.tsx` to reset UI state before starting the worker so progress messages persist.
4. Normalize worker error messages in `src/workers/fileProcessor.worker.ts` and the corresponding UI handling to surface readable text instead of `[object Object]`.
5. Use a composite React key (or use uuid if available) in `src/components/Slideshow/Page1.tsx` to avoid collisions when multiple songs share the same title.

## Data feature ideas:

- Could be cool to include a graph of skip events over time during playback to visualize when you skip most often or how long you typically listen before skipping.
- Longest skip streak: track the longest sequence of skips with no full play inbetween.

- Artists with the highest skip rates overall
  - maybe difficult because less played artists would have much higher skip rates
- Last full listen dates for frequently skipped songs
- Song that are only ever not skipped when shuffle is on
- some sort of info based on listening device
- Daily/Hourly Listening and Skipping Patterns
- polarizing songs:
  - sort by standard deviation of time listened before skip

# DONE:

- Determine if any events have `reason_end === "fwdbtn"` while `skipped !== true`. If these events exist, figure out how we should account for that in the skip logic.
  - There do exist reason end events with `fwdbtn` where `skipped` is false. Not sure why this happens, but for now we will ignore these events in skip calculations.
- Should we weigh time time listed against track duration to determine if a track was really skipped (ie maybe if the user skips within the first 30% of the track it's a skip).
  - issue: we do not have track duration data in the spotify data export, so we cannot do this unless we pull track data from the spotify API.
