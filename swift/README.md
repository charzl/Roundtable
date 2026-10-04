# Roundtable (圆桌会议) - Swift 原生客户端 (macOS SwiftUI / AppKit)

基于 **Swift 6.4** 与 **SwiftUI / AppKit** 构建的 macOS 极致原生性能多 Agent 会议客户端。

---

## 🌟 核心特性 / Features

- **极致体积 (< 1MB)**：直接调用 macOS 系统级 SwiftUI、AppKit 与 Metal 渲染管线，应用包体仅 **0.76 MB**（压缩包 180 KB），比 Electron 缩减 **99.7%**！
- **极低内存常驻 (~90-100MB)**：采用 Swift ARC（自动引用计数）与单进程架构，内存占用仅为 Electron 的 1/4。
- **纯正 macOS 原生体验**：原生平滑手势、窗口模糊磨砂材质、SF Pro 字体渲染、深浅色模式系统无缝跟随。
- **iOS / iPadOS 跨端潜力**：SwiftUI 视图与数据流代码可直接在后续 iOS 移动端 App 中全量复用。

---

## 🚀 快速启动 / Getting Started

### 1. 编译与调试运行
```bash
cd swift
swift run
```

### 2. 独立打包构建 (macOS .app Bundle & ZIP)
```bash
bash package.sh
```
编译产物将输出至 `swift/dist/`：
- `Roundtable-Swift.app`
- `Roundtable-Swift-mac-arm64.zip`

---

## 📁 目录结构 / Project Structure

```text
swift/
├── Package.swift           # Swift Package Manager (SPM) 项目配置
├── Sources/
│   ├── App.swift          # SwiftUI @main 入口与 NavigationSplitView 布局
│   ├── Models.swift       # 数据模型 (Meeting, Message, Claim, Decision, MeetingStore)
│   ├── Engine.swift       # 异步会议协调中心 (Swift 结构化并发 Task / MainActor)
│   └── Views/
│       ├── SidebarView.swift       # 历史会议导航列表
│       ├── MeetingDetailView.swift # 参会者卡片、讨论时间线、决策总结
│       └── NewMeetingSheet.swift   # 新建会议配置浮层
└── package.sh             # 自动化编译组装 .app 包脚本
```
