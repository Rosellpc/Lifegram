export function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    const code = "code" in error && typeof error.code === "string"
      ? ` (${error.code})`
      : "";
    return `${error.message}${code}`;
  }
  return fallback;
}
