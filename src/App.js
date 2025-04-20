import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './config/firebase';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import StudentDashboard from './pages/student/Dashboard';
import TeacherDashboard from './pages/teacher/Dashboard';
import CreateExam from './pages/teacher/CreateExam';
import TakeExam from './pages/student/TakeExam';
import MyResults from './pages/student/MyResults';
import ViewSubmissions from './pages/teacher/ViewSubmissions';
import BookmarkedExams from './pages/student/BookmarkedExams';
import FlaggedQuestions from './pages/teacher/FlaggedQuestions';
import Analytics from './pages/student/Analytics';

// Components
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/auth/ProtectedRoute';

const App = () => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          setUser({ ...user, role: userData?.role });
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Only show Navbar on public routes */}
        {!user && <Navbar />}
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Home />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/signup"
            element={user ? <Navigate to="/dashboard" /> : <SignUp />}
          />
          <Route
            path="/forgot-password"
            element={user ? <Navigate to="/dashboard" /> : <ForgotPassword />}
          />
          
          {/* Student Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                {user?.role === 'student' ? (
                  <StudentDashboard isAvailableExamsPage={false} />
                ) : (
                  <TeacherDashboard />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/available-exams"
            element={
              <ProtectedRoute user={user}>
                {user?.role === 'student' ? (
                  <StudentDashboard isAvailableExamsPage={true} />
                ) : (
                  <Navigate to="/dashboard" />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:examId"
            element={
              <ProtectedRoute user={user}>
                {user?.role === 'student' ? <TakeExam /> : <Navigate to="/dashboard" />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-results"
            element={
              <ProtectedRoute user={user}>
                {user?.role === 'student' ? <MyResults /> : <Navigate to="/dashboard" />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookmarked"
            element={
              <ProtectedRoute user={user}>
                {user?.role === 'student' ? <BookmarkedExams /> : <Navigate to="/dashboard" />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute user={user}>
                {user?.role === 'student' ? <Analytics /> : <Navigate to="/dashboard" />}
              </ProtectedRoute>
            }
          />

          {/* Teacher Routes */}
          <Route
            path="/create-exam"
            element={
              <ProtectedRoute user={user}>
                {user?.role === 'teacher' ? <CreateExam /> : <Navigate to="/dashboard" />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/view-submissions"
            element={
              <ProtectedRoute user={user}>
                {user?.role === 'teacher' ? <ViewSubmissions /> : <Navigate to="/dashboard" />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/flagged-questions"
            element={
              <ProtectedRoute user={user}>
                {user?.role === 'teacher' ? <FlaggedQuestions /> : <Navigate to="/dashboard" />}
              </ProtectedRoute>
            }
          />

          {/* Settings Route */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute user={user}>
                <div className="min-h-screen bg-gray-50">
                  <div className="ml-80 p-8">
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="mt-4 text-gray-600">Settings page coming soon...</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

