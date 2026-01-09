import { Routes, Route, Navigate } from 'react-router-dom';
import { useRoleTheme } from './hooks/useRoleTheme';
import { useVersionCheck } from './hooks/useVersionCheck';
import { PWAUpdateNotification } from './components/PWAUpdateNotification';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

/** 家族専用アカウント（常に家族ビューにリダイレクト） */
const FAMILY_ONLY_EMAILS = ['kinuekamachi@gmail.com'];

/** スタッフ専用ドメイン（常にスタッフビューにリダイレクト） */
const STAFF_ONLY_DOMAINS = ['aozora-cg.com'];

/**
 * ロールに応じたリダイレクトコンポーネント
 *
 * 優先順位:
 * 1. 家族専用アカウント → /family（強制）
 * 2. スタッフ専用ドメイン → /staff/notes（強制）
 * 3. localStorage の userRole に基づいて決定
 *    - staff → /staff/notes（注意事項）
 *    - family → /family（家族ホーム）
 *    - 未設定 → /view（記録閲覧）
 */
function RoleBasedRedirect() {
  const { user } = useAuth();
  const savedRole = localStorage.getItem('userRole');
  const emailDomain = user?.email?.split('@')[1];

  // 家族専用アカウントは常に家族ビューにリダイレクト
  if (user?.email && FAMILY_ONLY_EMAILS.includes(user.email)) {
    localStorage.setItem('userRole', 'family');
    return <Navigate to="/family" replace />;
  }

  // スタッフ専用ドメインは常にスタッフビューにリダイレクト
  if (emailDomain && STAFF_ONLY_DOMAINS.includes(emailDomain)) {
    localStorage.setItem('userRole', 'staff');
    return <Navigate to="/staff/notes" replace />;
  }

  if (savedRole === 'staff') {
    return <Navigate to="/staff/notes" replace />;
  }
  if (savedRole === 'family') {
    return <Navigate to="/family" replace />;
  }
  // デフォルト: 記録閲覧（初回アクセス時）
  return <Navigate to="/view" replace />;
}

// 共有ビュー
import { ViewPage } from './pages/ViewPage';
import { StatsDashboard } from './pages/shared/StatsDashboard';
import { ItemTimeline } from './pages/shared/ItemTimeline';
// Phase 21: チャット機能一時非表示
// import { ChatListPage } from './pages/shared/ChatListPage';
// import { ItemChatPage } from './pages/shared/ItemChatPage';

// スタッフ専用
import { MealInputPage } from './pages/MealInputPage';
import { FamilyMessages } from './pages/staff/FamilyMessages';
import { FamilyMessageDetail } from './pages/staff/FamilyMessageDetail';
import { StaffNotesPage } from './pages/staff/StaffNotesPage';

// 家族専用
import { FamilyDashboard } from './pages/family/FamilyDashboard';
import { EvidenceMonitor } from './pages/family/EvidenceMonitor';
import { ItemManagement } from './pages/family/ItemManagement';
import { ItemForm } from './pages/family/ItemForm';
import { ItemDetail } from './pages/family/ItemDetail';
import { ItemEditPage } from './pages/family/ItemEditPage';
import { PresetManagement } from './pages/family/PresetManagement';
// Phase 26: 入居者設定削除
// import { ResidentSettings } from './pages/family/ResidentSettings';

// デモショーケース
import { DemoHome } from './pages/demo/DemoHome';
import { DemoShowcase } from './pages/demo/DemoShowcase';
import { DemoStaffHome } from './pages/demo/DemoStaffHome';
import { DemoStaffShowcase } from './pages/demo/DemoStaffShowcase';

// レガシー
import { SheetDetailPage } from './pages/SheetDetailPage';

// 設定ページ（独立）
import { SettingsPage } from './pages/SettingsPage';

function App() {
  // ロール別テーマカラーを自動適用
  useRoleTheme();

  // 起動時にバージョンチェック（古ければ自動リロード）
  useVersionCheck();

  return (
    <ProtectedRoute>
    <Routes>
      {/* デフォルト: ロールに応じてリダイレクト */}
      <Route path="/" element={<RoleBasedRedirect />} />

      {/* ========== 共有ビュー ========== */}
      {/* 記録閲覧（スタッフ・家族共通） */}
      <Route path="/view" element={<ViewPage />} />

      {/* 統計ダッシュボード */}
      <Route path="/stats" element={<StatsDashboard />} />

      {/* 品物タイムライン（共有） */}
      <Route path="/items/:id/timeline" element={<ItemTimeline />} />

      {/* ========== スタッフ専用 ========== */}
      {/* スタッフホーム → 注意事項ページへリダイレクト（Phase 40） */}
      <Route path="/staff" element={<Navigate to="/staff/notes" replace />} />

      {/* 食事記録入力 */}
      <Route path="/staff/input/meal" element={<MealInputPage />} />

      {/* スタッフ注意事項（Phase 40） */}
      <Route path="/staff/notes" element={<StaffNotesPage />} />

      {/* 家族連絡一覧（品物確認用） */}
      <Route path="/staff/family-messages" element={<FamilyMessages />} />

      {/* 家族連絡詳細（消費記録入力） */}
      <Route path="/staff/family-messages/:id" element={<FamilyMessageDetail />} />

      {/* Phase 21: チャット機能一時非表示
      <Route path="/staff/chats" element={<ChatListPage userType="staff" />} />
      <Route path="/staff/chat/:id" element={<ItemChatPage userType="staff" userName="スタッフ" />} />
      */}

      {/* スタッフ用統計（共有ページへリダイレクト） */}
      <Route path="/staff/stats" element={<Navigate to="/stats" replace />} />

      {/* ========== 家族専用 ========== */}
      {/* 家族ホーム */}
      <Route path="/family" element={<FamilyDashboard />} />

      {/* 品物管理 */}
      <Route path="/family/items" element={<ItemManagement />} />
      <Route path="/family/items/new" element={<ItemForm />} />
      <Route path="/family/items/:id" element={<ItemDetail />} />
      <Route path="/family/items/:id/edit" element={<ItemEditPage />} />

      {/* プリセット管理 */}
      <Route path="/family/presets" element={<PresetManagement />} />

      {/* Phase 26: 入居者設定削除
      <Route path="/family/settings/resident" element={<ResidentSettings />} />
      */}

      {/* エビデンス確認 */}
      <Route path="/family/evidence/:date" element={<EvidenceMonitor />} />

      {/* Phase 21: チャット機能一時非表示
      <Route path="/family/chats" element={<ChatListPage userType="family" />} />
      <Route path="/family/chat/:id" element={<ItemChatPage userType="family" userName="家族" />} />
      */}

      {/* 家族用統計（共有ページへリダイレクト） */}
      <Route path="/family/stats" element={<Navigate to="/stats" replace />} />

      {/* レガシーパス（後方互換） */}
      <Route path="/input/meal" element={<Navigate to="/staff/input/meal" replace />} />
      <Route path="/sheet/:sheetName" element={<SheetDetailPage />} />

      {/* ========== 設定ページ（独立） ========== */}
      {/* フッターなし・戻るボタンなし・単独リンクからのアクセス */}
      <Route path="/settings" element={<SettingsPage />} />

      {/* ========== デモショーケース ========== */}
      {/* デモホーム */}
      <Route path="/demo" element={<DemoHome />} />

      {/* ガイド付きツアー */}
      <Route path="/demo/showcase" element={<DemoShowcase />} />

      {/* デモ: 家族ビュー（家族向け特化） */}
      <Route path="/demo/family" element={<FamilyDashboard />} />
      <Route path="/demo/family/items" element={<ItemManagement />} />
      <Route path="/demo/family/items/new" element={<ItemForm />} />
      <Route path="/demo/family/items/:id" element={<ItemDetail />} />
      <Route path="/demo/family/items/:id/edit" element={<ItemEditPage />} />
      <Route path="/demo/family/presets" element={<PresetManagement />} />
      {/* Phase 26: 入居者設定削除
      <Route path="/demo/family/settings/resident" element={<ResidentSettings />} />
      */}
      <Route path="/demo/family/evidence/:date" element={<EvidenceMonitor />} />
      {/* Phase 21: チャット機能一時非表示
      <Route path="/demo/family/chats" element={<ChatListPage userType="family" />} />
      <Route path="/demo/family/chat/:id" element={<ItemChatPage userType="family" userName="家族" />} />
      */}

      {/* デモ: スタッフホーム */}
      <Route path="/demo/staff" element={<DemoStaffHome />} />

      {/* デモ: スタッフ用ガイドツアー */}
      <Route path="/demo/staff/showcase" element={<DemoStaffShowcase />} />

      {/* デモ: スタッフ食事記録入力 */}
      <Route path="/demo/staff/input/meal" element={<MealInputPage />} />

      {/* デモ: スタッフ注意事項（Phase 40） */}
      <Route path="/demo/staff/notes" element={<StaffNotesPage />} />

      {/* デモ: スタッフ家族連絡（品物確認用） */}
      <Route path="/demo/staff/family-messages" element={<FamilyMessages />} />
      <Route path="/demo/staff/family-messages/:id" element={<FamilyMessageDetail />} />

      {/* Phase 21: チャット機能一時非表示
      <Route path="/demo/staff/chats" element={<ChatListPage userType="staff" />} />
      <Route path="/demo/staff/chat/:id" element={<ItemChatPage userType="staff" userName="スタッフ" />} />
      */}

      {/* デモ: スタッフ統計（共有統計ページへリダイレクト） */}
      <Route path="/demo/staff/stats" element={<Navigate to="/demo/stats" replace />} />

      {/* デモ: 統計ダッシュボード */}
      <Route path="/demo/stats" element={<StatsDashboard />} />

      {/* デモ: 記録閲覧（共有ビュー） */}
      <Route path="/demo/view" element={<ViewPage />} />

      {/* デモ: 品物タイムライン */}
      <Route path="/demo/items/:id/timeline" element={<ItemTimeline />} />
    </Routes>

    {/* PWA更新通知 */}
    <PWAUpdateNotification />
    </ProtectedRoute>
  );
}

export default App;
