import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Clipboard } from "@capacitor/clipboard";
import { FileTransfer } from "@capacitor/file-transfer";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export const isNative = Capacitor.isNativePlatform();
const API_URL = "https://tikzuno.vercel.app/api/video";

export async function readClipboard() {
  if (!isNative) return navigator.clipboard.readText();
  const { value, type } = await Clipboard.read();
  return type === "text/plain" ? value : "";
}

export async function requestVideo(url) {
  if (isNative) {
    // Native HTTP connects to the same backend without a WebView CORS exception.
    // The RapidAPI key belongs only in Vercel's server environment.
    const response = await CapacitorHttp.post({
      url: API_URL,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      data: { url },
      responseType: "json",
      connectTimeout: 30000,
      readTimeout: 30000,
      disableRedirects: true,
    });
    return {
      ok: response.status >= 200 && response.status < 300,
      data: response.data && typeof response.data === "object" ? response.data : null,
    };
  }

  const response = await fetch("/api/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(30000),
  });
  return { ok: response.ok, data: await response.json().catch(() => null) };
}

function secureUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("The video link is invalid. Find the video again.");
  }
  return url.href;
}

export async function saveNativeVideo(videoUrl, onStatus) {
  const url = secureUrl(videoUrl);
  const path = `tikzuno-${crypto.randomUUID()}.mp4`;
  const directory = Directory.Cache;
  const { uri } = await Filesystem.getUri({ path, directory });
  let listener;
  try {
    listener = await FileTransfer.addListener("progress", (event) => {
      if (event.url !== url) return;
      if (event.contentLength > 0) {
        const percent = Math.min(100, Math.round(event.bytes / event.contentLength * 100));
        onStatus(`Downloading video… ${percent}%`);
      }
    });
    await FileTransfer.downloadFile({
      url,
      path: uri,
      progress: true,
      connectTimeout: 60000,
      readTimeout: 60000,
    });
    const file = await Filesystem.stat({ path, directory });
    if (!file.size) throw new Error("The video file was empty. Find the video again.");
    onStatus("Choose Save Video or Save to Files in the share menu.");
    await Share.share({ title: "TikZuno video", files: [uri] });
    // A dismissed share sheet doesn't reliably indicate whether a file was saved.
    return "Share menu closed. You can tap Save video to open it again.";
  } finally {
    if (listener) await listener.remove().catch(() => {});
    // The share operation completes before temporary files are removed.
    await Filesystem.deleteFile({ path, directory }).catch(() => {});
  }
}

export async function openNativeVideo(url) {
  await Browser.open({ url: secureUrl(url), presentationStyle: "popover" });
}
