// Cerberus AI - Mistral API Client Helper
// Direct REST API integration with Mistral AI

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

interface MistralMessage {
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
  model: string = "devstral-small-2507",
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
        throw new Error("Server Mistral sedang mengalami gangguan. Silakan coba lagi nanti.");
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
    // Re-throw known errors
    if (error instanceof Error && error.message.startsWith("API Key") || 
        error instanceof Error && error.message.startsWith("Rate limit") ||
        error instanceof Error && error.message.startsWith("Server Mistral") ||
        error instanceof Error && error.message.startsWith("Gagal memanggil") ||
        error instanceof Error && error.message.startsWith("Tidak ada respons")) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message === "fetch failed") {
      throw new Error("Gagal terhubung ke server Mistral AI. Periksa koneksi internet Anda.");
    }

    throw new Error(`Terjadi kesalahan yang tidak terduga: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Fallback function: try primary model, then fallback to ministral-3b-latest
export async function callWithFallback(
  messages: MistralMessage[],
  primaryModel: string,
  temperature: number,
  maxTokens: number
): Promise<{ content: string; model: string; tokens: string }> {
  try {
    const result = await callMistralAPI(messages, primaryModel, temperature, maxTokens);
    return {
      content: result.content,
      model: result.model,
      tokens: String(result.tokens),
    };
  } catch (primaryError) {
    console.warn(`[Cerberus] Model utama (${primaryModel}) gagal, mencoba fallback...`, primaryError);

    // Fallback to ministral-3b-latest
    try {
      const result = await callMistralAPI(
        messages,
        "ministral-3b-latest",
        temperature,
        Math.min(maxTokens, 512)
      );
      return {
        content: `[⚡ Respon dari model fallback]\n\n${result.content}`,
        model: result.model,
        tokens: String(result.tokens),
      };
    } catch (fallbackError) {
      console.error(`[Cerberus] Model fallback juga gagal:`, fallbackError);
      throw new Error(
        "Semua model AI sedang tidak tersedia. Silakan coba lagi dalam beberapa menit."
      );
    }
  }
}
