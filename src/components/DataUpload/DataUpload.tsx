import { ChangeEvent, useRef } from "react";
import { useObservable, observer } from "@legendapp/state/react";
import "./DataUpload.css";
import { fileContent$, uiState$, setError, resetUiState } from "@/state";
import { processData } from "@/dataFunctions/processData";
import { unzipFile } from "@/dataFunctions/unzipFile";

const DataUpload = observer(() => {
  const file$ = useObservable<File | null>();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      file$.set(selectedFile);
      readFileContent(selectedFile);
      resetUiState();
    } else {
      file$.set(null);
      fileContent$.set(null);
      setError("No file selected.");
    }
  };

  const readFileContent = async (file: File) => {
    uiState$.loadingStatus.set("Reading file...");
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        if (event.target?.result) {
          const fileExtension = file.name.split(".").pop()?.toLowerCase();
          if (fileExtension === "json") {
            uiState$.loadingStatus.set("Parsing JSON...");
            const jsonContent = JSON.parse(event.target.result as string); // Parse as JSON
            fileContent$.set(jsonContent); // Update state with the parsed JSON object
          } else if (fileExtension === "zip") {
            uiState$.loadingStatus.set("Unzipping...");
            const zipContent = await unzipFile(
              new Uint8Array(event.target.result as ArrayBuffer)
            );
            uiState$.loadingStatus.set("Extracting JSON files...");
            fileContent$.set(zipContent); // Update state with the extracted JSON object
          } else {
            setError("Unsupported file type.");
            fileContent$.set(null);
          }
        } else {
          setError("File is empty or has no content.");
          fileContent$.set(null);
        }
      } catch (error) {
        // Catch JSON parsing errors
        setError("Error parsing file: " + (error as Error).message);
        fileContent$.set(null);
      }
    };

    reader.onerror = () => {
      setError("Error reading file.");
      fileContent$.set(null);
    };

    if (file.name.endsWith(".json")) {
      reader.readAsText(file); // Read JSON as text
    } else if (file.name.endsWith(".zip")) {
      reader.readAsArrayBuffer(file); // Read ZIP as ArrayBuffer
    } else {
      setError("Unsupported file type.");
      fileContent$.set(null);
    }
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
              <g id="bgCarrier" stroke-width="0" />
              <g
                id="tracerCarrier"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <g id="iconCarrier">
                <path
                  d="M7 17L16.8995 7.10051"
                  stroke="#d0d0d0"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M7 7.00001L16.8995 16.8995"
                  stroke="#d0d0d0"
                  stroke-linecap="round"
                  stroke-linejoin="round"
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
      {fileContent$.get() && (
        <div>
          <h2>File Content:</h2>
          <pre>{JSON.stringify(fileContent$.get())}</pre>{" "}
          {/* Use <pre> for preserving formatting */}
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
      {/* <button onClick={() => processData(fileContent$.get() || [])}></button> */}
    </div>
  );
});

export default DataUpload;
