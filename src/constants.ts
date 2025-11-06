// src/constants.ts

// -------------------------
// Cloudflare Worker Bindings
// -------------------------
export const KV_ASSETS = 'ASSETS';
export const KV_CACHE = 'CACHE_KV';
export const AI_BINDING = 'AI';

// -------------------------
// API Endpoints
// -------------------------
export const API = {
  GET_TYPEDEF: '/api/typedef',
  GET_MODELS: '/api/models',
  GET_MODEL_BY_ID: (id: string | number) => `/api/model/${id}`,
  AI_SUGGEST_MATERIALS: '/ai/suggest-materials',
  AI_SUGGEST_ANIMATION: '/ai/suggest-animation'
};

// -------------------------
// Three.js Config
// -------------------------
export const THREE_MODULE_URL = 'https://unpkg.com/three@0.158.0/build/three.module.js';
export const ORBIT_CONTROLS_URL = 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';

// -------------------------
// KV Keys for data storage
// -------------------------
export const KV_KEYS = {
  TYPEDEF: 'typedef',
  MODELS: 'models',
  MODEL_OB3: (id: string | number) => `models/${id}.ob3`
};

// -------------------------
// RSMV/OB3 Parser Config
// -------------------------
export const PARSER_CONFIG = {
  MAX_VERTICES: 200_000,
  MAX_INDICES: 600_000
};