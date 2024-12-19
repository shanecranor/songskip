import { observable } from "@legendapp/state";
export const musicData$ = observable<any>();

interface UiState {
  loadingStatus: string | null;
  isError: boolean;
  isComplete: boolean;
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
