# TikZuno for iPhone

This app bundles TikZuno's React interface with Capacitor. Video lookups use
`https://tikzuno.vercel.app/api/video`. The server and RapidAPI key remain on Vercel;
the IPA contains no API key. Internet access and the existing API quota are required.

## Get the IPA

1. Open the repository's **Actions** tab, then **Build TikZuno IPA**.
2. Open a successful run. Download the **TikZuno-IPA** artifact from its Artifacts section.
3. Unzip the download in Files on your iPhone. The app file is **TikZuno-unsigned.ipa**.
4. Import that IPA into GBox and sign it with your own valid certificate and matching
   provisioning profile, then install it. No signing credentials belong in this repository.

The first build runs on this pull request. Once the workflow is on the default branch,
**Run workflow** also lets you build an update manually. The bundle ID is
`app.tikzuno.mobile`; your profile must permit it (or a compatible wildcard).
GBox signing availability depends on your certificate and device. An expired or
revoked certificate may prevent the app from opening.

## Using the app

Paste a TikTok link, select **Find video**, then **Save video**. The app downloads a
temporary MP4 and opens the iOS share menu. Choose **Save Video** to save to Photos
(if offered) or **Save to Files**. Temporary copies are deleted when sharing finishes
or fails. Closing the menu does not itself save the video.

Use clips you own or have permission to download. Video URLs can expire; find the
video again if a preview or download stops working. Keep the app open while saving.

## Development

- Node 24, Xcode 26 or later, and iOS 15 or later.
- Run `npm ci`, `npm test`, `npm run lint`, and `npm run ios:sync` in `web`.
- On a Mac, `npm run ios:open` opens the project in Xcode.
- GitHub's macOS runner builds for a physical iPhone and packages an **unsigned** IPA.
  It uses GitHub Actions minutes under the repository owner's plan.
- The browser's original download flow stays available. The native branch uses
  Capacitor HTTP, Clipboard, File Transfer, Filesystem, Share, and Browser plugins.
- Interface changes require a new IPA; server changes deploy through Vercel.

## Device verification

After installation, verify: launch and icon, Paste, a valid video lookup, invalid link,
offline error, preview playback, Save to Files, Save Video, cancelled share menu,
and a second download. Mocked bridge tests cover backend errors and cleanup, but do
not replace checking the signed app on a real iPhone.
