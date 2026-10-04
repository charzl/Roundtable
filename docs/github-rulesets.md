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
   - 中文：强制要求 `Build macOS Packages / Build macOS ARM64 (Apple Silicon)` 状态检查必须成功。只有语法检查、自动化单元测试与 macOS ARM64 打包全部绿灯通过，才允许合并。
   - English: Strictly requires the `Build macOS Packages / Build macOS ARM64 (Apple Silicon)` check to succeed. Merges are only permitted when syntax checks, automated unit tests, and macOS ARM64 packaging all pass green.
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

