import AppKit
import Foundation
let size = 1024
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 3, hasAlpha: false, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
let pink = NSColor(srgbRed: 229.0/255, green: 38.0/255, blue: 136.0/255, alpha: 1)
let orange = NSColor(srgbRed: 1, green: 132.0/255, blue: 61.0/255, alpha: 1)
NSGradient(starting: pink, ending: orange)!.draw(in: NSRect(x: 0, y: 0, width: CGFloat(size), height: CGFloat(size)), angle: -45)
let path = NSBezierPath()
func pt(_ x: CGFloat, _ y: CGFloat) -> NSPoint { NSPoint(x: x*16, y: (64-y)*16) }
path.move(to: pt(23,18)); path.line(to: pt(45,18)); path.line(to: pt(24,46)); path.line(to: pt(45,46))
path.move(to: pt(20,46)); path.line(to: pt(18,46))
path.lineWidth = 96; path.lineCapStyle = .round; path.lineJoinStyle = .round
NSColor.white.setStroke(); path.stroke()
NSGraphicsContext.restoreGraphicsState()
let folder = URL(fileURLWithPath: "Assets.xcassets/AppIcon.appiconset", isDirectory: true)
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
try bitmap.representation(using: .png, properties: [:])!.write(to: folder.appendingPathComponent("AppIcon.png"))
let json = """
{"images":[{"filename":"AppIcon.png","idiom":"universal","platform":"ios","size":"1024x1024"}],"info":{"author":"xcode","version":1}}
"""
try json.write(to: folder.appendingPathComponent("Contents.json"), atomically: true, encoding: .utf8)
