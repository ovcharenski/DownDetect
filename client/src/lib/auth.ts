function isValidAsciiKey(key: string): boolean {
  // HTTP headers must contain only ASCII characters (0-127)
  return /^[\x00-\x7F]*$/.test(key);
}

export function getAccessKey(): string | null {
  // Prefer client-side env variables if available (Vite-style)
  const env = (import.meta as any).env ?? {};
  const envKey = (env.VITE_KEY_ACCESS || env.KEY_ACCESS) as string | undefined;

  // Debug logging (remove in production)
  if (typeof window !== "undefined" && (import.meta as any).env?.MODE === "development") {
    console.log("[AUTH] VITE_KEY_ACCESS from env:", envKey ? "***" + envKey.slice(-4) : "not set");
  }

  if (typeof window === "undefined") {
    return envKey ?? null;
  }

  // Reuse key if the user has already entered it in this browser
  const storedKey = window.localStorage.getItem("KEY_ACCESS");
  if (storedKey) {
    if (!isValidAsciiKey(storedKey)) {
      // Clear invalid key and prompt again
      window.localStorage.removeItem("KEY_ACCESS");
      const newKey = window.prompt(
        "KEY_ACCESS must contain only ASCII characters (letters, numbers, symbols). Enter a valid key:"
      )?.trim();
      if (newKey && isValidAsciiKey(newKey)) {
        window.localStorage.setItem("KEY_ACCESS", newKey);
        return newKey;
      }
      return null;
    }
    return storedKey;
  }

  // Validate env key if present
  if (envKey && !isValidAsciiKey(envKey)) {
    console.warn("VITE_KEY_ACCESS contains non-ASCII characters. HTTP headers require ASCII-only values.");
    const newKey = window.prompt(
      "KEY_ACCESS must contain only ASCII characters (letters, numbers, symbols). Enter a valid key:"
    )?.trim();
    if (newKey && isValidAsciiKey(newKey)) {
      window.localStorage.setItem("KEY_ACCESS", newKey);
      return newKey;
    }
    return null;
  }

  // Prompt user to enter KEY_ACCESS (empty field, no default value)
  const entered = window.prompt("Enter KEY_ACCESS to manage applications:")?.trim();

  if (!entered) {
    return null;
  }

  if (!isValidAsciiKey(entered)) {
    alert("KEY_ACCESS must contain only ASCII characters (letters, numbers, symbols). Please use a key with only English letters, numbers, and common symbols.");
    return null;
  }

  window.localStorage.setItem("KEY_ACCESS", entered);
  return entered;
}

export function withAuthHeaders(base: HeadersInit = {}): HeadersInit {
  const key = getAccessKey();
  if (!key) return base;

  return {
    ...base,
    Authorization: `Bearer ${key}`,
  };
}

