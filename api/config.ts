interface Env {
  OPENAI_API_KEY: string;
  QDRANT_API_KEY: string;
  QDRANT_URL?: string;
}

declare const process: {
  env: Env;
};

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  qdrant: {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY,
  },
}; 