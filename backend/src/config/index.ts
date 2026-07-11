import dotenv from "dotenv";

dotenv.config();

function readNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: readNumber("PORT", 5000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",

  groq: {
    apiKey: process.env.GROQ_API_KEY ?? "",
    baseURL: "https://api.groq.com/openai/v1",
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    baseURL: "https://openrouter.ai/api/v1",
    model: process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b:free",
  },

  batchSize: readNumber("BATCH_SIZE", 10),
  maxRetries: readNumber("MAX_RETRIES", 2),
  maxFileSizeMb: readNumber("MAX_FILE_SIZE_MB", 10),
  maxRows: readNumber("MAX_ROWS", 20000),
} as const;

if (!config.openrouter.apiKey && !config.groq.apiKey && !config.gemini.apiKey) {
  console.warn(
    "[config] No AI API keys configured. Set at least one of OPENROUTER_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY.",
  );
}
