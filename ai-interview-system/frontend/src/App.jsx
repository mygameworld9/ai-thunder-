import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './store/authStore'
import InterviewSetupPage from './pages/InterviewSetupPage'
import InterviewChatPage from './pages/InterviewChatPage'
import InterviewReportPage from './pages/InterviewReportPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import './styles/App.css'

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<InterviewSetupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/interview/:sessionId" element={<InterviewPage />} />
          <Route path="/report/:sessionId" element={<ReportPage />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
