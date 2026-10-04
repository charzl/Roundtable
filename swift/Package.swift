// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RoundtableSwift",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "RoundtableSwift", targets: ["RoundtableSwift"])
    ],
    targets: [
        .executableTarget(
            name: "RoundtableSwift",
            path: "Sources"
        )
    ]
)
