import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
  Cell
} from 'recharts';
import { FaChartLine, FaChartBar, FaChartPie, FaRadiation } from 'react-icons/fa';
import Sidebar from '../../components/layout/Sidebar';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    submissions: [],
    performanceOverTime: [],
    categoryPerformance: [],
    difficultyDistribution: [],
    recentScores: []
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch all submissions for the current student
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('studentId', '==', auth.currentUser.uid)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const submissions = submissionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch all exams
        const examsSnapshot = await getDocs(collection(db, 'exams'));
        const examsData = examsSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = { id: doc.id, ...doc.data() };
          return acc;
        }, {});

        // Process data for charts
        const processedSubmissions = submissions.map(submission => ({
          ...submission,
          exam: examsData[submission.examId]
        })).filter(sub => sub.exam); // Filter out submissions with no exam data

        // Performance over time
        const performanceOverTime = processedSubmissions
          .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
          .map(sub => ({
            date: new Date(sub.submittedAt).toLocaleDateString(),
            score: sub.score,
            examTitle: sub.exam.title
          }));

        // Category performance
        const categoryData = {};
        processedSubmissions.forEach(sub => {
          const category = sub.exam.category || 'Uncategorized';
          if (!categoryData[category]) {
            categoryData[category] = {
              category,
              totalScore: 0,
              count: 0
            };
          }
          categoryData[category].totalScore += sub.score;
          categoryData[category].count += 1;
        });

        const categoryPerformance = Object.values(categoryData).map(cat => ({
          category: cat.category,
          averageScore: Math.round(cat.totalScore / cat.count)
        }));

        // Difficulty distribution
        const difficultyData = {};
        processedSubmissions.forEach(sub => {
          const difficulty = sub.exam.difficulty || 'Medium';
          if (!difficultyData[difficulty]) {
            difficultyData[difficulty] = {
              difficulty,
              count: 0,
              totalScore: 0
            };
          }
          difficultyData[difficulty].count += 1;
          difficultyData[difficulty].totalScore += sub.score;
        });

        const difficultyDistribution = Object.values(difficultyData).map(diff => ({
          difficulty: diff.difficulty,
          count: diff.count,
          averageScore: Math.round(diff.totalScore / diff.count)
        }));

        // Recent scores (last 5 exams)
        const recentScores = processedSubmissions
          .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
          .slice(0, 5)
          .map(sub => ({
            name: sub.exam.title,
            score: sub.score,
            passingScore: sub.exam.passingScore
          }));

        setAnalyticsData({
          submissions: processedSubmissions,
          performanceOverTime,
          categoryPerformance,
          difficultyDistribution,
          recentScores
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
    const submissions = analyticsData.submissions;
    if (!submissions.length) return null;

    const scores = submissions.map(s => s.score);
    return {
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      totalExams: scores.length
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="student" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="ml-80 p-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics Dashboard</h1>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : !stats ? (
          <div className="text-center text-gray-600 py-8">
            <p>No exam data available yet. Complete some exams to see your analytics.</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Score</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <FaChartLine className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Highest Score</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.highestScore}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <FaChartBar className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Lowest Score</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.lowestScore}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-red-100">
                    <FaChartPie className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Exams</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalExams}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <FaRadiation className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Over Time Chart */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Over Time</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.performanceOverTime}>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Category Performance */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Performance by Category</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.categoryPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="averageScore"
                        fill="#8884d8"
                        name="Average Score"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Difficulty Distribution */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Performance by Difficulty</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={analyticsData.difficultyDistribution}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="difficulty" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar
                        name="Average Score"
                        dataKey="averageScore"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Scores */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Exam Scores</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.recentScores}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" fill="#8884d8" name="Your Score" />
                    <Bar dataKey="passingScore" fill="#82ca9d" name="Passing Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Analytics; 