import { ChangeEvent, useRef } from "react";
import { useObservable, observer } from "@legendapp/state/react";
import "./DataUpload.css";
import { musicData$, uiState$, setError, resetUiState } from "@/state";
// import { processData } from "@/dataFunctions/processData";
import fileProcessorWorker from "@/workers/fileProcessor.worker.ts?worker";
const DataUpload = observer(() => {
  const file$ = useObservable<File | null>();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      file$.set(selectedFile);
      processFileInWorker(selectedFile);
      resetUiState();
    } else {
      file$.set(null);
      musicData$.set(null);
      setError("No file selected.");
    }
  };

  const processFileInWorker = (file: File) => {
    uiState$.loadingStatus.set("Processing file in worker...");
    const worker = new fileProcessorWorker();

    worker.onmessage = (event) => {
      const { status, data, message } = event.data;
      if (status === "success") {
        uiState$.loadingStatus.set("File processed successfully.");
        musicData$.set(data);
      } else if (status === "update") {
        uiState$.loadingStatus.set(message);
      } else {
        setError("Error processing file: " + message);
      }
    };

    worker.onerror = () => {
      setError("Error in worker.");
    };

    worker.postMessage(file);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const file = file$.get();
  const loadingString = uiState$.loadingStatus.get();
  const hasError = uiState$.isError.get();
  return (
    <div className="c-data-upload">
      <div className="modal-header">
        <h1>Upload your Spotify data</h1>{" "}
        <form className="close-modal-x-container" method="dialog">
          <button className="close-modal-x">
            <svg
              width="32px"
              height="32px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="bgCarrier" strokeWidth="0" />
              <g
                id="tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <g id="iconCarrier">
                <path
                  d="M7 17L16.8995 7.10051"
                  stroke="#d0d0d0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 7.00001L16.8995 16.8995"
                  stroke="#d0d0d0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          </button>
        </form>
      </div>
      <div className="instructions">
        <p>First, request your spotify data</p>
        <ul>
          <li>
            Open the Privacy settings page by visiting <br />
            <a href="https://www.spotify.com/us/account/privacy/">
              https://www.spotify.com/us/account/privacy/
            </a>
          </li>
          <li>Scroll down to find the "Download your data" section</li>
          <li>Check the "Extended streaming history" checkbox</li>
          <li>Click "Request data"</li>
        </ul>
        <p>After waiting for a few days, you can now upload the zip!</p>
      </div>
      {loadingString && (
        <p className={`loading-message ${hasError ? "error" : ""}`}>
          {loadingString}
        </p>
      )}
      {file && <p>Selected File: {file.name}</p>}{" "}
      {/* Display selected file name */}
      {musicData$.get() && (
        <div>
          <h2>File has content!</h2>
          <pre>{JSON.stringify(musicData$.get())}</pre>{" "}
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <button className="spotify-button" onClick={handleButtonClick}>
        Select File
      </button>
    </div>
  );
});

export default DataUpload;
