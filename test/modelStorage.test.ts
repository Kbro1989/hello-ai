import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveModelData, getModelData, Env, ModelData } from "../src/modelStorage";

describe("Model Storage KV Operations", () => {
  let mockKVNamespace: KVNamespace;
  let mockEnv: Env;

  beforeEach(() => {
    mockKVNamespace = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as KVNamespace;

    mockEnv = {
      MODEL_STORAGE: mockKVNamespace,
    };
  });

  it("should save model data to KV", async () => {
    const modelId = "test-model-1";
    const modelData: ModelData = {
      metadata: { name: "Test Model", version: "1.0" },
      imageUrl: "http://example.com/image.png",
    };

    await saveModelData(mockEnv, modelId, modelData);

    expect(mockKVNamespace.put).toHaveBeenCalledWith(
      modelId,
      JSON.stringify(modelData)
    );
  });

  it("should retrieve model data from KV", async () => {
    const modelId = "test-model-2";
    const storedData: ModelData = {
      metadata: { name: "Another Model", author: "Me" },
    };
    (mockKVNamespace.get as vi.Mock).mockResolvedValueOnce(JSON.stringify(storedData));

    const retrievedData = await getModelData(mockEnv, modelId);

    expect(mockKVNamespace.get).toHaveBeenCalledWith(modelId);
    expect(retrievedData).toEqual(storedData);
  });

  it("should return null if model data is not found", async () => {
    const modelId = "non-existent-model";
    (mockKVNamespace.get as vi.Mock).mockResolvedValueOnce(null);

    const retrievedData = await getModelData(mockEnv, modelId);

    expect(mockKVNamespace.get).toHaveBeenCalledWith(modelId);
    expect(retrievedData).toBeNull();
  });
});