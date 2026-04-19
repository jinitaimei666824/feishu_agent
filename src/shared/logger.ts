type Meta = Record<string, unknown> | undefined;

function format(level: string, message: string, meta?: Meta): string {
  const ts = new Date().toISOString();
  const detail = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] [${level}] ${message}${detail}`;
}

export const logger = {
  info(message: string, meta?: Meta): void {
    console.log(format("INFO", message, meta));
  },
  warn(message: string, meta?: Meta): void {
    console.warn(format("WARN", message, meta));
  },
  error(message: string, meta?: Meta): void {
    console.error(format("ERROR", message, meta));
  },
};
