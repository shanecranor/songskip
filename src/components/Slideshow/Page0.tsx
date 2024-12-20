import { musicData$ } from "@/state";
export const Page0 = () => {
  const skips = musicData$.totals.skips.get() || 0;
  const totalSongs = musicData$.totals.count.get() || 0;
  const skipPercent = (skips / totalSongs) * 100;
  if (totalSongs === 0) {
    return (
      <div>
        looks like you didn't listen to any music lol, why are you here?
      </div>
    );
  }
  if (skips === 0) {
    return (
      <div>
        you didn't skip any songs and you had {totalSongs} total plays...
        congrats?
      </div>
    );
  }
  return (
    <div>
      <h1>You skipped {skips} songs this year</h1>
      <p>
        That is {skipPercent.toFixed(0)}% of the songs you listened to this year
      </p>
    </div>
  );
};
