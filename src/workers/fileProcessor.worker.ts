import { unzip, strFromU8 } from "fflate";

const readFileContent = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        if (event.target?.result) {
          const fileExtension = file.name.split(".").pop()?.toLowerCase();
          if (fileExtension === "json") {
            const jsonContent = JSON.parse(event.target.result as string);
            resolve(jsonContent);
          } else if (fileExtension === "zip") {
            self.postMessage({
              status: "update",
              message: "unzipping files, this may take a while...",
            });
            const zipContent = await unzipFile(
              new Uint8Array(event.target.result as ArrayBuffer)
            );
            resolve(zipContent);
          } else {
            reject("Unsupported file type.");
          }
        } else {
          reject("File is empty or has no content.");
        }
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

const unzipFile = async (arrayBuffer: Uint8Array): Promise<any> => {
  const unzipped = await new Promise((resolve, reject) => {
    unzip(arrayBuffer, (err, unzipped) => {
      if (err) {
        reject(err);
      } else {
        resolve(unzipped);
      }
    });
  });
  if (typeof unzipped !== "object") {
    throw new Error("Failed to unzip the file.");
  }
  if (unzipped === null) {
    throw new Error("Zip archive is empty?");
  }
  const jsonFiles = Object.keys(unzipped).filter((fileName) =>
    fileName.endsWith(".json")
  );

  if (jsonFiles.length === 0) {
    throw new Error("No JSON files found in the zip archive.");
  }

  const jsonData = jsonFiles.map((fileName) => {
    const fileContent = unzipped[fileName];
    return JSON.parse(strFromU8(fileContent));
  });

  return jsonData;
};

self.onmessage = async (event) => {
  const file = event.data;
  try {
    self.postMessage({ status: "update", message: "Reading file content..." });
    const result = await readFileContent(file);
    self.postMessage({
      status: "update",
      message: "Finished reading file content",
    });
    self.postMessage({ status: "success", data: result });
  } catch (error) {
    self.postMessage({ status: "error", message: error });
  }
};
