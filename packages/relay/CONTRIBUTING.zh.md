# Contributing to gemini-cli-relay

首先，我们衷心感谢您对 `gemini-cli-relay` 项目的关注和贡献兴趣！您的每一份努力都对项目至关重要。

本文档旨在为您提供参与项目贡献所需的所有信息。

## 项目理念

`gemini-cli-relay` 是官方 `google-gemini/gemini-cli` 的一个 Fork。我们的目标不是重写或替代上游项目，而是作为一个**“叠加层 (Overlay)”**，在保持与上游同步的同时，增加一组使用 AskAway 作为交互前端（自身以 Relay Server 形态运行）的功能。

因此，我们的首要贡献原则是：**尽可能减少对上游核心代码的直接修改，优先通过新增文件和模块化的方式实现功能。**

## 开始之前

在开始编码之前，请确保您的开发环境满足以下要求：

- Node.js (版本请参考 `.nvmrc` 文件)
- `npm` 包管理器
- Git

### 环境设置

1.  **Fork & Clone**:
    - 首先，Fork `GoAskAway/gemini-cli-relay` 这个仓库到您自己的 GitHub 账户。
    - 然后，将您的 Fork 克隆到本地：
      ```bash
      git clone https://github.com/YOUR_USERNAME/gemini-cli-relay.git
      cd gemini-cli-relay
      ```

2.  **安装依赖**:
    项目使用 `npm` workspaces。请在项目根目录运行：
    ```bash
    npm install
    ```
    这个命令会安装所有依赖，并自动设置好 `husky` 提供的 Git Hooks（例如，用于提交前检查的 `pre-commit` 钩子）。

## 核心贡献工作流

我们采用基于 Pull Request 的标准开源工作流。所有变更都必须通过 PR 进行审查。

### 第 1 步：创建特性分支

所有开发工作都应在特性分支 (Feature Branch) 上进行，以保持 `main` 分支的整洁和稳定。

```bash
# 1. 确保你的 main 分支与 origin/main 保持最新
git switch main
git pull origin main

# 2. 基于最新的 main 分支，创建你的特性分支
# 分支命名建议: feature/your-feature-name 或 fix/issue-number
git switch -c feature/my-new-idea
```

### 第 2 步：编码与开发

现在您可以开始进行代码修改了。

#### **‼️ 重要：路径限制规则**

为了实现“最小冲突设计”，我们对可以直接修改的路径做了限制。所有变更**必须**位于以下白名单路径中：

- `relay/`
- `patches/`
- `to/be/added/`

我们通过 `pre-commit` 钩子来自动强制执行此规则。当您运行 `git commit` 时，如果您修改了白名单之外的文件，提交将被**拒绝**。

### 第 3 步：本地验证

在提交您的代码之前，请务必在本地运行完整的检查套件，以确保您的变更没有引入任何问题。

```bash
# 运行构建、测试、类型检查和 Lint
npm run preflight
```

### 第 4 步：提交与推送

当您的代码通过了本地验证，就可以提交了。

```bash
# 提交您的变更
git commit -m "feat(relay): implement my new idea"

# 将您的特性分支推送到您自己的 Fork 仓库
git push -u origin feature/my-new-idea
```

### 第 5 步：创建 Pull Request

前往您在 GitHub 上的 Fork 仓库页面，点击 "Compare & pull request" 按钮，创建一个指向 `GoAskAway/gemini-cli-relay` 仓库 `main` 分支的 Pull Request。

请在 PR 的描述中清晰地说明：

- **您做了什么？** (What did you do?)
- **为什么要这样做？** (Why did you do it?)
- **您是如何测试的？** (How did you test it?)
- 如果相关，请关联对应的 Issue (e.g., `Closes #123`)。

### 第 6 步：代码审查

提交 PR 后，项目维护者会对您的代码进行审查，并可能提出修改意见。请关注 PR 的评论，并根据反馈进行后续的修改和讨论。

## 行为准则

我们期望所有贡献者都能遵守基本的社区行为准则。请保持友好、尊重的沟通方式。我们致力于共同营造一个开放、热情的协作环境。

感谢您的贡献！
