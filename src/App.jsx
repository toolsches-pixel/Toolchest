import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import TypingCountries from './pages/tools/TypingCountries'
import PdfEditor from './pages/tools/PdfEditor'
import ImageResizer from './pages/tools/ImageResizer'
import ImageCompressor from './pages/tools/ImageCompressor'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/typingcountries" element={<TypingCountries />} />
          <Route path="/pdf-editor" element={<PdfEditor />} />
          <Route path="/image-resizer" element={<ImageResizer />} />
          <Route path="/image-compressor" element={<ImageCompressor />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App