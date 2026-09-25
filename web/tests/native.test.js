import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

let response;
let transferError;
let shareError;
let size;
let events;
let request;
const plugin = (name, namedExports) => mock.module(name, { namedExports });
plugin("@capacitor/core", {
  Capacitor: { isNativePlatform: () => true },
  CapacitorHttp: { post: async (options) => { request = options; return response; } },
});
plugin("@capacitor/browser", { Browser: { open: async () => {} } });
plugin("@capacitor/clipboard", { Clipboard: { read: async () => ({ value: "link", type: "text/plain" }) } });
plugin("@capacitor/file-transfer", { FileTransfer: {
  addListener: async () => ({ remove: async () => { events.push("remove listener"); } }),
  downloadFile: async () => {
    events.push("download");
    if (transferError) throw transferError;
  },
} });
plugin("@capacitor/filesystem", {
  Directory: { Cache: "CACHE" },
  Filesystem: {
    getUri: async () => ({ uri: "file:///cache/video.mp4" }),
    stat: async () => ({ size }),
    deleteFile: async () => { events.push("delete temporary file"); },
  },
});
plugin("@capacitor/share", { Share: { share: async (options) => {
  assert.deepEqual(options.files, ["file:///cache/video.mp4"]);
  events.push("share");
  if (shareError) throw shareError;
} } });

const { requestVideo, saveNativeVideo } = await import("../src/native.js");
const videoUrl = "https://v16m.tiktokcdn-us.com/test.mp4";
beforeEach(() => {
  response = { status: 200, data: { videoUrl } };
  transferError = null;
  shareError = null;
  events = [];
  size = 1000;
});

test("native lookup uses the production backend, not localhost or a client API key", async () => {
  const link = "https://www.tiktok.com/@test/video/123";
  const result = await requestVideo(link);
  assert.equal(result.ok, true);
  assert.equal(result.data.videoUrl, videoUrl);
  assert.equal(request.url, "https://tikzuno.vercel.app/api/video");
  assert.deepEqual(request.data, { url: link });
  assert.deepEqual(request.headers, { "Content-Type": "application/json", Accept: "application/json" });
});

test("backend rate limits stay errors", async () => {
  response = { status: 429, data: { error: "Please wait" } };
  assert.deepEqual(await requestVideo("link"), { ok: false, data: response.data });
});

test("HTML service failures do not get treated as video responses", async () => {
  response = { status: 502, data: "<html>Bad gateway</html>" };
  assert.deepEqual(await requestVideo("link"), { ok: false, data: null });
});

test("temporary download is shared before cleanup", async () => {
  const message = await saveNativeVideo(videoUrl, () => {});
  assert.match(message, /Share menu closed/);
  assert.deepEqual(events, ["download", "share", "remove listener", "delete temporary file"]);
});

test("failed transfers never open share and still clean partial files", async () => {
  transferError = new Error("Network unavailable");
  await assert.rejects(saveNativeVideo(videoUrl, () => {}), /Network unavailable/);
  assert.deepEqual(events, ["download", "remove listener", "delete temporary file"]);
});

test("empty downloads are rejected", async () => {
  size = 0;
  await assert.rejects(saveNativeVideo(videoUrl, () => {}), /empty/);
  assert.ok(!events.includes("share"));
  assert.ok(events.includes("delete temporary file"));
});

test("share cancellation still releases files and progress listeners", async () => {
  shareError = new Error("Share cancelled");
  await assert.rejects(saveNativeVideo(videoUrl, () => {}), /cancelled/);
  assert.deepEqual(events, ["download", "share", "remove listener", "delete temporary file"]);
});

test("unsafe video URLs are rejected before downloading", async () => {
  for (const url of ["http://example.com/video.mp4", "file:///etc/passwd", "https://user:pass@example.com/v.mp4"]) {
    await assert.rejects(saveNativeVideo(url, () => {}), /invalid/);
  }
  assert.deepEqual(events, []);
});
