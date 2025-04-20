import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaChartBar, FaUsers, FaClock } from 'react-icons/fa';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import Sidebar from '../../components/layout/Sidebar';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeExams: 0,
    totalSubmissions: 0,
    averageScore: 0,
    pendingReviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch active exams
        const examsQuery = query(
          collection(db, 'exams'),
          where('createdBy', '==', auth.currentUser.uid),
          where('status', '==', 'active')
        );
        const examsSnapshot = await getDocs(examsQuery);
        const activeExams = examsSnapshot.docs.length;

        // Fetch submissions
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('teacherId', '==', auth.currentUser.uid)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const submissions = submissionsSnapshot.docs.map(doc => doc.data());
        
        const totalSubmissions = submissions.length;
        const scores = submissions.map(s => s.score || 0);
        const averageScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;
        const pendingReviews = submissions.filter(s => !s.reviewed).length;

        setStats({
          activeExams,
          totalSubmissions,
          averageScore,
          pendingReviews,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Active Exams',
      value: stats.activeExams,
      icon: FaClock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Submissions',
      value: stats.totalSubmissions,
      icon: FaUsers,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Average Score',
      value: `${stats.averageScore}%`,
      icon: FaChartBar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: FaClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="teacher" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="ml-80 p-8"
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <button
            onClick={() => navigate('/create-exam')}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition duration-150 ease-in-out"
          >
            <FaPlus className="mr-2" />
            Create Exam
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.totalSubmissions === 0 ? (
                <p className="text-gray-600">No recent activity to display.</p>
              ) : (
                <p className="text-gray-600">Activity data will be displayed here.</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TeacherDashboard; 