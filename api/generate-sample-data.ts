import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import 'dotenv/config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
});

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
});

// Collection name in Qdrant
const COLLECTION_NAME = "users";

// Sample user contexts with image URLs
const sampleUserContexts = [
  {
    context: "I'm a software engineer with 5 years of experience in web development. I specialize in React and Node.js, and I'm interested in learning more about machine learning and AI.",
    img_url: "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3.jpg",
    tags: ["software engineering", "web development", "react", "node.js", "machine learning", "AI"]
  },
  {
    context: "I'm a data scientist working in healthcare. I have experience with Python, SQL, and machine learning models. I'm looking to improve my data visualization skills.",
    img_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3.jpg",
    tags: ["data science", "healthcare", "python", "sql", "machine learning", "data visualization"]
  },
  {
    context: "I'm a UX designer with a background in psychology. I focus on creating accessible and user-friendly interfaces. I'm currently learning more about front-end development.",
    img_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3.jpg",
    tags: ["UX design", "psychology", "accessibility", "user interface", "front-end development"]
  },
  {
    context: "I'm a product manager with experience in agile methodologies. I work with cross-functional teams to deliver digital products. I'm interested in learning more about technical aspects of development.",
    img_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3.jpg",
    tags: ["product management", "agile", "cross-functional", "digital products", "technical development"]
  },
  {
    context: "I'm a DevOps engineer specializing in cloud infrastructure. I work with AWS, Docker, and Kubernetes. I'm looking to improve my automation skills.",
    img_url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3.jpg",
    tags: ["devops", "cloud infrastructure", "AWS", "docker", "kubernetes", "automation"]
  },
];

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
    console.log("Error generating embedding:", error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function generateSampleData() {
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
    }

    // Generate embeddings and prepare points
    const points = await Promise.all(
      sampleUserContexts.map(async (user) => {
        const vector = await generateEmbedding(user.context);
        const id = crypto.randomUUID();
        return {
          id,
          vector,
          payload: {
            id,
            name: `Sample User ${id.slice(0, 8)}`,
            user_context: user.context,
            img_url: user.img_url,
            tags: user.tags,
            timestamp: new Date().toISOString(),
          },
        };
      })
    );

    // Upsert the sample data
    await qdrant.upsert(COLLECTION_NAME, {
      points,
    });

    console.log(`Successfully generated ${points.length} sample records`);
    return points.length;
  } catch (error) {
    console.error("Error generating sample data:", error);
    throw error;
  }
}