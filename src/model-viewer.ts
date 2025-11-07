import { Openrs2CacheSource } from "./rsmv/cache";
import { parseOb3Model } from "./rsmv/rt7model";
import { cacheMajors } from "./rsmv/constants";

async function main() {
    // TODO: allow selecting a cache id
    const cacheId = 1665; // Example cache id, latest rs3 cache
    const cacheSource = await Openrs2CacheSource.fromId(cacheId);

    // TODO: allow selecting a model id
    const modelId = 4153;

    try {
        const modelBuffer = await cacheSource.getFileById(cacheMajors.models, modelId);
        const modelData = parseOb3Model(modelBuffer, cacheSource);

        console.log("Model data:", modelData);
        console.log("Model material:", modelData.material);
        debugger;

        // Next steps: convert to Three.js and render

    } catch (error) {
        console.error("Failed to load or parse model:", error);
    }
}

main();
