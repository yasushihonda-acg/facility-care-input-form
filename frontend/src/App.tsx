import { Routes, Route, Navigate } from 'react-router-dom'
import { ViewPage } from './pages/ViewPage'
import { SheetDetailPage } from './pages/SheetDetailPage'
import { MealInputPage } from './pages/MealInputPage'
import { FamilyDashboard } from './pages/family/FamilyDashboard'
import { EvidenceMonitor } from './pages/family/EvidenceMonitor'
import { RequestBuilder } from './pages/family/RequestBuilder'
import { ItemManagement } from './pages/family/ItemManagement'
import { ItemForm } from './pages/family/ItemForm'
import { TaskList } from './pages/family/TaskList'
import { PresetManagement } from './pages/family/PresetManagement'
import { StatsDashboard } from './pages/shared/StatsDashboard'

function App() {
  return (
    <Routes>
      {/* メインルート: /view へリダイレクト */}
      <Route path="/" element={<Navigate to="/view" replace />} />

      {/* 閲覧ビュー */}
      <Route path="/view" element={<ViewPage />} />

      {/* 入力ビュー（直接食事入力へ） */}
      <Route path="/input/meal" element={<MealInputPage />} />

      {/* 家族ビュー */}
      <Route path="/family" element={<FamilyDashboard />} />
      <Route path="/family/evidence/:date" element={<EvidenceMonitor />} />
      <Route path="/family/request" element={<RequestBuilder />} />
      <Route path="/family/request/:id" element={<RequestBuilder />} />

      {/* 品物管理（Phase 8.1） */}
      <Route path="/family/items" element={<ItemManagement />} />
      <Route path="/family/items/new" element={<ItemForm />} />

      {/* タスク管理（Phase 8.2） */}
      <Route path="/family/tasks" element={<TaskList />} />

      {/* プリセット管理（Phase 8.6） */}
      <Route path="/family/presets" element={<PresetManagement />} />

      {/* 統計ダッシュボード（Phase 8.3） */}
      <Route path="/stats" element={<StatsDashboard />} />
      <Route path="/family/stats" element={<StatsDashboard />} />

      {/* シート詳細（レガシー） */}
      <Route path="/sheet/:sheetName" element={<SheetDetailPage />} />
    </Routes>
  )
}

export default App
