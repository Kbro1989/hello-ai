// src/api/model.ts
import { unzipSync } from "fflate";
import { handleProxy } from "./proxy"; // Assuming proxy is in the same directory

// Placeholder for opDecoder - will be implemented later
function opDecoder(modelBytes: Uint8Array): any {
  // For now, just return a placeholder JSON
  return {
    message: "Model bytes received, opDecoder not yet implemented.",
    byteLength: modelBytes.byteLength,
    // You can add a base64 representation of the bytes for debugging if needed
    // modelBytesBase64: btoa(String.fromCharCode(...modelBytes))
  };
}

async function extractFileFromZip(arrayBuffer: ArrayBuffer, filename: string): Promise<Uint8Array | null> {
  const data = new Uint8Array(arrayBuffer);
  const unzipped = unzipSync(data);
  for (const key of Object.keys(unzipped)) {
    if (key.endsWith(filename)) {
      return unzipped[key];
    }
  }
  return null;
}

export async function handleModel(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cacheId = url.searchParams.get("cache");
  const group = url.searchParams.get("group");
  const file = url.searchParams.get("file");
  // const buildnr = url.searchParams.get("buildnr"); // We might need this later

  if (!cacheId || !group || !file) {
    return new Response(JSON.stringify({ error: "missing query params: cache, group, or file" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    // Fetch the disk.zip using our proxy
    const proxyRequest = new Request(new URL(`/api/proxy?openrs2=${encodeURIComponent(cacheId)}`, url).toString(), request);
    const zipResponse = await handleProxy(proxyRequest);

    if (!zipResponse.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch OpenRS2 zip: ${zipResponse.status}` }), {
        status: zipResponse.status,
        headers: { "content-type": "application/json" },
      });
    }

    const zipArrayBuffer = await zipResponse.arrayBuffer();

    // Extract the relevant .dat2 and .idx files
    // This is a simplified assumption. Real implementation needs to parse .idx to find offset/length in .dat2
    const dat2Filename = `main_file_cache.dat2`; // Simplified
    const idxFilename = `main_file_cache.idx${group}`; // Simplified

    const dat2File = await extractFileFromZip(zipArrayBuffer, dat2Filename);
    const idxFile = await extractFileFromZip(zipArrayBuffer, idxFilename);

    if (!dat2File || !idxFile) {
      return new Response(JSON.stringify({ error: `Could not find ${dat2Filename} or ${idxFilename} in zip.` }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // Placeholder for actual model byte extraction from .dat2 using .idx
    // This part requires parsing the .idx file to get the offset and length
    // For now, we'll just return a placeholder with the file sizes
    const modelBytes = new Uint8Array(0); // Placeholder

    // Call the opDecoder placeholder
    const decodedModel = opDecoder(modelBytes);

    return new Response(JSON.stringify({
      message: "Successfully processed model request (simplified).",
      cacheId,
      group,
      file,
      dat2Size: dat2File.byteLength,
      idxSize: idxFile.byteLength,
      decodedModel: decodedModel,
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err.message ?? err) }), {
      status: 500,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
