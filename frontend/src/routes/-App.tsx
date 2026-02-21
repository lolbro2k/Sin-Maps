import { Routes, Route } from 'react-router-dom'
import Map from '../components/map'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div>Home</div>} />
      <Route path="/map" element={<Map />} />
    </Routes>
  )
}