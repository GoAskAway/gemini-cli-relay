### **Gemini Web-CLI 技术需求文档**

**1.0 概述**

**1.1 项目目标**
本项目旨在为 Gemini CLI 创建一个配套的 Web 界面（Web-CLI）。用户将能够通过浏览器访问一个功能齐全的、与原生终端体验完全一致的交互式命令行环境。

**1.2 设计原则**

- **最小侵入**: 对现有 `packages/cli` 代码的修改降至最低，确保与上游主项目的轻松同步。
- **最大复用**: 完整复用现有的交互式应用逻辑、UI 渲染、用户配置及认证流程，不重复造轮子。
- **体验一致**: Web 端的交互体验（包括快捷键、命令、UI 状态等）应与原生终端中的体验 100% 保持一致。

**2.0 系统架构**

系统由两个核心组件构成：

1.  **后端服务器**: 在现有的 CLI 中增加一个新的 `server` 模式。它将启动一个 WebSocket 服务器，并作为“无头”的 Gemini CLI 实例运行，通过 WebSocket 暴露其 I/O（输入/输出）流。
2.  **前端应用**: 一个全新的、独立的单页应用（SPA），它通过 WebSocket 连接到后端，提供一个基于浏览器的终端模拟器界面。

**架构图:**

```
[用户的浏览器] <----> [前端React应用 (xterm.js)] <== WebSocket ==> [后端Node.js服务器 (Gemini CLI)]
```

**3.0 后端实现 (`server` 命令)**

**3.1 命令创建 (入口点)**

- **方式**: 采用 `yargs` 命令模块化的方式，创建新的命令。
- **文件**: 新增 `packages/cli/src/commands/server.ts`。
- **命令签名**: `gemini server --port <number> --host <string>`
  - `--port`: WebSocket 服务器监听的端口 (默认: `8080`)。
  - `--host`: WebSocket 服务器监听的地址 (默认: `127.0.0.1`)。

**3.2 I/O 抽象层**

- **目标**: 将标准 I/O (`process.stdin`, `stdout`, `stderr`) 与 WebSocket 通道连接。
- **文件**: 新增 `packages/cli/src/io/IOChannelProvider.ts`。
- **实现**:
  - 定义一个 `ServerIOChannel` 类，该类接收一个 WebSocket 客户端实例。
  - `ServerIOChannel.stdin`: 创建一个 Node.js `Readable` 流。当从 WebSocket 收到 `stdin` 类型的消息时，将数据推入此流。
  - `ServerIOChannel.stdout`/`stderr`: 创建 Node.js `Writable` 流。当程序向这些流写入数据时，将数据封装成 `stdout`/`stderr` 消息，通过 WebSocket 发送给客户端。

**3.3 WebSocket 服务器逻辑**

- 在 `server.ts` 的 `handler` 函数中，使用 `ws` 库启动一个 WebSocket 服务器。
- 在 `connection` 事件回调中（当一个新前端客户端连接时）：
  1.  实例化 `ServerIOChannel`。
  2.  **执行 I/O 重定向**: `process.stdin = ioChannel.stdin;` (以此类推)。
  3.  调用从 `gemini.tsx` 中重构并导出的 `startInteractiveUI()` 函数，启动完整的交互式应用。

**3.4 必需的重构**

- **文件**: `packages/cli/src/gemini.tsx`。
- **改动**: 将启动 `Ink` 渲染和 `AppWrapper` 组件的逻辑，从主流程中提取到一个独立的、可导出的异步函数 `startInteractiveUI()` 中。这是唯一需要对现有逻辑文件进行的修改。

**3.5 通信协议 (JSON over WebSocket)**

- **客户端 -> 服务器**:
  `json
    { "type": "stdin", "data": "用户输入的内容
" }
    `
- **服务器 -> 客户端**:
  ```json
  { "type": "stdout", "data": "程序的输出内容" }
  ```
  ```json
  { "type": "stderr", "data": "程序的错误输出内容" }
  ```

**4.0 前端实现 (Web 应用)**

**4.1 项目设置**

- **位置**: 创建一个新的包 `packages/web-cli`。
- **技术栈**: 使用 `Vite` + `React` + `TypeScript` 快速搭建。

**4.2 核心 UI 组件**

- **库**: 使用 `xterm.js` (配合 `xterm-for-react` 包装器)。`xterm.js` 是一个功能完备的终端模拟器，VS Code 内部就是用的它。
- **功能**:
  - 它将负责渲染所有从后端 `stdout`/`stderr` 收到的数据，包括 ANSI 颜色和样式代码。
  - 它将捕获用户的键盘输入。

**4.3 数据流**

1.  **连接**: 应用启动时，初始化 WebSocket 客户端，连接到后端服务器 (例如 `ws://127.0.0.1:8080`)。
2.  **接收数据**: 监听 WebSocket 的 `message` 事件。收到消息后，解析 JSON，根据 `type` (`stdout`/`stderr`)，调用 `terminal.write(data)` 将数据写入 `xterm.js` 终端。
3.  **发送数据**: 监听 `xterm.js` 的 `onData` 事件。当用户在终端输入时，将捕获到的字符数据封装成 `stdin` 消息，通过 WebSocket 发送给后端。

**4.4 用户界面 (UI/UX)**

- **布局**: 简洁的、以终端为中心的全屏或主区域布局。
- **状态显示**: 在界面上应有明确的连接状态指示灯或文本（例如：连接中...、已连接、已断开）。
- **配置**: 提供简单的输入框，让用户可以配置后端的地址和端口。

**5.0 开发路线图**

- **第一阶段：后端实现**
  1.  完成 `gemini.tsx` 的 `startInteractiveUI` 函数提取重构。
  2.  实现 `IOChannelProvider.ts`。
  3.  实现 `server.ts` 命令，包含 WebSocket 服务器和 I/O 重定向逻辑。
  4.  **验证**: 使用命令行 WebSocket 工具 (`wscat`) 连接后端，手动发送 `stdin` 消息，验证是否能收到 `stdout` 响应。

- **第二阶段：前端实现**
  1.  搭建 `packages/web-cli` 的 React 项目框架。
  2.  集成 `xterm.js` 并渲染一个基本的终端界面。
  3.  实现 WebSocket 客户端连接逻辑。
  4.  实现前后端数据流，将 `xterm.js` 与 WebSocket 连接起来。

- **第三阶段：集成与测试**
  1.  进行端到端测试，确保所有交互（命令、快捷键、UI 渲染）在 Web-CLI 中表现正常。
  2.  UI/UX 细节打磨。
