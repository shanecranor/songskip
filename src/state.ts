import { SpotifyStreamingData } from "./types";
import { observable } from "@legendapp/state";
export const fileContent$ = observable<SpotifyStreamingData[] | null>(null);

