import { EngineCache, ThreejsSceneCache } from "./rsmv/3d/modeltothree";
import { WebCacheSource } from "./rsmv/cache/webcache";

export async function loadModel(modelId: number) {
    const source = new WebCacheSource("https://runeapps.org/624-927");
    const engine = await EngineCache.create(source);
    const scene = await ThreejsSceneCache.create(engine);
    const model = await scene.getModelData(modelId);
    return model;
}
