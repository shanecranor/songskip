import { ChangeEvent, useRef } from "react";
import { useObservable, observer } from "@legendapp/state/react";
import "./DataUpload.css";
import { fileContent$ } from "@/state";
import { processData } from "@/dataFunctions/processData";
import { unzipFile } from "@/dataFunctions/unzipFile";

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

  const readFileContent = async (file: File) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        if (event.target?.result) {
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          if (fileExtension === 'json') {
            const jsonContent = JSON.parse(event.target.result as string); // Parse as JSON
            fileContent$.set(jsonContent); // Update state with the parsed JSON object
          } else if (fileExtension === 'zip') {
            const zipContent = await unzipFile(new Uint8Array(event.target.result as ArrayBuffer));
            fileContent$.set(zipContent); // Update state with the extracted JSON object
          } else {
            error$.set("Unsupported file type.");
            fileContent$.set(null);
          }
        } else {
          error$.set("File is empty or has no content.");
          fileContent$.set(null);
        }
      } catch (error) {
        // Catch JSON parsing errors
        error$.set("Error parsing file: " + (error as Error).message);
        fileContent$.set(null);
      }
    };

    reader.onerror = () => {
      error$.set("Error reading file.");
      fileContent$.set(null);
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file); // Read JSON as text
    } else if (file.name.endsWith('.zip')) {
      reader.readAsArrayBuffer(file); // Read ZIP as ArrayBuffer
    } else {
      error$.set("Unsupported file type.");
      fileContent$.set(null);
    }
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
