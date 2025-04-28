import { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";
import { config } from './config.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, model = "gpt-4", max_tokens = 1000 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
    });

    return res.status(200).json(completion);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to generate chat completion",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
} 