import { unzip, strFromU8 } from "fflate";

export async function unzipFile(arrayBuffer: Uint8Array): Promise<any> {
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
}
