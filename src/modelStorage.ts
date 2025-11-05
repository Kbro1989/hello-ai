export interface Env {
	MODEL_STORAGE: KVNamespace;
}

export interface ModelData {
	metadata: any; // Or a more specific interface for your model metadata
	imageUrl?: string; // URL to the model image
	modelContent?: string; // Base64 encoded model data, or a URL
}

export async function saveModelData(env: Env, modelId: string, data: ModelData): Promise<void> {
	await env.MODEL_STORAGE.put(modelId, JSON.stringify(data));
}

export async function getModelData(env: Env, modelId: string): Promise<ModelData | null> {
	const data = await env.MODEL_STORAGE.get(modelId);
	return data ? JSON.parse(data) : null;
}
