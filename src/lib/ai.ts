import "server-only";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Picks the AI provider from .env.local, so switching needs no code change:
//   AI_PROVIDER=gemini  → Google Gemini (GOOGLE_GENERATIVE_AI_API_KEY, optional GEMINI_MODEL)
//   AI_PROVIDER=openai  → OpenAI        (OPENAI_API_KEY, optional OPENAI_MODEL)
// If AI_PROVIDER is empty, it uses whichever key is filled in (OpenAI first).
export function getModel(): { model: LanguageModel } | { error: string } {
  const provider = (
    process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "gemini")
  ).toLowerCase();

  if (provider === "gemini") {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return { error: "The assistant is not configured yet (missing GOOGLE_GENERATIVE_AI_API_KEY)." };
    }
    return { model: google(process.env.GEMINI_MODEL || "gemini-3.8-flash") };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { error: "The assistant is not configured yet (missing OPENAI_API_KEY)." };
  }
  return { model: openai(process.env.OPENAI_MODEL || "gpt-5.4-mini") };
}
