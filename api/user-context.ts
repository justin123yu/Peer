import 'dotenv/config';
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateSampleData } from './generate-sample-data.js';
import { config } from './config.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: config.qdrant.url,
  apiKey: config.qdrant.apiKey,
});

// Collection name in Qdrant
const COLLECTION_NAME = "users";

// Helper function to generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 256
    });

    return response.data[0].embedding;
  } catch (error) {
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Ensure collection exists
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (col: { name: string }) => col.name === COLLECTION_NAME
    );

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 256, 
          distance: "Cosine",
        },
      });
      await generateSampleData();
    }

    const { name, user_context } = req.body;

    if (!user_context) {
      return res.status(400).json({ error: "user_context field is required in body" });
    }

    let vector;
    try {
      vector = await generateEmbedding(user_context);
    } catch (embeddingError) {
      return res.status(500).json({
        error: "Failed to generate embedding",
        details: embeddingError instanceof Error ? embeddingError.message : embeddingError,
      });
    }

    const pointId = crypto.randomUUID();

    try {
      await qdrant.upsert(COLLECTION_NAME, {
        points: [
          {
            id: pointId,
            vector,
            payload: {
              id: pointId,
              name,
              user_context,
              timestamp: new Date().toISOString(),
            },
          },
        ],
      });
    } catch (upsertError) {
      return res.status(500).json({
        error: "Failed to upsert data into Qdrant",
        details: upsertError instanceof Error ? upsertError.message : upsertError,
      });
    }

    let searchResults;
    try {
      searchResults = await qdrant.search(COLLECTION_NAME, {
        vector,
        limit: 5,
        with_payload: true,
        with_vector: false,
      });
      console.log("Database search results:", searchResults);
    } catch (searchError) {
      return res.status(500).json({
        error: "Failed to search Qdrant",
        details: searchError instanceof Error ? searchError.message : searchError,
      });
    }

    const recommendations = searchResults
      .filter(
        (
          result,
        ): result is typeof result & {
          payload: NonNullable<typeof result.payload>;
        } => result.payload !== null && result.payload !== undefined,
      )
      .map((result) => ({
        id: result.payload.id,
        img_url: result.payload.img_url,
        name: result.payload.name,
        tags: result.payload.tags,
        url: result.payload.url,
        user_context: result.payload.user_context,
        score: result.score,
      }));

    return res.status(200).json(recommendations);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(500).json({
      error: "Internal server error",
      details: errorMessage,
    });
  }
}
