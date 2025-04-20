import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { FaChartLine, FaChartBar, FaChartPie, FaUsers, FaGraduationCap, FaClock, FaCheckCircle } from 'react-icons/fa';
import Sidebar from '../../components/layout/Sidebar';

const TeacherAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    submissions: [],
    examPerformance: [],
    categoryDistribution: [],
    studentProgress: [],
    recentActivity: [],
    hourlySubmissions: [],
    passingRates: [],
    studentEngagement: []
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch all exams created by the teacher
        const examsQuery = query(
          collection(db, 'exams'),
          where('teacherId', '==', auth.currentUser.uid)
        );
        const examsSnapshot = await getDocs(examsQuery);
        const exams = examsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch all submissions for teacher's exams
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('teacherId', '==', auth.currentUser.uid)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const submissions = submissionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Process exam performance data
        const examPerformance = exams.map(exam => {
          const examSubmissions = submissions.filter(s => s.examId === exam.id);
          const validScores = examSubmissions.filter(s => typeof s.score === 'number');
          const averageScore = validScores.length > 0
            ? Math.round(validScores.reduce((acc, s) => acc + (s.score || 0), 0) / validScores.length)
            : 0;
          
          return {
            name: exam.title || 'Untitled Exam',
            averageScore,
            submissions: examSubmissions.length,
            passingRate: examSubmissions.length > 0
              ? Math.round((examSubmissions.filter(s => (s.score || 0) >= (exam.passingScore || 60)).length / examSubmissions.length) * 100)
              : 0
          };
        });

        // Process category distribution
        const categoryData = {};
        submissions.forEach(submission => {
          const exam = exams.find(e => e.id === submission.examId);
          if (!exam) return;

          const category = exam.category || 'Uncategorized';
          if (!categoryData[category]) {
            categoryData[category] = {
              category,
              submissions: 0,
              totalScore: 0,
              passed: 0
            };
          }
          categoryData[category].submissions++;
          categoryData[category].totalScore += submission.score || 0;
          if ((submission.score || 0) >= (exam.passingScore || 60)) {
            categoryData[category].passed++;
          }
        });

        const categoryDistribution = Object.values(categoryData).map(cat => ({
          name: cat.category,
          averageScore: cat.submissions > 0 ? Math.round(cat.totalScore / cat.submissions) : 0,
          submissions: cat.submissions,
          passingRate: cat.submissions > 0 ? Math.round((cat.passed / cat.submissions) * 100) : 0
        }));

        // Process student progress over time
        const studentProgress = submissions
          .sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0))
          .map(submission => ({
            date: submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'N/A',
            score: submission.score || 0,
            examTitle: exams.find(e => e.id === submission.examId)?.title || 'Unknown Exam'
          }));

        // Process hourly submission distribution
        const hourlyData = Array(24).fill(0);
        submissions.forEach(submission => {
          if (!submission.submittedAt) return;
          const hour = new Date(submission.submittedAt).getHours();
          hourlyData[hour]++;
        });

        const hourlySubmissions = hourlyData.map((count, hour) => ({
          hour: `${hour}:00`,
          submissions: count
        }));

        // Process passing rates over time
        const passingRates = submissions
          .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
          .reduce((acc, submission) => {
            const exam = exams.find(e => e.id === submission.examId);
            if (!exam) return acc;
            
            const month = new Date(submission.submittedAt).toLocaleString('default', { month: 'short' });
            if (!acc[month]) {
              acc[month] = { passed: 0, total: 0 };
            }
            acc[month].total++;
            if (submission.score >= (exam.passingScore || 60)) {
              acc[month].passed++;
            }
            return acc;
          }, {});

        const passingRatesData = Object.entries(passingRates).map(([month, data]) => ({
          month,
          passingRate: data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0
        }));

        // Process student engagement
        const studentEngagement = submissions.reduce((acc, submission) => {
          if (!submission.studentId) return acc;
          
          const exam = exams.find(e => e.id === submission.examId);
          if (!exam) return acc;

          const studentId = submission.studentId;
          if (!acc[studentId]) {
            acc[studentId] = {
              studentName: submission.studentName || 'Anonymous',
              attempts: 0,
              averageScore: 0,
              totalScore: 0
            };
          }
          acc[studentId].attempts++;
          acc[studentId].totalScore += submission.score || 0;
          acc[studentId].averageScore = Math.round(acc[studentId].totalScore / acc[studentId].attempts);
          return acc;
        }, {});

        const studentEngagementData = Object.values(studentEngagement)
          .sort((a, b) => b.attempts - a.attempts)
          .slice(0, 10);

        // Process recent activity with more details
        const recentActivity = submissions
          .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
          .slice(0, 10)
          .map(submission => {
            const exam = exams.find(e => e.id === submission.examId);
            const passingScore = exam?.passingScore || 60;
            return {
              examTitle: exam?.title || 'Unknown Exam',
              studentName: submission.studentName || 'Anonymous',
              score: submission.score || 0,
              passingScore,
              submittedAt: submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A',
              status: (submission.score || 0) >= passingScore ? 'Passed' : 'Failed',
              timeSpent: submission.timeSpent || 'N/A'
            };
          });

        setAnalyticsData({
          submissions,
          examPerformance,
          categoryDistribution,
          studentProgress,
          recentActivity,
          hourlySubmissions,
          passingRates: passingRatesData,
          studentEngagement: studentEngagementData
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const calculateStats = () => {
    const { submissions, examPerformance } = analyticsData;
    if (!submissions.length) return null;

    return {
      totalExams: examPerformance.length,
      totalSubmissions: submissions.length,
      averageScore: Math.round(submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length),
      activeStudents: new Set(submissions.map(s => s.studentId)).size
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="teacher" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="ml-80 p-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Teacher Analytics Dashboard</h1>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : !stats ? (
          <div className="text-center text-gray-600 py-8">
            <p>No exam data available yet. Create some exams to see analytics.</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Exams</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalExams}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <FaChartLine className="h-6 w-6 text-blue-600" />
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
                    <FaChartBar className="h-6 w-6 text-green-600" />
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
                    <FaChartPie className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Students</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
                  </div>
                  <div className="p-3 rounded-full bg-yellow-100">
                    <FaUsers className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Performance Chart */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Exam Performance Overview</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.examPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="averageScore" name="Average Score" fill="#8884d8" />
                    <Bar dataKey="passingRate" name="Passing Rate %" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Category Distribution */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Category Performance</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={analyticsData.categoryDistribution}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar
                        name="Average Score"
                        dataKey="averageScore"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Radar
                        name="Passing Rate"
                        dataKey="passingRate"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Student Progress */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Student Progress Over Time</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.studentProgress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#8884d8"
                        name="Score"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Hourly Submission Distribution */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Hourly Submission Distribution</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.hourlySubmissions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="submissions"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                        name="Submissions"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Passing Rates Trend */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Monthly Passing Rates</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.passingRates}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="passingRate"
                        stroke="#82ca9d"
                        name="Passing Rate %"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Student Engagement */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Top Student Engagement</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.studentEngagement} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="studentName" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="attempts" name="Total Attempts" fill="#8884d8" />
                    <Bar dataKey="averageScore" name="Average Score" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Exam
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Spent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analyticsData.recentActivity.map((activity, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.studentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.examTitle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-medium ${
                            activity.score >= activity.passingScore ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {activity.score}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            activity.status === 'Passed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {activity.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.timeSpent}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.submittedAt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default TeacherAnalytics; 
