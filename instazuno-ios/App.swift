import SwiftUI
import WebKit
import UIKit

@main
struct InstazunoApp: App {
    var body: some Scene {
        WindowGroup { BrowserView().preferredColorScheme(.light) }
    }
}

struct BrowserView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> BrowserController { BrowserController() }
    func updateUIViewController(_ controller: BrowserController, context: Context) {}
}

final class BrowserController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    private let home = URL(string: "https://instazuno.vercel.app")!
    private var webView: WKWebView!
    private let pageProgress = UIProgressView(progressViewStyle: .bar)
    private var progressObservation: NSKeyValueObservation?
    private let downloadPanel = UIStackView()
    private let spinner = UIActivityIndicatorView(style: .medium)
    private var activeDownload: WKDownload?
    private var destination: URL?
    private let downloadsFolder = FileManager.default.temporaryDirectory.appendingPathComponent("InstazunoDownloads", isDirectory: true)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        try? FileManager.default.removeItem(at: downloadsFolder)
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .white
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        pageProgress.tintColor = UIColor(red: 0.81, green: 0.15, blue: 0.50, alpha: 1)
        pageProgress.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(pageProgress)
        NSLayoutConstraint.activate([
            pageProgress.topAnchor.constraint(equalTo: webView.topAnchor),
            pageProgress.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            pageProgress.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] web, _ in
            self?.pageProgress.progress = Float(web.estimatedProgress)
            self?.pageProgress.isHidden = web.estimatedProgress >= 1
        }
        configureDownloadPanel()
        webView.load(URLRequest(url: home))
    }

    private func configureDownloadPanel() {
        downloadPanel.axis = .horizontal
        downloadPanel.spacing = 12
        downloadPanel.alignment = .center
        downloadPanel.backgroundColor = UIColor(red: 1, green: 0.95, blue: 0.97, alpha: 1)
        downloadPanel.layer.cornerRadius = 12
        downloadPanel.isLayoutMarginsRelativeArrangement = true
        downloadPanel.layoutMargins = UIEdgeInsets(top: 16, left: 16, bottom: 16, right: 16)
        let label = UILabel()
        label.text = "Preparing your download…"
        label.font = .preferredFont(forTextStyle: .subheadline)
        label.adjustsFontForContentSizeCategory = true
        label.numberOfLines = 0
        let cancel = UIButton(type: .system)
        cancel.setTitle("Cancel", for: .normal)
        cancel.addTarget(self, action: #selector(cancelDownload), for: .touchUpInside)
        downloadPanel.addArrangedSubview(spinner)
        downloadPanel.addArrangedSubview(label)
        downloadPanel.addArrangedSubview(cancel)
        downloadPanel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(downloadPanel)
        NSLayoutConstraint.activate([
            downloadPanel.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            downloadPanel.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
            downloadPanel.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12)
        ])
        downloadPanel.isHidden = true
    }

    private func trusted(_ url: URL) -> Bool {
        url.scheme == "https" && url.host == home.host && url.user == nil && url.password == nil && (url.port == nil || url.port == 443)
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if trusted(url) {
            if action.shouldPerformDownload || (url.path == "/api/media" && action.navigationType == .linkActivated) {
                guard activeDownload == nil, presentedViewController == nil else { decisionHandler(.cancel); return }
                decisionHandler(.download)
            } else { decisionHandler(.allow) }
        } else {
            decisionHandler(.cancel)
            if action.navigationType == .linkActivated && ["https", "http", "mailto"].contains(url.scheme ?? "") {
                UIApplication.shared.open(url)
            }
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        let disposition = (response.response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Disposition") ?? ""
        if disposition.lowercased().hasPrefix("attachment") {
            decisionHandler(activeDownload == nil ? .download : .cancel)
        } else { decisionHandler(response.canShowMIMEType ? .allow : .cancel) }
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { begin(download) }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { begin(download) }

    private func begin(_ download: WKDownload) {
        guard activeDownload == nil else { download.cancel { _ in }; return }
        activeDownload = download
        download.delegate = self
        downloadPanel.isHidden = false
        spinner.startAnimating()
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let url = response.url, trusted(url),
              let mime = response.mimeType, mime.hasPrefix("video/") || mime.hasPrefix("image/") else {
            completionHandler(nil)
            finishDownload()
            showError("This download is unavailable or expired. Find the Instagram link again and retry.")
            return
        }
        do {
            let folder = downloadsFolder.appendingPathComponent(UUID().uuidString, isDirectory: true)
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let fileExtension = mime.hasPrefix("video/") ? "mp4" : (mime == "image/png" ? "png" : "jpg")
            let file = folder.appendingPathComponent("Instazuno.\(fileExtension)")
            destination = file
            completionHandler(file)
        } catch {
            completionHandler(nil)
            finishDownload()
            showError("There isn’t enough space to prepare this file. Free up space and try again.")
        }
    }

    func downloadDidFinish(_ download: WKDownload) {
        guard activeDownload === download, let file = destination else { return }
        finishDownload(removeFile: false)
        let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
        share.popoverPresentationController?.sourceView = view
        share.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.maxY - 40, width: 1, height: 1)
        share.completionWithItemsHandler = { _, _, _, _ in
            try? FileManager.default.removeItem(at: file.deletingLastPathComponent())
        }
        present(share, animated: true)
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        guard activeDownload === download else { return }
        finishDownload()
        if (error as NSError).code != NSURLErrorCancelled {
            showError("The file couldn’t finish downloading. Check your connection and try again.")
        }
    }

    @objc private func cancelDownload() {
        let download = activeDownload
        finishDownload()
        download?.cancel { _ in }
    }

    private func finishDownload(removeFile: Bool = true) {
        if removeFile, let file = destination { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
        destination = nil
        activeDownload = nil
        spinner.stopAnimating()
        downloadPanel.isHidden = true
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { navigationFailed(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { navigationFailed(error) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }

    private func navigationFailed(_ error: Error) {
        let nsError = error as NSError
        if nsError.code == NSURLErrorCancelled || (nsError.domain == "WebKitErrorDomain" && nsError.code == 102) { return }
        pageProgress.isHidden = true
        guard presentedViewController == nil else { return }
        let alert = UIAlertController(title: "Can’t load Instazuno", message: "Check your internet connection, then try again.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Retry", style: .default) { [weak self] _ in
            guard let self = self else { return }
            self.webView.load(URLRequest(url: self.home))
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }

    private func showError(_ message: String) {
        guard presentedViewController == nil else { return }
        let alert = UIAlertController(title: "Download unavailable", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}
