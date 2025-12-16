# ユーザーロール・権限設計書

> **最終更新**: 2025年12月16日
>
> 本ドキュメントは、アプリケーションの3つのユーザーロール（管理者/スタッフ/家族）の権限設計とページ構成を定義します。

---

## 1. 概要

### 1.1 背景・目的

介護施設向けコミュニケーションアプリでは、以下の3種類のユーザーが異なる目的で利用します：

- **管理者**: システム設定・マスタ管理
- **スタッフ**: ケア記録の入力・家族連絡の確認・対応
- **家族**: 品物送付の登録・ケア指示・状況確認

各ユーザーが「見るべき情報」「入力できる項目」を明確に分離することで、以下を実現します：

1. **事故防止**: 誤操作によるデータ破損を防ぐ
2. **認識共有**: スタッフと家族が同じ情報を見て認識のズレを防ぐ
3. **操作性向上**: ロールに応じた最適なUIを提供

### 1.2 設計原則

1. **最小権限の原則**: 各ロールには必要最小限の権限のみ付与
2. **閲覧は広く、入力は狭く**: 閲覧は全ロールで共有、入力は厳密に制限
3. **二重チェック**: フロントエンド表示制御 + バックエンドAPI権限チェック
4. **オーナーシップ**: 作成者のみが編集/削除可能（管理者は例外）
5. **監査可能性**: 重要操作はログを残す

---

## 2. ロール定義

### 2.1 3つのロール

| ロール | 識別方法 | 主な責務 | 想定ユーザー |
|--------|---------|---------|-------------|
| **管理者** | `?admin=true` | システム設定、マスタ管理、データ修正 | 施設管理者、システム管理者 |
| **スタッフ** | `?role=staff` またはデフォルト | ケア記録入力、家族連絡の確認・対応 | 介護スタッフ、看護師 |
| **家族** | `?role=family` | 品物送付登録、ケア指示作成、状況確認 | 入居者のご家族 |

### 2.2 アクセス方法

```
# スタッフ用（デフォルト）
https://facility-care-input-form.web.app/
https://facility-care-input-form.web.app/?role=staff

# 家族用
https://facility-care-input-form.web.app/?role=family

# 管理者用（スタッフ画面に設定機能が追加される）
https://facility-care-input-form.web.app/?admin=true

# 家族用 + 管理者
https://facility-care-input-form.web.app/?role=family&admin=true
```

### 2.3 ロール判定ロジック

```typescript
// frontend/src/hooks/useUserRole.ts
type Role = 'admin' | 'staff' | 'family';

interface UserRoleInfo {
  role: Role;
  isAdmin: boolean;
  isStaff: boolean;
  isFamily: boolean;
}

function useUserRole(): UserRoleInfo {
  const [searchParams] = useSearchParams();

  // admin パラメータは独立して判定
  const isAdmin = searchParams.get('admin') === 'true';

  // role パラメータでスタッフ/家族を判定
  const roleParam = searchParams.get('role');
  const savedRole = localStorage.getItem('userRole');

  let role: Role;
  if (roleParam === 'family' || savedRole === 'family') {
    role = 'family';
  } else {
    role = 'staff'; // デフォルト
  }

  // ロールをLocalStorageに保存（次回アクセス時に維持）
  useEffect(() => {
    if (roleParam) {
      localStorage.setItem('userRole', roleParam);
    }
  }, [roleParam]);

  return {
    role: isAdmin ? 'admin' : role,
    isAdmin,
    isStaff: role === 'staff',
    isFamily: role === 'family',
  };
}
```

---

## 3. ページ構成

### 3.1 スタッフ用ページ

**フッターナビゲーション（4タブ）**:
```
[記録閲覧] [記録入力] [家族連絡] [統計]
```

| パス | ページ名 | 説明 |
|------|---------|------|
| `/staff` または `/` | スタッフホーム | 記録一覧（既存ViewPage） |
| `/staff/input/meal` | 食事記録入力 | 食事入力フォーム（既存MealInputPage） |
| `/staff/input/care` | ケア実績入力 | 将来拡張用 |
| `/staff/family-messages` | 家族連絡一覧 | 品物・ケア指示の一覧（読み取り専用） |
| `/staff/family-messages/:id` | 連絡詳細 | 連絡詳細・対応記録入力・完了報告 |
| `/staff/stats` | 統計ダッシュボード | 摂食傾向・品物状況（家族と同じビュー） |

### 3.2 家族用ページ

**フッターナビゲーション（4タブ）**:
```
[ホーム] [品物管理] [ケア指示] [統計]
```

| パス | ページ名 | 説明 |
|------|---------|------|
| `/family` | 家族ホーム | タイムライン + タスクバッジ（既存FamilyDashboard） |
| `/family/items` | 品物一覧 | 送付した品物の一覧・在庫状況 |
| `/family/items/new` | 品物登録 | 新規品物登録フォーム |
| `/family/items/:id` | 品物詳細 | 提供状況・摂食結果の確認 |
| `/family/request` | ケア指示作成 | ケア仕様ビルダー（既存RequestBuilder） |
| `/family/stats` | 統計ダッシュボード | 摂食傾向・品物状況 |
| `/family/evidence/:date` | エビデンス確認 | Plan vs Result（既存EvidenceMonitor） |

### 3.3 管理者専用機能

管理者は上記のスタッフ/家族ページに加えて、以下の機能が有効になります：

| 機能 | 表示場所 | 説明 |
|------|---------|------|
| 設定モーダル | 各入力ページのヘッダー歯車アイコン | 初期値・Webhook・Driveフォルダ設定 |
| データ編集 | 詳細ページ | 記録・品物・指示の編集/削除 |
| ユーザー管理 | `/admin/users`（将来） | ユーザー追加・権限変更 |

### 3.4 共有ページ（全ロールアクセス可能）

| パス | ページ名 | 説明 |
|------|---------|------|
| `/stats` | 統計ダッシュボード | `/staff/stats` と `/family/stats` からリダイレクト |
| `/item/:id/timeline` | 品物ライフサイクル | 登録→提供→摂食の時系列表示 |

---

## 4. 権限マトリクス

### 4.1 記録データ（食事・バイタル等）

| 機能 | 管理者 | スタッフ | 家族 |
|------|:------:|:-------:|:----:|
| 記録一覧閲覧 | ✅ | ✅ | ✅ |
| 記録詳細閲覧 | ✅ | ✅ | ✅ |
| 食事記録入力 | ❌ | ✅ | ❌ |
| ケア記録入力 | ❌ | ✅ | ❌ |
| 記録の編集 | ✅ | ❌ | ❌ |
| 記録の削除 | ✅ | ❌ | ❌ |

### 4.2 品物管理

| 機能 | 管理者 | スタッフ | 家族 |
|------|:------:|:-------:|:----:|
| 品物一覧閲覧 | ✅ | ✅ | ✅ |
| 品物詳細閲覧 | ✅ | ✅ | ✅ |
| 品物登録（送付） | ❌ | ❌ | ✅ |
| 品物編集 | ✅ | ❌ | ⚠️ 自分のみ |
| 品物削除 | ✅ | ❌ | ⚠️ 自分のみ |
| 提供記録入力 | ❌ | ✅ | ❌ |
| 摂食結果入力 | ❌ | ✅ | ❌ |
| スタッフへの申し送り | ❌ | ❌ | ✅ |
| 家族への申し送り | ❌ | ✅ | ❌ |

### 4.3 ケア指示

| 機能 | 管理者 | スタッフ | 家族 |
|------|:------:|:-------:|:----:|
| 指示一覧閲覧 | ✅ | ✅ | ✅ |
| 指示詳細閲覧 | ✅ | ✅ | ✅ |
| 指示作成 | ❌ | ❌ | ✅ |
| 指示編集 | ✅ | ❌ | ⚠️ 自分のみ |
| 指示削除 | ✅ | ❌ | ⚠️ 自分のみ |
| 指示確認（acknowledge） | ❌ | ✅ | ❌ |
| 対応完了報告 | ❌ | ✅ | ❌ |

### 4.4 タスク管理

| 機能 | 管理者 | スタッフ | 家族 |
|------|:------:|:-------:|:----:|
| タスク一覧閲覧 | ✅ | ✅ | ✅ |
| タスク詳細閲覧 | ✅ | ✅ | ✅ |
| タスク完了処理 | ❌ | ✅ | ❌ |
| カスタムタスク作成 | ✅ | ✅ | ❌ |
| タスク削除 | ✅ | ❌ | ❌ |

### 4.5 統計・レポート

| 機能 | 管理者 | スタッフ | 家族 |
|------|:------:|:-------:|:----:|
| 統計ダッシュボード閲覧 | ✅ | ✅ | ✅ |
| AIレポート閲覧 | ✅ | ✅ | ✅ |
| CSVエクスポート | ✅ | ✅ | ❌ |

### 4.6 システム設定

| 機能 | 管理者 | スタッフ | 家族 |
|------|:------:|:-------:|:----:|
| 初期値設定 | ✅ | ❌ | ❌ |
| Webhook URL設定 | ✅ | ❌ | ❌ |
| Drive フォルダ設定 | ✅ | ❌ | ❌ |
| 通知設定 | ✅ | ❌ | ❌ |
| ユーザー管理（将来） | ✅ | ❌ | ❌ |

---

## 5. UI表示制御

### 5.1 権限チェックユーティリティ

```typescript
// frontend/src/utils/permissions.ts

type Role = 'admin' | 'staff' | 'family';

interface PermissionCheck {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// 品物管理の権限
export function getCareItemPermissions(
  role: Role,
  isAdmin: boolean,
  isOwner: boolean
): PermissionCheck {
  if (isAdmin) {
    return { canView: true, canCreate: false, canEdit: true, canDelete: true };
  }

  switch (role) {
    case 'staff':
      return { canView: true, canCreate: false, canEdit: false, canDelete: false };
    case 'family':
      return {
        canView: true,
        canCreate: true,
        canEdit: isOwner,
        canDelete: isOwner
      };
    default:
      return { canView: false, canCreate: false, canEdit: false, canDelete: false };
  }
}

// ケア指示の権限
export function getCareInstructionPermissions(
  role: Role,
  isAdmin: boolean,
  isOwner: boolean
): PermissionCheck {
  if (isAdmin) {
    return { canView: true, canCreate: false, canEdit: true, canDelete: true };
  }

  switch (role) {
    case 'staff':
      return { canView: true, canCreate: false, canEdit: false, canDelete: false };
    case 'family':
      return {
        canView: true,
        canCreate: true,
        canEdit: isOwner,
        canDelete: isOwner
      };
    default:
      return { canView: false, canCreate: false, canEdit: false, canDelete: false };
  }
}

// 記録データの権限
export function getRecordPermissions(
  role: Role,
  isAdmin: boolean
): PermissionCheck {
  if (isAdmin) {
    return { canView: true, canCreate: false, canEdit: true, canDelete: true };
  }

  switch (role) {
    case 'staff':
      return { canView: true, canCreate: true, canEdit: false, canDelete: false };
    case 'family':
      return { canView: true, canCreate: false, canEdit: false, canDelete: false };
    default:
      return { canView: false, canCreate: false, canEdit: false, canDelete: false };
  }
}
```

### 5.2 条件付きレンダリングコンポーネント

```typescript
// frontend/src/components/PermissionGate.tsx

interface PermissionGateProps {
  permission: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  permission,
  children,
  fallback = null
}: PermissionGateProps) {
  if (!permission) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

// 使用例
function ItemDetailPage() {
  const { isAdmin, isFamily } = useUserRole();
  const { data: item } = useCareItem(itemId);
  const isOwner = item?.userId === currentUserId;

  const permissions = getCareItemPermissions(
    isFamily ? 'family' : 'staff',
    isAdmin,
    isOwner
  );

  return (
    <div>
      <h1>{item.itemName}</h1>

      {/* 編集ボタン - 権限がある場合のみ表示 */}
      <PermissionGate permission={permissions.canEdit}>
        <Button onClick={handleEdit}>編集</Button>
      </PermissionGate>

      {/* 削除ボタン - 権限がある場合のみ表示 */}
      <PermissionGate permission={permissions.canDelete}>
        <Button variant="danger" onClick={handleDelete}>削除</Button>
      </PermissionGate>
    </div>
  );
}
```

### 5.3 フッターナビゲーションの切り替え

```typescript
// frontend/src/components/FooterNav.tsx

function FooterNav() {
  const { isStaff, isFamily } = useUserRole();

  if (isFamily) {
    return (
      <nav className="footer-nav">
        <NavLink to="/family">ホーム</NavLink>
        <NavLink to="/family/items">品物管理</NavLink>
        <NavLink to="/family/request">ケア指示</NavLink>
        <NavLink to="/family/stats">統計</NavLink>
      </nav>
    );
  }

  // スタッフ用（デフォルト）
  return (
    <nav className="footer-nav">
      <NavLink to="/staff">記録閲覧</NavLink>
      <NavLink to="/staff/input/meal">記録入力</NavLink>
      <NavLink to="/staff/family-messages">家族連絡</NavLink>
      <NavLink to="/staff/stats">統計</NavLink>
    </nav>
  );
}
```

---

## 6. バックエンドAPI権限チェック

### 6.1 権限チェックミドルウェア

```typescript
// functions/src/middleware/authCheck.ts

type Role = 'admin' | 'staff' | 'family';

interface AuthContext {
  role: Role;
  isAdmin: boolean;
  userId?: string;
}

// リクエストから権限情報を抽出
function extractAuthContext(req: functions.https.Request): AuthContext {
  // Dev Mode: クエリパラメータから判定
  const isAdmin = req.query.admin === 'true';
  const roleParam = req.query.role as string;

  let role: Role = 'staff';
  if (roleParam === 'family') {
    role = 'family';
  }

  // 将来: Firebase Authentication から userId を取得
  const userId = req.headers['x-user-id'] as string | undefined;

  return { role, isAdmin, userId };
}

// 権限チェック関数
function checkPermission(
  authContext: AuthContext,
  requiredRole: Role | Role[],
  options?: {
    allowAdmin?: boolean;
    checkOwnership?: (ownerId: string) => boolean;
  }
): boolean {
  const { role, isAdmin, userId } = authContext;
  const { allowAdmin = true, checkOwnership } = options || {};

  // 管理者は全て許可（オプション）
  if (allowAdmin && isAdmin) {
    return true;
  }

  // ロールチェック
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (!roles.includes(role)) {
    return false;
  }

  // オーナーシップチェック（オプション）
  if (checkOwnership && userId) {
    return checkOwnership(userId);
  }

  return true;
}
```

### 6.2 API実装例

```typescript
// functions/src/functions/careItems.ts

export const submitCareItem = functions
  .region('asia-northeast1')
  .https.onRequest(async (req, res) => {
    // CORS処理...

    const authContext = extractAuthContext(req);

    // 権限チェック: 家族のみ登録可能
    if (!checkPermission(authContext, 'family')) {
      res.status(403).json({
        success: false,
        error: 'Permission denied: Only family members can register items'
      });
      return;
    }

    // 品物登録処理...
  });

export const updateCareItem = functions
  .region('asia-northeast1')
  .https.onRequest(async (req, res) => {
    // CORS処理...

    const authContext = extractAuthContext(req);
    const { itemId } = req.body;

    // 既存データ取得
    const item = await getCareItemById(itemId);

    // 権限チェック: 管理者 or 作成者のみ編集可能
    const canEdit = checkPermission(authContext, 'family', {
      checkOwnership: (userId) => item.userId === userId
    });

    if (!canEdit) {
      res.status(403).json({
        success: false,
        error: 'Permission denied: You can only edit your own items'
      });
      return;
    }

    // 更新処理...
  });
```

---

## 7. 事故防止チェックリスト

### 7.1 フロントエンド

- [ ] 権限がないボタンは**非表示**（disabledではなく完全に非表示）
- [ ] 削除操作は必ず**確認ダイアログ**を表示
- [ ] ステータス変更（完了処理等）も**確認を挟む**
- [ ] ロール切り替え時にページを**リダイレクト**

### 7.2 バックエンド

- [ ] 全APIで**権限チェック**を実装
- [ ] 不正リクエストは**403エラー**で拒否
- [ ] 編集/削除は**オーナーシップチェック**を実施
- [ ] 重要操作は**ログを記録**

### 7.3 データ設計

- [ ] 品物・指示には**createdBy**フィールドを必須化
- [ ] 更新時は**updatedAt**と**updatedBy**を記録
- [ ] 削除は**論理削除**（deletedAtフィールド）を推奨

---

## 8. 将来の認証設計（本番移行時）

### 8.1 Firebase Authentication

Dev Modeではクエリパラメータでロール判定していますが、本番環境ではFirebase Authenticationを使用します：

```typescript
// 将来の認証フロー
1. ユーザーがログイン（メール/パスワード or Google認証）
2. Firebase Auth からカスタムクレームを取得
   - claims.role: 'admin' | 'staff' | 'family'
   - claims.facilityId: 所属施設ID
   - claims.residentIds: 担当入居者ID（家族の場合）
3. APIリクエストにIDトークンを付与
4. Cloud Functions でトークンを検証し権限チェック
```

### 8.2 Firestoreセキュリティルール

```javascript
// firestore.rules（本番用）
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ヘルパー関数
    function isAuthenticated() {
      return request.auth != null;
    }

    function getRole() {
      return request.auth.token.role;
    }

    function isAdmin() {
      return getRole() == 'admin';
    }

    function isStaff() {
      return getRole() == 'staff';
    }

    function isFamily() {
      return getRole() == 'family';
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // 品物コレクション
    match /care_items/{itemId} {
      allow read: if isAuthenticated();
      allow create: if isFamily();
      allow update: if isAdmin() || (isFamily() && isOwner(resource.data.userId));
      allow delete: if isAdmin() || (isFamily() && isOwner(resource.data.userId));
    }

    // ケア指示コレクション
    match /care_instructions/{instructionId} {
      allow read: if isAuthenticated();
      allow create: if isFamily();
      allow update: if isAdmin() || (isFamily() && isOwner(resource.data.userId));
      allow delete: if isAdmin() || (isFamily() && isOwner(resource.data.userId));
    }

    // 記録データ（plan_data）
    match /plan_data/{docId} {
      allow read: if isAuthenticated();
      allow write: if false; // Cloud Functionsからのみ書き込み
    }
  }
}
```

---

## 9. 参照資料

- [ARCHITECTURE.md](./ARCHITECTURE.md) - システム全体設計
- [FAMILY_UX_DESIGN.md](./FAMILY_UX_DESIGN.md) - 家族向けUX設計
- [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) - 品物管理詳細設計
- [TASK_MANAGEMENT_SPEC.md](./TASK_MANAGEMENT_SPEC.md) - タスク管理詳細設計
