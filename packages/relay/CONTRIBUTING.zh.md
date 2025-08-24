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
  - 镜像 `google-gemini/gemini-cli` 的**稳定发布版本**
  - 每天凌晨 4 点（北京时间）自动检查并同步最新稳定版本
  - **只同步标记的 release 版本**，不同步开发中的提交
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

我们采用**发布版本同步策略**，工作流程如下：

1. **定期检查**上游稳定发布版本：
   - 每天凌晨 4 点（北京时间）自动运行
   - 使用 GitHub API 获取最新稳定发布版本
   - **排除** `nightly`、`preview` 和预发布版本

2. **版本比较与同步**：
   - 检查当前 `upstream-main` 分支版本
   - 如果发现新的稳定版本，同步到对应的 **release commit hash**
   - **回滚保护**：如果当前版本比上游版本新（人工干预情况），跳过同步

3. **自动化 PR 创建**：
   - 检测到更新时自动创建同步 PR
   - 清理历史上的旧同步 PR，避免冲突
   - PR 标题格式：`🔄 Sync upstream release v0.1.22`

4. **错误处理与状态反馈**：
   - API 失败时优雅降级
   - 详细的同步状态报告
   - 失败时自动创建 Issue

**关键优势**：

- ✅ **稳定性**：只同步经过测试的稳定发布版本
- ✅ **一致性**：基于具体的 commit hash 而非分支 HEAD
- ✅ **智能性**：防止意外回滚，支持人工干预
- ✅ **自动化**：零人工干预的完整同步流程

### ⚠️ 同步时的注意事项

当您看到自动创建的同步 PR（标题为 `🔄 Sync upstream release vX.Y.Z`）时：

#### 📋 PR 审查要点

- **冲突检查**：确保没有与 relay 功能的合并冲突
- **依赖变更**：关注 `package.json` 和 `package-lock.json` 的变更
- **API 兼容性**：检查上游 API 变更是否影响 relay 服务器
- **测试覆盖**：运行完整测试套件确保功能正常

#### 🔄 不同同步状态的处理

**✅ 正常更新**：PR 显示新版本更改，可直接合并
**⚠️ 回滚保护**：如果看到 "Rollback prevented" 状态，说明系统检测到人工干预，这是正常的
**❌ 同步失败**：如果出现 API 失败或其他错误，系统会自动创建 Issue

#### 💡 合并建议

- **优先级**：同步 PR 通常可以优先合并
- **时间窗口**：建议在工作时间合并，便于及时发现问题
- **测试验证**：合并后验证 relay 功能是否正常工作

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

## Relay 版本管理

### 📦 版本号格式

relay 项目采用基于上游版本的增量版本格式：

```
{upstream_version}-relay.{increment}
```

**示例**：

- `0.1.21-relay.1` - 基于上游 v0.1.21 的第一个 relay 版本
- `0.1.21-relay.2` - 基于上游 v0.1.21 的第二个 relay 版本
- `0.1.22-relay.1` - 基于上游 v0.1.22 的第一个 relay 版本

### 🚀 手动发布流程

所有 relay 版本发布都需要**手动触发**，确保发布时机的可控性：

#### **上游同步发布** (`UPSTREAM_SYNC`)

- 当 upstream-main 分支更新后，手动评估是否需要发布
- 版本号重置为 `{new_upstream_version}-relay.1`
- 包含上游的所有更新和 relay 特定的配置

#### **Relay 功能发布** (`RELAY_FEATURE`)

- 当 relay 功能有更新时手动触发
- 版本号递增为 `{current_upstream_version}-relay.{increment+1}`
- 只包含 relay 相关的功能改进

### 📋 发布操作

**查看当前版本状态**：

```bash
node packages/relay/scripts/get-relay-version.js current
```

**检查上游更新**：

```bash
node packages/relay/scripts/get-relay-version.js check
```

**手动触发 relay 发布**：

```bash
# 通过 GitHub Actions 界面手动触发 release-relay.yml workflow
# 选择合适的 change_type: RELAY_FEATURE, UPSTREAM_SYNC, 或 MANUAL
```

**发布决策建议**：

- 🔄 **upstream-main 更新**: 评估上游变更，决定是否立即发布
- 🛠️ **relay 功能更新**: 功能完成测试后及时发布  
- ⏱️ **发布时机**: 选择合适的时间窗口，避免影响用户使用

## 处理同步 PR

系统会自动创建上游同步 PR：

### 🔄 上游同步 PR

标题：`🔄 Sync upstream release vX.Y.Z`

**处理步骤**：

1. **自动检查**：CI 会自动运行测试和构建检查
2. **人工审查**：重点关注与 relay 功能的兼容性
3. **合并决策**：通常可以直接合并，除非发现明显问题
4. **后续评估**：合并后手动评估是否需要发布新的 relay 版本

### ❌ 问题处理

如果发现同步问题：

1. **暂停合并** - 不要合并有问题的 PR
2. **创建 Issue** - 详细描述问题和影响范围  
3. **人工干预** - 可能需要手动调整配置
4. **流程恢复** - 问题解决后恢复同步流程

## 行为准则

我们期望所有贡献者都能遵守基本的社区行为准则。请保持友好、尊重的沟通方式。我们致力于共同营造一个开放、热情的协作环境。

感谢您的贡献！
