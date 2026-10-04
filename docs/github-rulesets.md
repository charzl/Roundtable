# GitHub Rulesets 仓库规则集配置说明 / Repository Rulesets Guide

本文档提供中英双语说明，阐述 Roundtable 仓库（`charzl/Roundtable`）配置的 GitHub Rulesets 规则集。  
This document explains the GitHub Rulesets configured for the Roundtable repository (`charzl/Roundtable`) in both Chinese and English.

---

## 一、主分支保护规则集 / Protect Main Branch Ruleset

- **规则集名称 / Name**：`Protect main branch`
- **规则集 ID / ID**：`24445629`
- **目标范围 / Target**：默认分支 / Default branch `main` (`~DEFAULT_BRANCH`)
- **生效状态 / Enforcement**：`active`（已激活 / Active）

### 包含的防护规则 / Configured Protection Rules:
1. **禁止删除分支 / Restrict deletions (`deletion`)**:
   - 中文：防止意外或恶意删除 `main` 分支。
   - English: Prevents accidental or unauthorized deletion of the `main` branch.
2. **禁止强制推送 / Block force pushes (`non_fast_forward`)**:
   - 中文：阻止 `git push --force` 覆盖提交历史，维护提交树的一致性。
   - English: Prevents `git push --force` from rewriting git history and guarantees linear integrity.
3. **合并前必须通过 PR / Require a Pull Request before merging (`pull_request`)**:
   - 中文：所有代码变更必须经由 Pull Request 合并，禁止直接向 `main` 推送代码。设置 `required_approving_review_count: 0`，便于单人核心维护者在 CI 成功后合并，无需等待额外账号审批；开启 `required_review_thread_resolution: true`，确保 PR 会话的所有讨论全部解决后才可合并。
   - English: All code modifications must be merged through Pull Requests; direct pushes to `main` are disallowed. `required_approving_review_count` is set to `0` so solo developers can merge their own PR once CI checks pass without being blocked by external approval requirements. `required_review_thread_resolution: true` requires all review conversations to be resolved before merging.
4. **必须通过 CI 状态检查 / Require status checks to pass (`required_status_checks`)**:
   - 中文：强制要求 CI 状态检查必须成功，涵盖单元测试 `Run Unit Tests` 与打包构建 `Build macOS ARM64 (Apple Silicon)`。只有语法检查、全量 41 项单元测试与 macOS 打包全部绿灯通过，才允许合并。
   - English: Strictly requires CI status checks to pass, covering both `Run Unit Tests` and `Build macOS ARM64 (Apple Silicon)`. Merges are only permitted when syntax checks, all 41 unit tests, and macOS packaging pass green.
5. **管理员绕过权限 / Bypass List (`bypass_actors`)**:
   - 中文：仓库管理员（Repository admin）具有紧急修复与紧急干预的绕过权限。
   - English: Repository administrators retain bypass permissions for emergency maintenance.

---

## 二、发布标签保护规则集 / Protect Release Tags Ruleset

- **规则集名称 / Name**：`Protect release tags`
- **规则集 ID / ID**：`24445640`
- **目标范围 / Target**：所有版本标签 / All release tags `refs/tags/v*` (e.g., `v0.2.2`, `v0.3.0`)
- **生效状态 / Enforcement**：`active`（已激活 / Active）

### 包含的防护规则 / Configured Protection Rules:
1. **禁止删除标签 / Restrict deletions (`deletion`)**:
   - 中文：已发布的 Release Tag 不可被删除。
   - English: Published release tags cannot be deleted.
2. **禁止覆盖标签 / Block force pushes (`non_fast_forward`)**:
   - 中文：防止针对同名 Tag 强推不同 commit，确保交付给用户的应用包不可篡改。
   - English: Prevents force-updating existing release tags with different commits, guaranteeing artifact immutability.
3. **允许新建标签 / Allow creation**:
   - 中文：开发者和 CI 可以正常推送新的 `v*` 标签以触发自动发布工作流。
   - English: Developers and automated workflows can freely push new `v*` tags to trigger release pipelines.

---

## 三、自动清理分支设置 / Automatically Delete Head Branches on Merge

- **配置项 / Setting**：`delete_branch_on_merge: true`
- **生效状态 / Enforcement**：`active`（已激活 / Active）
- **说明 / Description**：
  - 中文：当 Pull Request 合并进入主分支（`main`）后，GitHub 会自动删除已合并的源功能分支（Head branch），避免远程积累陈旧分支，保持分支树整洁。
  - English: Once a Pull Request is successfully merged into `main`, GitHub automatically deletes the head branch, keeping the remote repository clean from stale feature branches.

---

## 四、CI 协作标签与自动变基 / CI Collaboration Labels & Auto-Rebase

仓库配置了标准化协作标签，并在 GitHub Actions 中集成了基于标签的自动化工作流：

| 标签 (Label) | 色值 (Color) | 说明 (Description) | 自动化联动 (Automation Behavior) |
|---|---|---|---|
| `rebase` | `#fbca04` | Require branch rebase onto main / 标记需要变基同步 | **自动变基触发器**：给 PR 打上此标签（或在 PR 评论 `/rebase`）即可触发 `.github/workflows/rebase.yml`，在云端将 PR 分支自动变基并强制更新，完成后自动移除标签并留言反馈。 |
| `run_smoke` | `#d93f0b` | Trigger or require desktop smoke tests / 运行桌面端冒烟测试 | **冒烟测试门禁**：用于按需触发或标记需执行桌面端完整启动与冒烟测试验证。 |
| `run_all_tests` | `#0e8a16` | Trigger or require full comprehensive test suite / 运行全量完整测试 | **全量测试触发**：用于按需触发跨平台全矩阵测试与耗时回归测试。 |
