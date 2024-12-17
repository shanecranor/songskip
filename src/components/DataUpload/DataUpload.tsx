import { ChangeEvent, useRef } from "react";
import { useObservable, observer } from "@legendapp/state/react";
import "./DataUpload.css";
import { fileContent$ } from "@/state";
import { processData } from "@/dataFunctions/processData";
const DataUpload = observer(() => {
  const file$ = useObservable<File | null>();
  const error$ = useObservable<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      file$.set(selectedFile);
      readFileContent(selectedFile);
      error$.set(null); // Clear any previous errors
    } else {
      file$.set(null);
      fileContent$.set(null);
      error$.set("No file selected.");
    }
  };

  const readFileContent = (file: File) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        if (event.target?.result) {
          const jsonContent = JSON.parse(event.target.result as string); // Parse as JSON
          fileContent$.set(jsonContent); // Update state with the parsed JSON object
        } else {
          error$.set("File is empty or has no content.");
          fileContent$.set(null);
        }
      } catch (error) {
        // Catch JSON parsing errors
        error$.set("Error parsing JSON: " + (error as Error).message);
        fileContent$.set(null);
      }
    };

    reader.onerror = () => {
      error$.set("Error reading file.");
      fileContent$.set(null);
    };

    reader.readAsText(file); // Important: Read as text
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  const file = file$.get();
  return (
    <div className="c-data-upload">
      <h1 className="modal-header">Upload your Spotify data</h1>
      <div>
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
      {error$.get() && <p style={{ color: "red" }}>{error$.get()}</p>}{" "}
      {/* Display error messages */}
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
