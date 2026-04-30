/** OpenRouter chat API headers (see https://openrouter.ai/docs). Use standard `Referer` for fetch. */
export function openRouterHeaders(
  apiKey: string,
  userAgent: string,
): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": userAgent,
  };
  const referer = Deno.env.get("OPENROUTER_HTTP_REFERER");
  const title = Deno.env.get("OPENROUTER_APP_TITLE") || "SR&ED GPT";
  if (referer) {
    h.Referer = referer;
  }
  h["X-Title"] = title;
  return h;
}
