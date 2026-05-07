// Cerberus AI v4.0 — Mistral API Client
// Direct REST API integration with Tool-Augmented support

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

export interface MistralMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callMistralAPI(
  messages: MistralMessage[],
  model: string = "mistral-large-latest",
  temperature: number = 0.3,
  maxTokens: number = 4096
): Promise<{ content: string; model: string; tokens: number }> {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new Error("API Key Mistral tidak ditemukan. Pastikan MISTRAL_API_KEY sudah diatur di file .env");
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
        throw new Error("API Key Mistral tidak valid atau sudah kadaluarsa.");
      }
      if (response.status === 429) {
        throw new Error("Rate limit tercapai. Silakan coba lagi dalam beberapa saat.");
      }
      if (response.status === 500 || response.status === 502 || response.status === 503) {
        throw new Error("Server Mistral sedang mengalami gangguan.");
      }

      throw new Error(`Gagal memanggil Mistral API: ${errorMessage}`);
    }

    const data: MistralResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("Tidak ada respons dari model AI.");
    }

    return {
      content: data.choices[0].message.content,
      model: data.model,
      tokens: data.usage?.total_tokens || 0,
    };
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith("API Key") ||
      error.message.startsWith("Rate limit") ||
      error.message.startsWith("Server Mistral") ||
      error.message.startsWith("Gagal memanggil") ||
      error.message.startsWith("Tidak ada respons")
    )) {
      throw error;
    }

    if (error instanceof TypeError && error.message === "fetch failed") {
      throw new Error("Gagal terhubung ke server Mistral AI.");
    }

    throw new Error(`Terjadi kesalahan: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Streaming function — returns raw SSE stream from Mistral
export async function streamMistralAPI(
  messages: MistralMessage[],
  model: string = "mistral-large-latest",
  temperature: number = 0.3,
  maxTokens: number = 4096
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("API Key Mistral tidak ditemukan.");

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
      stream: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("API Key Mistral tidak valid.");
    if (response.status === 429) throw new Error("Rate limit tercapai.");
    throw new Error(`Mistral API error: ${response.status}`);
  }

  if (!response.body) throw new Error("No response body");

  return response.body;
}

// Tool-Augmented LLM call: embeds tool definitions into system prompt and supports agent loop
export async function callMistralWithTools(
  messages: MistralMessage[],
  toolsContext: string,
  model: string = "mistral-large-latest",
  temperature: number = 0.3,
  maxTokens: number = 8192
): Promise<{ content: string; model: string; tokens: number }> {
  // Inject tools into the system message
  const enhancedMessages: MistralMessage[] = messages.map((msg, i) => {
    if (i === 0 && msg.role === "system") {
      return {
        role: msg.role,
        content: `${msg.content}\n\n${toolsContext}`,
      };
    }
    return msg;
  });

  // If first message isn't system, prepend tools
  if (enhancedMessages.length > 0 && enhancedMessages[0].role !== "system") {
    enhancedMessages.unshift({
      role: "system",
      content: toolsContext,
    });
  }

  return callMistralAPI(enhancedMessages, model, temperature, maxTokens);
}

// Streaming version with tools
export async function streamMistralWithTools(
  messages: MistralMessage[],
  toolsContext: string,
  model: string = "mistral-large-latest",
  temperature: number = 0.3,
  maxTokens: number = 8192
): Promise<ReadableStream<Uint8Array>> {
  const enhancedMessages: MistralMessage[] = messages.map((msg, i) => {
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

  return streamMistralAPI(enhancedMessages, model, temperature, maxTokens);
}

// Fallback function
export async function callWithFallback(
  messages: MistralMessage[],
  primaryModel: string,
  temperature: number,
  maxTokens: number
): Promise<{ content: string; model: string; tokens: string; responseTimeMs: number }> {
  const startTime = Date.now();
  try {
    const result = await callMistralAPI(messages, primaryModel, temperature, maxTokens);
    return {
      content: result.content,
      model: result.model,
      tokens: String(result.tokens),
      responseTimeMs: Date.now() - startTime,
    };
  } catch (primaryError) {
    console.warn(`[Cerberus] Model utama (${primaryModel}) gagal, mencoba fallback...`, primaryError);
    try {
      const result = await callMistralAPI(
        messages,
        "mistral-small-latest",
        temperature,
        Math.min(maxTokens, 512)
      );
      return {
        content: result.content,
        model: result.model,
        tokens: String(result.tokens),
        responseTimeMs: Date.now() - startTime,
      };
    } catch (fallbackError) {
      console.error(`[Cerberus] Model fallback juga gagal:`, fallbackError);
      throw new Error("Semua model AI sedang tidak tersedia.");
    }
  }
}
