import OpenAI from "openai";
import { ERROR_CODES } from "@groweasy/shared";
import { config } from "../config";
import { logger, generateRequestId } from "../utils/logger";
import { aiResponseSchema, type ValidatedCrmRecord } from "../utils/schemas";
import { AppError } from "../middleware/error.middleware";
import { buildFieldMappingPrompt } from "../prompts/field-mapping.prompt";

interface AIProviderConfig {
  name: string;
  client: OpenAI;
  model: string;
}

function getAvailableProviders(): AIProviderConfig[] {
  const providers: AIProviderConfig[] = [];
  if (config.openrouter.apiKey) {
    providers.push({
      name: "openrouter",
      client: new OpenAI({
        apiKey: config.openrouter.apiKey,
        baseURL: config.openrouter.baseURL,
        defaultHeaders: {
          "HTTP-Referer": config.corsOrigin,
          "X-Title": "GrowEasy AI CSV Importer",
        },
      }),
      model: config.openrouter.model,
    });
  }
  if (config.groq.apiKey) {
    const groqClient = new OpenAI({
      apiKey: config.groq.apiKey,
      baseURL: config.groq.baseURL,
    });
    providers.push({
      name: "groq-8b",
      client: groqClient,
      model: "llama-3.1-8b-instant",
    });
    providers.push({
      name: "groq-70b",
      client: groqClient,
      model: config.groq.model,
    });
  }
  if (config.gemini.apiKey) {
    providers.push({
      name: "gemini",
      client: new OpenAI({
        apiKey: config.gemini.apiKey,
        baseURL: config.gemini.baseURL,
      }),
      model: config.gemini.model,
    });
  }
  return providers;
}

export interface BatchExtractionResult {
  records: ValidatedCrmRecord[];
  skippedIndices: Set<number>;
}

export interface ExtractionLogContext {
  jobId?: string;
  batchIndex?: number;
  totalBatches?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

function tryParseJson(raw: string): unknown {
  const cleaned = stripCodeFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    if (cleaned.includes('"records"')) {
      const recordsIdx = cleaned.indexOf('[');
      if (recordsIdx !== -1) {
        let openBraces = 0;
        let lastCompleteObjectEnd = -1;
        let inString = false;
        let escapeNext = false;
        for (let i = recordsIdx + 1; i < cleaned.length; i++) {
          const char = cleaned[i];
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === '{') openBraces++;
            else if (char === '}') {
              openBraces--;
              if (openBraces === 0) {
                lastCompleteObjectEnd = i;
              }
            }
          }
        }
        if (lastCompleteObjectEnd !== -1) {
          const repaired = cleaned.slice(0, lastCompleteObjectEnd + 1) + ']}';
          try {
            return JSON.parse(repaired);
          } catch {
          }
        }
      }
    }
    throw err;
  }
}

export async function extractCrmRecords(
  batch: Record<string, string>[],
  headers: string[],
  fileNameHint?: string,
  logContext: ExtractionLogContext = {},
): Promise<BatchExtractionResult> {
  const maxAttempts = config.maxRetries + 1;
  const requestId = generateRequestId();
  let validationFeedback = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startTime = Date.now();
    logger.debug("Calling LLM for batch extraction", {
      jobId: logContext.jobId,
      batchIndex: logContext.batchIndex,
      inputRows: batch.length,
      attempt,
    });
    try {
      let prompt = buildFieldMappingPrompt({
        headers,
        rows: batch,
        filename: fileNameHint,
      });

      if (validationFeedback) {
        prompt += `\n\n${validationFeedback}`;
      }

      const providers = getAvailableProviders();
      if (providers.length === 0) {
        throw new Error("No AI providers configured (OPENROUTER_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY is required).");
      }

      let completion: OpenAI.Chat.Completions.ChatCompletion | undefined;
      let usedProvider = providers[0];
      let lastErr: unknown;

      for (const provider of providers) {
        try {
          completion = await provider.client.chat.completions.create(
            {
              model: provider.model,
              temperature: 0,
              max_tokens: 8192,
              response_format: { type: "json_object" },
              messages: [{ role: "user", content: prompt }],
            },
            { timeout: 60_000 },
          );

          if (!completion.choices[0]?.message?.content?.trim()) {
            throw new Error("Provider returned empty content with response_format.");
          }

          usedProvider = provider;
          break;
        } catch (formatErr) {
          try {
            logger.debug(`Retrying ${provider.name} without json_object constraint`);
            completion = await provider.client.chat.completions.create(
              {
                model: provider.model,
                temperature: 0,
                max_tokens: 8192,
                messages: [{ role: "user", content: prompt }],
              },
              { timeout: 60_000 },
            );

            if (!completion.choices[0]?.message?.content?.trim()) {
              throw new Error("Provider returned empty content.");
            }

            usedProvider = provider;
            break;
          } catch (providerErr) {
            lastErr = providerErr;
            logger.warn(`Provider ${provider.name} failed, trying next`, {
              error: providerErr instanceof Error ? providerErr.message : String(providerErr),
            });
          }
        }
      }

      if (!completion) {
        throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
      }

      const latencyMs = Date.now() - startTime;
      const raw = completion.choices[0]?.message?.content ?? "";

      logger.debug("Raw model response received", {
        jobId: logContext.jobId,
        batchIndex: logContext.batchIndex,
        attempt,
        rawLength: raw.length,
      });

      const cleaned = stripCodeFences(raw);

      let parsed: unknown;
      try {
        parsed = tryParseJson(raw);
      } catch (parseErr) {
        logger.error("Model response was not valid JSON after cleaning", {
          jobId: logContext.jobId,
          batchIndex: logContext.batchIndex,
          attempt,
          rawResponse: raw,
          cleanedResponse: cleaned,
          error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        throw new Error("Model response was not valid JSON.");
      }

      const zodResult = aiResponseSchema.safeParse(parsed);
      if (!zodResult.success) {
        const errors = zodResult.error.issues.map(
          (i) => `${i.path.join(".")}: ${i.message}`,
        );

        logger.warn("LLM response failed schema validation", {
          jobId: logContext.jobId,
          batchIndex: logContext.batchIndex,
          attempt,
          validationErrors: errors,
        });

        logger.logAiBatch({
          level: "warn",
          message: "AI response validation failed, retrying",
          requestId,
          jobId: logContext.jobId,
          batchIndex: logContext.batchIndex,
          validationErrors: errors,
          retries: attempt - 1,
        });

        validationFeedback = `<validation_error>The previous response failed validation:\n${errors.join("\n")}\nFix these issues and return valid JSON.</validation_error>`;

        if (attempt < maxAttempts) {
          await sleep(2000 * attempt);
          continue;
        }

        throw new Error(`Zod validation failed: ${errors.slice(0, 3).join("; ")}`);
      }

      const validated = zodResult.data;

      logger.debug("LLM extraction succeeded", {
        jobId: logContext.jobId,
        batchIndex: logContext.batchIndex,
        recordsReturned: validated.records.length,
        skipped_indices: validated.skipped_indices,
      });

      logger.logAiBatch({
        level: "info",
        message: "AI batch completed",
        requestId,
        jobId: logContext.jobId,
        batchIndex: logContext.batchIndex,
        totalBatches: logContext.totalBatches,
        provider: usedProvider.name,
        model: usedProvider.model,
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
        latencyMs,
        retries: attempt - 1,
        recordsIn: batch.length,
        recordsOut: validated.records.filter((r) => !r._skip).length,
        recordsSkipped: validated.records.filter((r) => r._skip).length,
      });

      return {
        records: validated.records,
        skippedIndices: new Set(validated.skipped_indices),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      logger.warn("AI batch extraction attempt failed", {
        requestId,
        attempt,
        maxAttempts,
        batchSize: batch.length,
        error: message,
      });

      if (attempt < maxAttempts) {
        await sleep(2000 * attempt);
        continue;
      }

      throw new AppError(
        ERROR_CODES.AI_ERROR,
        `AI extraction failed after ${maxAttempts} attempts: ${message}`,
        502,
      );
    }
  }

  throw new AppError(ERROR_CODES.AI_ERROR, "AI extraction failed unexpectedly.", 502);
}
