# GitHub Rulesets 仓库规则集配置说明

为了保证 Roundtable 主干分支（`main`）的稳定性和发布版本（`v*` Tags）的不可变性，已经在 GitHub 仓库（`charzl/Roundtable`）中通过 GitHub Rulesets API 配置了对应的规则集。

---

## 一、主分支保护规则集 (`Protect main branch`)

- **规则集 ID**：`24445629`
- **目标范围**：默认分支 `main`（`~DEFAULT_BRANCH`）
- **生效状态**：`active`（已激活）

### 包含的防护规则：
1. **禁止删除分支 (`deletion`)**：防止误删 `main` 分支。
2. **禁止强推 (`non_fast_forward`)**：阻止 `git push --force` 覆盖提交历史。
3. **合并前必须发起 PR (`pull_request`)**：
   - 变更需通过 Pull Request 流程合并，禁止直接直推 `main`。
   - 所有会话评论必须已被解决（`required_review_thread_resolution: true`）。
   - 推送新 commit 时自动失效过旧评审（`dismiss_stale_reviews_on_push: true`）。
   - `required_approving_review_count: 0`：单人开发场景下作者在 CI 绿灯后可自行合并，无需其他账号二次审批。
4. **必须通过 CI 检查 (`required_status_checks`)**：
   - 必须通过状态检查：`Build macOS Packages / Build macOS ARM64 (Apple Silicon)`。
   - 只有代码检查、自动化测试和打包全部在 GitHub Runner 上成功运行通过，才允许合入 `main`。
5. **管理员绕过权限 (`bypass_actors`)**：
   - 仓库管理员（Repository admin）具备紧急修复绕过权限。

---

## 二、发布标签保护规则集 (`Protect release tags`)

- **规则集 ID**：`24445640`
- **目标范围**：所有版本标签 `refs/tags/v*`（例如 `v0.2.2`, `v0.3.0` 等）
- **生效状态**：`active`（已激活）

### 包含的防护规则：
1. **禁止删除标签 (`deletion`)**：已发布的 Release Tag 不可被删除。
2. **禁止覆盖标签 (`non_fast_forward`)**：防止针对同名 Tag 强推不同 commit，确保交付制品的不可篡改。
3. **允许新建标签**：允许开发者或 CI 工作流正常推送新的 `v*` 标签触发自动发布。
