const allowedHosts = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
  "pro.tiktok.com",
]);

export function parseTikTokUrl(input) {
  if (typeof input !== "string" || input.length > 2048) {
    throw new Error("Invalid TikTok link");
  }
  const url = new URL(input.trim());
  if (
    url.protocol !== "https:" ||
    !allowedHosts.has(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname === "/"
  ) {
    throw new Error("Invalid TikTok link");
  }

  // Pro share links use the same video/share paths on the main TikTok host.
  // Normalize before sending to the existing backend and video provider.
  if (url.hostname === "pro.tiktok.com") url.hostname = "www.tiktok.com";
  return url;
}
