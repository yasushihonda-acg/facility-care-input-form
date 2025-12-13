import { Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { SheetDetailPage } from './pages/SheetDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/sheet/:sheetName" element={<SheetDetailPage />} />
    </Routes>
  )
}

export default App
