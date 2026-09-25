import express from "express";

const app = express();

const API_HOST = "tiktok-scraper7.p.rapidapi.com";
const API_KEY = process.env.RAPIDAPI_KEY?.trim();

if (!API_KEY || API_KEY === "PASTE_YOUR_API_KEY_HERE") {
  console.error(
    "Missing API key. Add RAPIDAPI_KEY to web/.env, then run npm run dev."
  );
  process.exit(1);
}

app.disable("x-powered-by");
app.use(express.json({ limit: "4kb" }));

const allowedHosts = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
]);

let busy = false;
let nextRequestAt = 0;

function safeHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/video", async (req, res) => {
  res.set("Cache-Control", "no-store");

  let videoLink;

  try {
    const input = req.body?.url;

    if (typeof input !== "string" || input.length > 2048) {
      throw new Error("Invalid input");
    }

    videoLink = new URL(input.trim());

    if (
      videoLink.protocol !== "https:" ||
      !allowedHosts.has(videoLink.hostname) ||
      videoLink.username ||
      videoLink.password ||
      videoLink.port ||
      videoLink.pathname === "/"
    ) {
      throw new Error("Invalid TikTok link");
    }
  } catch {
    return res.status(400).json({
      error: "Please paste a valid TikTok video link.",
    });
  }

  if (busy || Date.now() < nextRequestAt) {
    return res.status(429).json({
      error: "Please wait a few seconds and try again.",
    });
  }

  busy = true;
  nextRequestAt = Date.now() + 2000;

  try {
    const endpoint = new URL(`https://${API_HOST}/`);
    endpoint.searchParams.set("url", videoLink.href);

    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST,
      },
      redirect: "error",
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      console.error(
        `RapidAPI request failed: HTTP ${response.status}`
      );

      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({
          error:
            "Video service authorization failed. Check the API key and subscription.",
        });
      }

      if (response.status === 429) {
        return res.status(429).json({
          error:
            "The video service request limit has been reached. Please try again later.",
        });
      }

      throw new Error(
        `RapidAPI returned HTTP ${response.status}`
      );
    }

    const responseText = await response.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        "RapidAPI returned an unexpected response instead of JSON."
      );
    }

    if (!result || result.code !== 0 || !result.data) {
      console.error("RapidAPI could not resolve the video:", {
        code: result?.code,
      });

      return res.status(422).json({
        error:
          "Could not find this video. Try another public video link.",
      });
    }

    const data = result.data;

    if (Array.isArray(data.images) && data.images.length > 0) {
      return res.status(422).json({
        error: "This is a photo post. Please use a video link.",
      });
    }

    const videoUrl = safeHttpsUrl(data.play);

    if (!videoUrl) {
      return res.status(422).json({
        error: "The service did not return a usable video link.",
      });
    }

    return res.json({
      title:
        typeof data.title === "string"
          ? data.title
          : "TikTok video",
      author:
        typeof data.author?.nickname === "string"
          ? data.author.nickname
          : "",
      cover: safeHttpsUrl(data.cover),
      videoUrl,
    });
  } catch (error) {
    console.error("Video request failed:", {
      message: error.message,
      code: error.cause?.code,
    });

    const timedOut = error.name === "TimeoutError";

    return res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? "The video service took too long. Please try again."
        : "The video service could not be reached. Please try again later.",
    });
  } finally {
    busy = false;
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  return res.status(400).json({
    error: "Invalid request. Please check your link.",
  });
});

const server = app.listen(3001, "127.0.0.1", () => {
  console.log("ClipSave server ready on port 3001 — using RapidAPI");
});

server.on("error", (error) => {
  console.error("Server could not start:", error.message);
  process.exit(1);
});