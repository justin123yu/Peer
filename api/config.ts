type Config = {
  openai: {
    apiKey: string;
  };
  qdrant: {
    url: string;
    apiKey: string;
  };
};

const getConfig = (): Config => {
  const openaiApiKey = process.env['OPENAI_API_KEY'];
  const qdrantApiKey = process.env['QDRANT_API_KEY'];
  const qdrantUrl = process.env['QDRANT_URL'];

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  if (!qdrantApiKey) {
    throw new Error('QDRANT_API_KEY is not set');
  }

  return {
    openai: {
      apiKey: openaiApiKey,
    },
    qdrant: {
      url: qdrantUrl || "http://localhost:6333",
      apiKey: qdrantApiKey,
    },
  };
};

export const config = getConfig(); 