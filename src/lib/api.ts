export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";

export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();

    try {
      const payload = JSON.parse(text) as { error?: string };
      throw new Error(payload.error ?? `Request failed (${response.status})`);
    } catch {
      throw new Error(text || `Request failed (${response.status})`);
    }
  }

  return (await response.json()) as T;
}
