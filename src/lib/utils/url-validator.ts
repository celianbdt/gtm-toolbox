export function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Block private IPs, localhost, metadata endpoints
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    )
      return false;
    if (
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.")
    )
      return false;
    if (hostname === "169.254.169.254") return false; // AWS metadata
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      return false;
    return true;
  } catch {
    return false;
  }
}
