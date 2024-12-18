import { unzip, strFromU8 } from 'fflate';

export async function unzipFile(arrayBuffer: Uint8Array): Promise<any> {
  const unzipped = await unzip(arrayBuffer);
  const jsonFiles = Object.keys(unzipped).filter(fileName => fileName.endsWith('.json'));

  if (jsonFiles.length === 0) {
    throw new Error('No JSON files found in the zip archive.');
  }

  const jsonData = jsonFiles.map(fileName => {
    const fileContent = unzipped[fileName];
    return JSON.parse(strFromU8(fileContent));
  });

  return jsonData;
}
