# Instazuno for iPhone

This native Swift/WebKit app opens https://instazuno.vercel.app. Website updates appear without rebuilding the app. Downloads use WebKit's download delegate and open the iOS share sheet for Save Video, Save Image, or Save to Files. Keep the app open until the share sheet appears. Only download media you own or have permission to save.

The FastSaver key stays on Vercel and is never included in this app. Internet access and available provider credits are required.

## Install with GBox

Download Instazuno-unsigned.ipa, import it into GBox, and sign using your own valid certificate and compatible provisioning profile. Install the signed app. Bundle identifier: app.instazuno.mobile. Requires iOS 15 or newer. Use the same working signing setup as TikZuno; your profile must permit this app identifier or an appropriate wildcard. Do not upload signing credentials to GitHub.

## Build

On a Mac with Xcode 26 and XcodeGen, run `swift make_icon.swift`, `xcodegen generate`, then build the Instazuno scheme for a generic iOS device with code signing disabled. The dedicated GitHub workflow builds and packages the unsigned IPA.

This folder and its workflow are independent of TikZuno's website and app. The build lives on the codex-instazuno-ios branch.

## Device checks

After signing, verify launch, Paste, an Instagram lookup, preview, video and photo downloads, the share sheet, cancel, a second download, TikZuno's external link, and offline retry. A successful Xcode build does not verify GBox signing or behavior on a physical iPhone.
