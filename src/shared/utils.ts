// @ts-ignore
export function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

// @ts-ignore
export function ensureArray<T>(value: T[] | undefined): T[] {
  return value ?? [];
}

// @ts-ignore
export function extractJsonObject(raw: string): string {
  const text = raw.trim();
  if (text.startsWith("{") && text.endsWith("}")) {
    return text;
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  throw new Error("模型返回中未找到有效 JSON 对象");
}