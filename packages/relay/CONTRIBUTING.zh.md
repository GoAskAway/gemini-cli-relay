# Contributing to gemini-cli-relay

首先，我们衷心感谢您对 `gemini-cli-relay` 项目的关注和贡献兴趣！您的每一份努力都对项目至关重要。

本文档旨在为您提供参与项目贡献所需的所有信息。

## 项目理念

`gemini-cli-relay` 是官方 `google-gemini/gemini-cli` 的一个 Fork。我们的目标不是重写或替代上游项目，而是作为一个**"叠加层 (Overlay)"**，在保持与上游同步的同时，增加一组使用 AskAway 作为交互前端（自身以 Relay Server 形态运行）的功能。

因此，我们的首要贡献原则是：**尽可能减少对上游核心代码的直接修改，优先通过新增文件和模块化的方式实现功能。**

## 项目分支结构

我们采用双分支同步策略来维护与上游的关系：

### 🔄 分支说明

- **`upstream-main`**: 
  - 完全镜像 `google-gemini/gemini-cli` 的 main 分支
  - 每天凌晨 4 点（北京时间）自动同步
  - **请勿直接修改此分支**
  
- **`main`**: 
  - 我们的主开发分支
  - 基于 `upstream-main` 进行扩展开发
  - 包含所有 Relay 相关的功能增强
  
- **`sync/upstream-*`**: 
  - 自动生成的同步分支
  - 用于将 `upstream-main` 的更新合并到 `main`
  - 系统会自动创建 PR，需要手动审查合并

### 🤖 自动同步机制

我们的同步工作流会：
1. **每天检查**上游更新（凌晨 4 点北京时间）
2. **自动同步** `upstream-main` 分支
3. **智能创建 PR** 当检测到上游变更时
4. **清理旧 PR** 避免多个同步 PR 并存

### ⚠️ 同步时的注意事项

当您看到自动创建的同步 PR 时：
- **仔细审查**上游变更是否与我们的修改冲突
- **测试兼容性**确保 Relay 功能正常工作  
- **合并策略**一般情况下可以直接合并，除非有明显冲突

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

为了实现"最小冲突设计"和确保上游同步的顺利进行，我们对可以直接修改的路径做了限制。所有变更**必须**位于以下白名单路径中：

- `packages/relay/` - Relay 服务器相关功能
- `packages/patches/` - 对上游代码的必要补丁
- `.github/workflows/sync-upstream.yml` - 同步工作流（特殊情况）

**为什么要这样限制？**
- 🔄 **保持同步简洁**: 减少与上游的合并冲突
- 🛡️ **避免意外覆盖**: 防止上游更新覆盖我们的修改
- 📦 **模块化设计**: 将扩展功能集中在专用目录

我们通过 `pre-commit` 钩子来自动强制执行此规则。当您运行 `git commit` 时，如果您修改了白名单之外的文件，提交将被**拒绝**。

**特殊情况说明**: 
- 如果确实需要修改上游文件，请先在 Issue 中讨论方案
- 考虑使用 patches/ 目录来管理必要的上游修改

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

## 处理自动同步 PR

当您看到标题以 "🔄 Sync upstream changes" 开头的自动 PR 时，这是我们的同步系统在工作。作为贡献者，您需要了解如何处理这些 PR：

### 📋 审查清单

在合并同步 PR 之前，请检查：

1. **冲突检查** - 确保没有合并冲突
2. **功能测试** - 运行 `npm run preflight` 确保所有测试通过
3. **Relay 兼容性** - 特别关注是否影响 Relay 服务器功能
4. **依赖变更** - 检查 `package.json` 或 `package-lock.json` 的变更

### ⚠️ 发现问题时

如果同步导致问题：
1. **暂时关闭 PR** - 不要合并
2. **创建 Issue** - 描述具体问题
3. **讨论解决方案** - 可能需要创建补丁或调整我们的代码
4. **等待修复** - 修复后再合并同步 PR

### ✅ 正常合并

大多数情况下，同步 PR 可以直接合并：
```bash
# 通过 GitHub UI 合并，或者
gh pr merge <PR_NUMBER> --squash --delete-branch
```

## 行为准则

我们期望所有贡献者都能遵守基本的社区行为准则。请保持友好、尊重的沟通方式。我们致力于共同营造一个开放、热情的协作环境。

感谢您的贡献！
