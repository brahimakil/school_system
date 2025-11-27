import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

// Lazy load dashboard pages
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const Statistics = lazy(() => import('./pages/Statistics'));
const TeachersManagement = lazy(() => import('./pages/TeachersManagement'));
const StudentsManagement = lazy(() => import('./pages/StudentsManagement'));
const ClassesManagement = lazy(() => import('./pages/ClassesManagement'));
const SubjectsManagement = lazy(() => import('./pages/SubjectsManagement'));
const QuizzesManagement = lazy(() => import('./pages/QuizzesManagement'));
const HomeworksManagement = lazy(() => import('./pages/HomeworksManagement'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
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
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
