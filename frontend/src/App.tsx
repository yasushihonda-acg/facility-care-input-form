import { Routes, Route, Navigate } from 'react-router-dom'
import { ViewPage } from './pages/ViewPage'
import { SheetDetailPage } from './pages/SheetDetailPage'
import { MealInputPage } from './pages/MealInputPage'

function App() {
  return (
    <Routes>
      {/* メインルート: /view へリダイレクト */}
      <Route path="/" element={<Navigate to="/view" replace />} />

      {/* 閲覧ビュー */}
      <Route path="/view" element={<ViewPage />} />

      {/* 入力ビュー（直接食事入力へ） */}
      <Route path="/input/meal" element={<MealInputPage />} />

      {/* シート詳細（レガシー） */}
      <Route path="/sheet/:sheetName" element={<SheetDetailPage />} />
    </Routes>
  )
}

export default App
