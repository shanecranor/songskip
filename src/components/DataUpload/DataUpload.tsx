import { ChangeEvent } from "react";
import { useObservable, observer } from "@legendapp/state/react";
import "./DataUpload.css";
import { fileContent$ } from "@/state";
import { processData } from "@/dataFunctions/processData";
const App = observer(() => {
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
  const file = file$.get();
  return (
    <div className="c-data-upload">
      <p>upload your spotify GDPR data</p>
      <p>
        To download your data, go to{" "}
        <a href="https://www.spotify.com/us/account/privacy/">
          https://www.spotify.com/us/account/privacy/
        </a>
        , scroll down, and request your extended streaming history.
      </p>
      <input type="file" onChange={handleFileChange} />
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
      <button onClick={() => processData(fileContent$.get() || [])}></button>
    </div>
  );
});

export default App;
