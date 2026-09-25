import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// Draw directly into an explicitly supported four-byte RGB context.
// AppKit's three-channel NSBitmapImageRep did not produce a drawing context.
func renderIcon(pixels: Int, destination: URL) throws {
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let context = CGContext(data: nil, width: pixels, height: pixels,
        bitsPerComponent: 8, bytesPerRow: pixels * 4, space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else {
        fatalError("Cannot create icon drawing context")
    }
    let scale = CGFloat(pixels) / 64
    context.translateBy(x: 0, y: CGFloat(pixels))
    context.scaleBy(x: scale, y: -scale)
    let colors = [
        CGColor(colorSpace: colorSpace, components: [229.0/255, 38.0/255, 136.0/255, 1])!,
        CGColor(colorSpace: colorSpace, components: [1, 132.0/255, 61.0/255, 1])!
    ] as CFArray
    let gradient = CGGradient(colorsSpace: colorSpace, colors: colors, locations: [0, 1])!
    context.drawLinearGradient(gradient, start: CGPoint(x: 0, y: 0), end: CGPoint(x: 64, y: 64), options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
    context.setStrokeColor(CGColor(colorSpace: colorSpace, components: [1,1,1,1])!)
    context.setLineWidth(6)
    context.setLineCap(.round)
    context.setLineJoin(.round)
    context.move(to: CGPoint(x: 23, y: 18))
    context.addLine(to: CGPoint(x: 45, y: 18))
    context.addLine(to: CGPoint(x: 24, y: 46))
    context.addLine(to: CGPoint(x: 45, y: 46))
    context.move(to: CGPoint(x: 20, y: 46))
    context.addLine(to: CGPoint(x: 18, y: 46))
    context.strokePath()
    // Fail the build if graphics generation produces a blank image again.
    let bytes = context.data!.assumingMemoryBound(to: UInt8.self)
    var white = 0
    var colored = 0
    for i in stride(from: 0, to: pixels * pixels * 4, by: 4) {
        if bytes[i] > 240 && bytes[i+1] > 240 && bytes[i+2] > 240 { white += 1 }
        if bytes[i] > 180 && bytes[i+1] < 180 { colored += 1 }
    }
    precondition(white > pixels * pixels / 20 && colored > pixels * pixels / 2, "Icon pixels must contain both the white logo and gradient")
    let image = context.makeImage()!
    let writer = CGImageDestinationCreateWithURL(destination as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(writer, image, nil)
    precondition(CGImageDestinationFinalize(writer), "PNG export failed")
}

// Standalone icon files are intentionally included in the bundle for sideloading.
let folder = URL(fileURLWithPath: "Icons", isDirectory: true)
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
let sizes: [(Double, [Int])] = [(20,[1,2,3]),(29,[1,2,3]),(40,[1,2,3]),(60,[2,3]),(76,[1,2]),(83.5,[2])]
for (points, scales) in sizes {
    let pointString = points.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(points)) : String(points)
    for scale in scales {
        let suffix = scale == 1 ? "" : "@\(scale)x"
        let filename = "InstazunoIcon\(pointString)\(suffix).png"
        try renderIcon(pixels: Int(points * Double(scale)), destination: folder.appendingPathComponent(filename))
    }
}
print("Generated and checked standalone Home Screen icons")
