import { Routes, Route, Navigate } from 'react-router-dom';

// 共有ビュー
import { ViewPage } from './pages/ViewPage';
import { StatsDashboard } from './pages/shared/StatsDashboard';
import { ItemTimeline } from './pages/shared/ItemTimeline';
import { ChatListPage } from './pages/shared/ChatListPage';
import { ItemChatPage } from './pages/shared/ItemChatPage';

// スタッフ専用
import { StaffHome } from './pages/staff/StaffHome';
import { MealInputPage } from './pages/MealInputPage';
import { FamilyMessages } from './pages/staff/FamilyMessages';
import { FamilyMessageDetail } from './pages/staff/FamilyMessageDetail';

// 家族専用
import { FamilyDashboard } from './pages/family/FamilyDashboard';
import { EvidenceMonitor } from './pages/family/EvidenceMonitor';
import { RequestBuilder } from './pages/family/RequestBuilder';
import { ItemManagement } from './pages/family/ItemManagement';
import { ItemForm } from './pages/family/ItemForm';
import { ItemDetail } from './pages/family/ItemDetail';
import { TaskList } from './pages/family/TaskList';
import { PresetManagement } from './pages/family/PresetManagement';
import { ResidentSettings } from './pages/family/ResidentSettings';

// デモショーケース
import { DemoHome } from './pages/demo/DemoHome';
import { DemoShowcase } from './pages/demo/DemoShowcase';
import { DemoStaffHome } from './pages/demo/DemoStaffHome';
import { DemoStaffShowcase } from './pages/demo/DemoStaffShowcase';

// レガシー
import { SheetDetailPage } from './pages/SheetDetailPage';

function App() {
  return (
    <Routes>
      {/* デフォルト: /view へリダイレクト */}
      <Route path="/" element={<Navigate to="/view" replace />} />

      {/* ========== 共有ビュー ========== */}
      {/* 記録閲覧（スタッフ・家族共通） */}
      <Route path="/view" element={<ViewPage />} />

      {/* 統計ダッシュボード */}
      <Route path="/stats" element={<StatsDashboard />} />

      {/* 品物タイムライン（共有） */}
      <Route path="/items/:id/timeline" element={<ItemTimeline />} />

      {/* ========== スタッフ専用 ========== */}
      {/* スタッフホーム */}
      <Route path="/staff" element={<StaffHome />} />

      {/* 食事記録入力 */}
      <Route path="/staff/input/meal" element={<MealInputPage />} />

      {/* 家族連絡一覧 */}
      <Route path="/staff/family-messages" element={<FamilyMessages />} />

      {/* 家族連絡詳細（消費記録入力） */}
      <Route path="/staff/family-messages/:id" element={<FamilyMessageDetail />} />

      {/* チャット一覧・詳細（Phase 18） */}
      <Route path="/staff/chats" element={<ChatListPage userType="staff" />} />
      <Route path="/staff/chat/:id" element={<ItemChatPage userType="staff" userName="スタッフ" />} />

      {/* スタッフ用統計（共有ページへリダイレクト） */}
      <Route path="/staff/stats" element={<Navigate to="/stats" replace />} />

      {/* ========== 家族専用 ========== */}
      {/* 家族ホーム */}
      <Route path="/family" element={<FamilyDashboard />} />

      {/* 品物管理 */}
      <Route path="/family/items" element={<ItemManagement />} />
      <Route path="/family/items/new" element={<ItemForm />} />
      <Route path="/family/items/:id" element={<ItemDetail />} />

      {/* ケア指示 */}
      <Route path="/family/request" element={<RequestBuilder />} />
      <Route path="/family/request/:id" element={<RequestBuilder />} />

      {/* プリセット管理 */}
      <Route path="/family/presets" element={<PresetManagement />} />

      {/* 入居者設定（禁止ルール等） */}
      <Route path="/family/settings/resident" element={<ResidentSettings />} />

      {/* タスク一覧 */}
      <Route path="/family/tasks" element={<TaskList />} />

      {/* エビデンス確認 */}
      <Route path="/family/evidence/:date" element={<EvidenceMonitor />} />

      {/* チャット一覧・詳細（Phase 18） */}
      <Route path="/family/chats" element={<ChatListPage userType="family" />} />
      <Route path="/family/chat/:id" element={<ItemChatPage userType="family" userName="家族" />} />

      {/* 家族用統計（共有ページへリダイレクト） */}
      <Route path="/family/stats" element={<Navigate to="/stats" replace />} />

      {/* レガシーパス（後方互換） */}
      <Route path="/input/meal" element={<Navigate to="/staff/input/meal" replace />} />
      <Route path="/settings" element={<Navigate to="/staff/input/meal?admin=true" replace />} />
      <Route path="/sheet/:sheetName" element={<SheetDetailPage />} />

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
      <Route path="/demo/family/tasks" element={<TaskList />} />
      <Route path="/demo/family/presets" element={<PresetManagement />} />
      <Route path="/demo/family/settings/resident" element={<ResidentSettings />} />
      <Route path="/demo/family/evidence/:date" element={<EvidenceMonitor />} />
      <Route path="/demo/family/chats" element={<ChatListPage userType="family" />} />
      <Route path="/demo/family/chat/:id" element={<ItemChatPage userType="family" userName="家族" />} />

      {/* デモ: スタッフホーム */}
      <Route path="/demo/staff" element={<DemoStaffHome />} />

      {/* デモ: スタッフ用ガイドツアー */}
      <Route path="/demo/staff/showcase" element={<DemoStaffShowcase />} />

      {/* デモ: スタッフ食事記録入力 */}
      <Route path="/demo/staff/input/meal" element={<MealInputPage />} />

      {/* デモ: スタッフ家族連絡 */}
      <Route path="/demo/staff/family-messages" element={<FamilyMessages />} />
      <Route path="/demo/staff/family-messages/:id" element={<FamilyMessageDetail />} />

      {/* デモ: スタッフチャット（Phase 18） */}
      <Route path="/demo/staff/chats" element={<ChatListPage userType="staff" />} />
      <Route path="/demo/staff/chat/:id" element={<ItemChatPage userType="staff" userName="スタッフ" />} />

      {/* デモ: スタッフ統計（共有統計ページへリダイレクト） */}
      <Route path="/demo/staff/stats" element={<Navigate to="/demo/stats" replace />} />

      {/* デモ: 統計ダッシュボード */}
      <Route path="/demo/stats" element={<StatsDashboard />} />

      {/* デモ: 記録閲覧（共有ビュー） */}
      <Route path="/demo/view" element={<ViewPage />} />

      {/* デモ: 品物タイムライン */}
      <Route path="/demo/items/:id/timeline" element={<ItemTimeline />} />
    </Routes>
  );
}

export default App;
