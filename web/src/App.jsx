import { useState } from "react";
import "./App.css";

const allowedHosts = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
]);

export default function App() {
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const busy = loading || saving;

  function updateLink(value) {
    setLink(value);
    setMessage("");
    setVideo(null);
  }

  async function pasteLink() {
    try {
      const text = await navigator.clipboard.readText();
      updateLink(text.trim());
    } catch {
      setMessage(
        "Press and hold the input, or use Ctrl + V to paste."
      );
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    setMessage("");
    setVideo(null);

    let url;

    try {
      url = new URL(link.trim());

      if (
        url.protocol !== "https:" ||
        !allowedHosts.has(url.hostname) ||
        url.username ||
        url.password ||
        url.port ||
        url.pathname === "/"
      ) {
        throw new Error("Invalid link");
      }
    } catch {
      setMessage("Please paste a valid TikTok video link.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.href }),
        signal: AbortSignal.timeout(30000),
      });

      const data = await response.json().catch(() => null);

      if (!data) {
        throw new Error(
          "Could not connect to the video service. Please try again."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Could not find this video."
        );
      }

      if (!data.videoUrl) {
        throw new Error("No video link was returned.");
      }

      setVideo(data);
      setMessage("Video found. Preview it below.");
    } catch (error) {
      if (error.name === "TimeoutError") {
        setMessage("The request took too long. Please try again.");
      } else if (error instanceof TypeError) {
        setMessage(
          "Could not connect. Check your connection and try again."
        );
      } else {
        setMessage(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function downloadVideo() {
    if (!video || busy) return;

    setSaving(true);
    setMessage("Preparing your download…");

    try {
      const response = await fetch(video.videoUrl, {
        credentials: "omit",
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        throw new Error("Video request failed");
      }

      const blob = await response.blob();

      if (
        !blob.size ||
        !/^(video\/|application\/octet-stream)/i.test(blob.type)
      ) {
        throw new Error("Invalid video file");
      }

      const fileUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = fileUrl;
      anchor.download = `clipsave-${Date.now()}.mp4`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);

      setMessage(
        "Download requested. Check your browser’s downloads."
      );
    } catch {
      setMessage(
        "Direct saving failed. Try Open video below, then use your browser’s save or share menu."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="site">
      <header className="header">
        <a className="brand" href="/" aria-label="ClipSave home">
          <span className="brand-icon" aria-hidden="true">↓</span>
          Clip<span>Save</span>
        </a>

        <a className="nav-link" href="#how-it-works">
          How it works ↗
        </a>
      </header>

      <main>
        <section className="hero">
          <div className="badge">
            <span /> LESS CLUTTER. MORE VIDEO.
          </div>

          <h1>
            Your favorite clips.
            <br />
            <span>A cleaner download.</span>
          </h1>

          <p className="intro">
            Save TikTok videos without the watermark.
            Paste your link below to get started.
          </p>

          <form
            className="download-card"
            onSubmit={handleSubmit}
            aria-busy={loading}
          >
            <label htmlFor="video-link">TikTok video link</label>

            <div className="input-row">
              <input
                id="video-link"
                type="url"
                placeholder="https://www.tiktok.com/@user/video/..."
                value={link}
                maxLength={2048}
                disabled={busy}
                onChange={(event) => updateLink(event.target.value)}
                aria-describedby="form-message"
                required
              />

              <button
                className="paste-button"
                type="button"
                onClick={pasteLink}
                disabled={busy}
              >
                Paste
              </button>
            </div>

            <button
              className="download-button"
              type="submit"
              disabled={busy}
            >
              {loading ? "Finding your video…" : "Find video ↗"}
            </button>

            <p id="form-message" className="message" role="status">
              {message ||
                "Use videos you own or have permission to download."}
            </p>
          </form>

          {video && (
            <section
              className="result-card"
              aria-label="Video result"
            >
              <video
                key={video.videoUrl}
                src={video.videoUrl}
                poster={video.cover || undefined}
                controls
                playsInline
                preload="none"
                onError={() =>
                  setMessage(
                    "The preview could not load. Try Open video, or find the video again to refresh its link."
                  )
                }
              />

              <div className="result-info">
                {video.author && (
                  <p className="result-author">{video.author}</p>
                )}

                <h2>{video.title || "TikTok video"}</h2>

                <button
                  className="download-button"
                  type="button"
                  onClick={downloadVideo}
                  disabled={busy}
                >
                  {saving
                    ? "Preparing download…"
                    : "Download video ↓"}
                </button>

                <a
                  className="open-video"
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open video ↗
                </a>
              </div>
            </section>
          )}

          <div className="features">
            <span>✦ Simple to use</span>
            <span>✦ Built for mobile</span>
            <span>✦ No account needed</span>
          </div>
        </section>

        <section
          className="steps-section"
          id="how-it-works"
        >
          <p className="eyebrow">THREE SIMPLE STEPS</p>
          <h2>From your feed to your files.</h2>

          <div className="steps">
            <article>
              <span className="step-number">01</span>
              <h3>Copy the link</h3>
              <p>
                Open a TikTok video, tap Share, then Copy link.
              </p>
            </article>

            <article>
              <span className="step-number">02</span>
              <h3>Drop it here</h3>
              <p>
                Paste the link above and select Find video.
              </p>
            </article>

            <article>
              <span className="step-number">03</span>
              <h3>Save your clip</h3>
              <p>
                Preview your video, then download the available file.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer>
        <span>© {new Date().getFullYear()} ClipSave</span>
        <span>Independent tool. Not affiliated with TikTok.</span>
      </footer>
    </div>
  );
}