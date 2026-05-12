// HexStrike AI v6.0 — Dual-Model API Client
// Gemini 2.5 Flash (Strategic Commander) + Devstral via Mistral (Tactical Executor)

// ===== TYPES =====
export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// ===== GEMINI 2.5 FLASH — Strategic Commander =====
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function callGeminiAPI(
  messages: ModelMessage[],
  temperature: number = 0.3,
  maxTokens: number = 8192
): Promise<{ content: string; model: string; tokens: number }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API Key not found. Ensure GEMINI_API_KEY is set in .env");
  }

  try {
    // Extract system prompt
    let systemInstruction: string | undefined;
    const geminiContents: GeminiContent[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = (systemInstruction || "") + msg.content + "\n";
      } else {
        geminiContents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Ensure conversation starts with "user" role (Gemini requirement)
    if (geminiContents.length > 0 && geminiContents[0].role === "model") {
      geminiContents.unshift({
        role: "user",
        parts: [{ text: "." }],
      });
    }

    const body: Record<string, any> = {
      contents: geminiContents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    // Add system instruction if present
    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction.trim() }],
      };
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `HTTP Error: ${response.status}`;

      if (response.status === 400) {
        throw new Error(`Gemini API request error: ${errorMessage}`);
      }
      if (response.status === 403) {
        throw new Error("Gemini API Key is invalid or does not have access.");
      }
      if (response.status === 429) {
        throw new Error("Gemini rate limit reached. Please try again in a moment.");
      }
      if (response.status >= 500) {
        throw new Error("Gemini API server is experiencing issues.");
      }

      throw new Error(`Failed to call Gemini API: ${errorMessage}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini model.");
    }

    const text = data.candidates[0]?.content?.parts?.map(p => p.text).join("") || "";
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    return {
      content: text,
      model: "gemini-2.5-flash",
      tokens,
    };
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith("Gemini API") ||
      error.message.startsWith("Failed to call") ||
      error.message.startsWith("No response")
    )) {
      throw error;
    }

    if (error instanceof TypeError && error.message === "fetch failed") {
      throw new Error("Failed to connect to Gemini API server.");
    }

    throw new Error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// ===== MISTRAL / DEVSTRAL — Tactical Executor =====
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

export async function callMistralAPI(
  messages: ModelMessage[],
  model: string = "devstral-small-latest",
  temperature: number = 0.2,
  maxTokens: number = 8192
): Promise<{ content: string; model: string; tokens: number }> {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new Error("Mistral API Key not found. Ensure MISTRAL_API_KEY is set in .env");
  }

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.message || `HTTP Error: ${response.status}`;

      if (response.status === 401) {
        throw new Error("Mistral API Key is invalid or expired.");
      }
      if (response.status === 429) {
        throw new Error("Mistral rate limit reached. Please try again in a moment.");
      }
      if (response.status === 500 || response.status === 502 || response.status === 503) {
        throw new Error("Mistral API server is experiencing issues.");
      }

      throw new Error(`Failed to call Mistral API: ${errorMessage}`);
    }

    const data: any = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from Mistral model.");
    }

    return {
      content: data.choices[0].message.content,
      model: data.model,
      tokens: data.usage?.total_tokens || 0,
    };
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith("Mistral API") ||
      error.message.startsWith("Failed to call") ||
      error.message.startsWith("No response")
    )) {
      throw error;
    }

    if (error instanceof TypeError && error.message === "fetch failed") {
      throw new Error("Failed to connect to Mistral AI server.");
    }

    throw new Error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// ===== UNIFIED CALL — Route to correct provider =====
export async function callModelAPI(
  messages: ModelMessage[],
  model: string,
  modelProvider: "gemini" | "mistral",
  temperature: number = 0.3,
  maxTokens: number = 8192
): Promise<{ content: string; model: string; tokens: number }> {
  if (modelProvider === "gemini") {
    return callGeminiAPI(messages, temperature, maxTokens);
  }
  return callMistralAPI(messages, model, temperature, maxTokens);
}

// ===== FALLBACK CHAIN =====
export async function callWithFallback(
  messages: ModelMessage[],
  primaryModel: string,
  primaryProvider: "gemini" | "mistral",
  temperature: number,
  maxTokens: number
): Promise<{ content: string; model: string; tokens: string; responseTimeMs: number }> {
  const startTime = Date.now();
  try {
    const result = await callModelAPI(messages, primaryModel, primaryProvider, temperature, maxTokens);
    return {
      content: result.content,
      model: result.model,
      tokens: String(result.tokens),
      responseTimeMs: Date.now() - startTime,
    };
  } catch (primaryError) {
    console.warn(`[HexStrike] Primary model (${primaryModel}/${primaryProvider}) failed, trying fallback...`, primaryError);

    // Fallback: try the other provider
    const fallbackProvider = primaryProvider === "gemini" ? "mistral" : "gemini";
    const fallbackModel = fallbackProvider === "gemini" ? "gemini-2.5-flash" : "devstral-small-latest";

    try {
      const result = await callModelAPI(messages, fallbackModel, fallbackProvider, temperature, Math.min(maxTokens, 4096));
      return {
        content: result.content,
        model: result.model,
        tokens: String(result.tokens),
        responseTimeMs: Date.now() - startTime,
      };
    } catch (fallbackError) {
      console.error(`[HexStrike] Fallback model also failed:`, fallbackError);
      throw new Error("All AI models are currently unavailable. Please try again later.");
    }
  }
}

// ===== TOOL-AUGMENTED CALLS =====
export async function callModelWithTools(
  messages: ModelMessage[],
  toolsContext: string,
  model: string,
  modelProvider: "gemini" | "mistral",
  temperature: number = 0.3,
  maxTokens: number = 8192
): Promise<{ content: string; model: string; tokens: number }> {
  const enhancedMessages: ModelMessage[] = messages.map((msg, i) => {
    if (i === 0 && msg.role === "system") {
      return {
        role: msg.role,
        content: `${msg.content}\n\n${toolsContext}`,
      };
    }
    return msg;
  });

  if (enhancedMessages.length > 0 && enhancedMessages[0].role !== "system") {
    enhancedMessages.unshift({
      role: "system",
      content: toolsContext,
    });
  }

  return callModelAPI(enhancedMessages, model, modelProvider, temperature, maxTokens);
}
