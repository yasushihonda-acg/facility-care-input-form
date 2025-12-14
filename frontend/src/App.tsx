import { Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { SheetDetailPage } from './pages/SheetDetailPage'
import { MealInputPage } from './pages/MealInputPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/sheet/:sheetName" element={<SheetDetailPage />} />
      <Route path="/input/meal" element={<MealInputPage />} />
    </Routes>
  )
}

export default App
