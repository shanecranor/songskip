import  { useState, ChangeEvent } from 'react';
import './App.css';
import { SpotifyStreamingData } from './types';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<SpotifyStreamingData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      readFileContent(selectedFile);
      setError(null); // Clear any previous errors
    } else {
      setFile(null);
      setFileContent(null);
      setError('No file selected.');
    }
  };

  const readFileContent = (file: File) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        if (event.target?.result) {
          const jsonContent = JSON.parse(event.target.result as string); // Parse as JSON
          setFileContent(jsonContent); // Update state with the parsed JSON object
        } else {
          setError('File is empty or has no content.');
          setFileContent(null);
        }
      } catch (error) { // Catch JSON parsing errors
        setError('Error parsing JSON: ' + (error as Error).message);
        setFileContent(null);
      }
    };

    reader.onerror = () => {
      setError('Error reading file.');
      setFileContent(null);
    };


    reader.readAsText(file); // Important: Read as text
  };

  return (
    <>
      <div>
        <h1>songskip proof of concept</h1>
        <p>upload your spotify GDPR data</p>
        <input type="file" onChange={handleFileChange} /> 
        {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error messages */}
        {file && <p>Selected File: {file.name}</p>} {/* Display selected file name */}
        {fileContent && (
          <div>
            <h2>File Content:</h2>
            <pre>{JSON.stringify(fileContent[0])}</pre> {/* Use <pre> for preserving formatting */}
          </div>
        )}
      </div>
    </>
  );
}

export default App;