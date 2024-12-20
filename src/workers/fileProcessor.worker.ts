import { processData } from "@/dataFunctions/processData";
import { SpotifyStreamingData } from "@/types";
import { unzip, strFromU8, zip } from "fflate";

const readFileContent = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        if (!event.target?.result) {
          return reject("File is empty or has no content.");
        }
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        if (fileExtension === "json") {
          const jsonContent = JSON.parse(event.target.result as string);
          return resolve(jsonContent);
        }
        if (fileExtension === "zip") {
          self.postMessage({
            status: "update",
            message: "unzipping files, this may take a while...",
          });
          const zipContent = await decompress(
            new Uint8Array(event.target.result as ArrayBuffer)
          );
          if (Array.isArray(zipContent)) {
            return resolve(zipContent.flat());
          }
          if (typeof zipContent === "object") {
            return resolve(zipContent);
          } else {
            return reject("Error parsing zip file.");
          }
        }
        // If the file is neither a JSON nor a ZIP file
        return reject("Unsupported file type.");
      } catch (error) {
        reject("Error parsing file: " + (error as Error).message);
      }
    };

    reader.onerror = () => {
      reject("Error reading file.");
    };

    if (file.name.endsWith(".json")) {
      reader.readAsText(file);
    } else if (file.name.endsWith(".zip")) {
      reader.readAsArrayBuffer(file);
    } else {
      reject("Unsupported file type.");
    }
  });
};

const decompress = async (arrayBuffer: Uint8Array): Promise<unknown> => {
  const unzippedFolder = (await new Promise((resolve, reject) => {
    unzip(arrayBuffer, (err, unzipped) => {
      if (err) {
        return reject(err);
      } else {
        resolve(unzipped);
      }
    });
  })) as Record<string, Uint8Array> | null;
  if (typeof unzippedFolder !== "object") {
    throw new Error("Failed to unzip the file.");
  }
  if (!unzippedFolder) {
    throw new Error("Zip archive is empty?");
  }
  const jsonFiles = Object.keys(unzippedFolder).filter((fileName) =>
    fileName.endsWith(".json")
  );

  if (jsonFiles.length === 0) {
    throw new Error("No JSON files found in the zip archive.");
  }

  const jsonData = jsonFiles.map((fileName) => {
    const fileContent = unzippedFolder[fileName];
    return JSON.parse(strFromU8(fileContent));
  });

  return jsonData;
};
export let storedData: SpotifyStreamingData[] | null = null;
self.onmessage = async (event) => {
  const file = event.data;
  try {
    self.postMessage({ status: "update", message: "Reading file content..." });
    const result = await readFileContent(file);
    storedData = result as any;
    console.log(storedData);
    self.postMessage({
      status: "update",
      message: "Doing some data science magic...",
    });
    if (!storedData) {
      throw new Error("Data is falsey");
    }
    const displayData = processData(storedData);
    console.log("LOGGING DISPLAY DATA");
    console.log(displayData);
    self.postMessage({ status: "success", data: displayData });
  } catch (error) {
    console.error(error);
    self.postMessage({ status: "error", message: error });
  }
};
