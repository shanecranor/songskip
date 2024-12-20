import { observable } from "@legendapp/state";
import { ProcessedData } from "./dataFunctions/processData";
export const musicData$ = observable<ProcessedData | null>(null);

interface UiState {
  loadingStatus: string | null;
  isError: boolean;
  isComplete: boolean;
  recap?: {
    started: boolean;
    page: number;
  };
}

const initialUiState: UiState = {
  loadingStatus: null,
  isError: false,
  isComplete: false,
};
export const uiState$ = observable<UiState>(initialUiState);

export const setError = (error: string) => {
  uiState$.set({
    loadingStatus: error,
    isError: true,
    isComplete: false,
  });
};

export const resetUiState = () => {
  uiState$.set(initialUiState);
};
