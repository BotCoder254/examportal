import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { FaClock, FaUsers, FaChartLine, FaExclamationTriangle } from 'react-icons/fa';
import Sidebar from '../../components/layout/Sidebar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const ExamHistory = () => {
  const [examHistory, setExamHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExams: 0,
    totalSubmissions: 0,
    averageScore: 0,
    pendingReviews: 0
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    const fetchExamHistory = async () => {
      try {
        // Fetch all exams
        const examsSnapshot = await getDocs(collection(db, 'exams'));
        const exams = examsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(exam => exam.teacherId === auth.currentUser.uid)
          .sort((a, b) => b.createdAt - a.createdAt);

        // Fetch all submissions
        const submissionsSnapshot = await getDocs(collection(db, 'submissions'));
        const submissions = submissionsSnapshot.docs.map(doc => doc.data());

        // Combine exam data with submission stats
        const history = exams.map(exam => {
          const examSubmissions = submissions.filter(s => s.examId === exam.id);
          const submissionCount = examSubmissions.length;
          const scores = examSubmissions.map(s => s.score || 0);
          const averageScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
          const pendingReviews = examSubmissions.filter(s => !s.reviewed).length;

          return {
            ...exam,
            submissionCount,
            averageScore,
            pendingReviews
          };
        });

        // Calculate overall statistics
        const totalExams = history.length;
        const totalSubmissions = history.reduce((sum, exam) => sum + exam.submissionCount, 0);
        const overallScores = history.filter(exam => exam.submissionCount > 0)
          .map(exam => exam.averageScore);
        const averageScore = overallScores.length > 0
          ? Math.round(overallScores.reduce((a, b) => a + b, 0) / overallScores.length)
          : 0;
        const pendingReviews = history.reduce((sum, exam) => sum + exam.pendingReviews, 0);

        setStats({
          totalExams,
          totalSubmissions,
          averageScore,
          pendingReviews
        });

        setExamHistory(history);
      } catch (error) {
        console.error('Error fetching exam history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExamHistory();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Prepare data for charts
  const submissionTrendData = examHistory.map(exam => ({
    name: exam.title?.substring(0, 15) + '...',
    submissions: exam.submissionCount,
    averageScore: exam.averageScore
  }));

  const statusDistributionData = [
    { name: 'Active', value: examHistory.filter(e => e.status === 'active').length },
    { name: 'Draft', value: examHistory.filter(e => e.status === 'draft').length },
    { name: 'Completed', value: examHistory.filter(e => e.status === 'completed').length },
    { name: 'Archived', value: examHistory.filter(e => e.status === 'archived').length }
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Exam History</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Exams</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalExams}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <FaClock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <FaUsers className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <FaChartLine className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingReviews}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Submission Trend Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission Trends</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={submissionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="submissions"
                    stroke="#8884d8"
                    name="Submissions"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="averageScore"
                    stroke="#82ca9d"
                    name="Average Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Exam Status Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Exam Status Distribution</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Exam History Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : examHistory.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No exam history available
                    </td>
                  </tr>
                ) : (
                  examHistory.map((exam) => (
                    <tr key={exam.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {exam.title || 'Untitled Exam'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(exam.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {exam.submissionCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {exam.averageScore}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          exam.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {exam.status || 'Draft'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ExamHistory; 