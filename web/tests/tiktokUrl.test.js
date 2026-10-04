import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTikTokUrl } from "../src/tiktokUrl.js";

test("Pro short links become standard links accepted by the production backend", () => {
  assert.equal(
    parseTikTokUrl("https://pro.tiktok.com/t/ZTy6o1HKK/").href,
    "https://www.tiktok.com/t/ZTy6o1HKK/",
  );
});

test("Pro video paths and query parameters survive normalization", () => {
  assert.equal(
    parseTikTokUrl("  https://pro.tiktok.com/@user/video/123?lang=en  ").href,
    "https://www.tiktok.com/@user/video/123?lang=en",
  );
});

test("existing supported hosts retain their URLs", () => {
  for (const host of ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]) {
    const url = `https://${host}/t/example/`;
    assert.equal(parseTikTokUrl(url).href, url);
  }
});

test("normalization does not admit lookalike domains or unsafe URLs", () => {
  for (const input of [
    "https://pro.tiktok.com.evil.example/t/123/",
    "https://evil.example/pro.tiktok.com/t/123/",
    "https://pro.tiktok.com@evil.example/t/123/",
    "https://user:pass@pro.tiktok.com/t/123/",
    "https://pro.tiktok.com:8443/t/123/",
    "http://pro.tiktok.com/t/123/",
    "https://pro.tiktok.com/",
    "https://pro.tiktok.com/" + "x".repeat(2048),
    "not a URL", null,
  ]) {
    assert.throws(() => parseTikTokUrl(input));
  }
});
