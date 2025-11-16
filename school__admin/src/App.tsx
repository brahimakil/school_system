import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import DashboardHome from './pages/DashboardHome';
import Statistics from './pages/Statistics';
import TeachersManagement from './pages/TeachersManagement';
import StudentsManagement from './pages/StudentsManagement';
import ClassesManagement from './pages/ClassesManagement';
import SubjectsManagement from './pages/SubjectsManagement';
import QuizzesManagement from './pages/QuizzesManagement';
import HomeworksManagement from './pages/HomeworksManagement';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="teachers" element={<TeachersManagement />} />
            <Route path="students" element={<StudentsManagement />} />
            <Route path="classes" element={<ClassesManagement />} />
            <Route path="subjects" element={<SubjectsManagement />} />
            <Route path="tasks/quizzes" element={<QuizzesManagement />} />
            <Route path="tasks/homeworks" element={<HomeworksManagement />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
