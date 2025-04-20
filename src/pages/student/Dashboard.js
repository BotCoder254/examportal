import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaChartBar, FaClock, FaMedal, FaSearch } from 'react-icons/fa';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import Sidebar from '../../components/layout/Sidebar';

const StudentDashboard = ({ isAvailableExamsPage }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    availableExams: 0,
    completedExams: 0,
    averageScore: 0,
    upcomingExams: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState(isAvailableExamsPage ? 'available' : 'all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all exams
        const examsSnapshot = await getDocs(collection(db, 'exams'));
        const examsData = examsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(exam => exam.isPublished); // Only show published exams

        // Fetch all submissions for the current student
        const submissionsSnapshot = await getDocs(collection(db, 'submissions'));
        const studentSubmissions = submissionsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(sub => sub.studentId === auth.currentUser.uid);

        // Process exams with submission data
        const processedExams = examsData.map(exam => ({
          ...exam,
          hasAttempted: studentSubmissions.some(s => s.examId === exam.id),
          submission: studentSubmissions.find(s => s.examId === exam.id)
        }));

        // Calculate statistics
        const completedExams = studentSubmissions.length;
        const scores = studentSubmissions.map(s => s.score || 0);
        const averageScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

        setStats({
          availableExams: examsData.length,
          completedExams,
          averageScore,
          upcomingExams: examsData.length - completedExams,
        });
        
        setExams(processedExams);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      title: 'Available Exams',
      value: stats.availableExams,
      icon: FaBook,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Completed Exams',
      value: stats.completedExams,
      icon: FaChartBar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Average Score',
      value: `${stats.averageScore}%`,
      icon: FaMedal,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Upcoming Exams',
      value: stats.upcomingExams,
      icon: FaClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const filteredExams = useMemo(() => {
    return exams
      .filter(exam => {
        const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterBy === 'all' ||
          (filterBy === 'available' && !exam.hasAttempted) ||
          (filterBy === 'completed' && exam.hasAttempted);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        // Sort by creation date if available, otherwise keep original order
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
  }, [exams, searchTerm, filterBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="student" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="ml-80 p-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {isAvailableExamsPage ? 'Available Exams' : 'Student Dashboard'}
        </h1>

        {/* Stats Grid */}
        {!isAvailableExamsPage && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
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
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Exams</option>
                <option value="available">Available</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex-1 max-w-md">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search exams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Exams List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isAvailableExamsPage ? 'All Available Exams' : 'Recent Exams'}
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredExams.length === 0 ? (
                <p className="text-gray-600">No exams available.</p>
              ) : (
                filteredExams.map((exam) => (
                  <motion.div
                    key={exam.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4 hover:border-primary-500 transition-colors duration-200"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{exam.title}</h3>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                          <span>Time Limit: {exam.timeLimit} minutes</span>
                          <span>•</span>
                          <span>Questions: {exam.questions?.length || 0}</span>
                          <span>•</span>
                          <span>Passing Score: {exam.passingScore}%</span>
                          {exam.hasAttempted && exam.submission && (
                            <>
                              <span>•</span>
                              <span>
                                Flagged: {exam.submission.flaggedQuestions?.length || 0}
                              </span>
                              <span>•</span>
                              <span>
                                Bookmarked: {exam.submission.bookmarkedQuestions?.length || 0}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {exam.hasAttempted ? (
                        <div className="text-right">
                          <div className={`text-lg font-bold mb-1 ${
                            exam.submission.score >= exam.passingScore ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {exam.submission.score}%
                          </div>
                          <button
                            onClick={() => navigate('/my-results')}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            View Results
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate(`/exam/${exam.id}`)}
                          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200"
                        >
                          Start Exam
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StudentDashboard; 