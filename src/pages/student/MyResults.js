import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { FaChevronDown, FaChevronUp, FaClock, FaMedal, FaCheck, FaTimes, FaFilter, FaSort } from 'react-icons/fa';
import Sidebar from '../../components/layout/Sidebar';

const MyResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedResult, setExpandedResult] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'score', 'title'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'passed', 'failed'
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalExams: 0,
    averageScore: 0,
    highestScore: 0,
    passRate: 0
  });

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Fetch all submissions for the current student
        const submissionsSnapshot = await getDocs(collection(db, 'submissions'));
        const studentSubmissions = submissionsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(sub => sub.studentId === auth.currentUser.uid);

        // Fetch all exams
        const examsSnapshot = await getDocs(collection(db, 'exams'));
        const examsData = examsSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = { id: doc.id, ...doc.data() };
          return acc;
        }, {});

        // Combine submission data with exam data
        const resultsData = studentSubmissions.map(submission => {
          const exam = examsData[submission.examId] || {};
          return {
            id: submission.id,
            ...submission,
            exam: {
              ...exam,
              id: submission.examId
            }
          };
        });

        // Calculate statistics
        const totalExams = resultsData.length;
        const scores = resultsData.map(r => r.score || 0);
        const averageScore = scores.length > 0 
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
          : 0;
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const passedExams = resultsData.filter(r => {
          const passingScore = r.exam.passingScore || 60; // Default to 60 if not set
          return r.score >= passingScore;
        }).length;
        const passRate = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0;

        setStats({
          totalExams,
          averageScore,
          highestScore,
          passRate
        });
        
        setResults(resultsData);
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const toggleExpand = (resultId) => {
    setExpandedResult(expandedResult === resultId ? null : resultId);
  };

  const filteredAndSortedResults = results
    .filter(result => {
      const matchesSearch = result.exam.title?.toLowerCase().includes(searchTerm.toLowerCase());
      if (filterBy === 'passed') {
        return matchesSearch && result.score >= (result.exam.passingScore || 60);
      }
      if (filterBy === 'failed') {
        return matchesSearch && result.score < (result.exam.passingScore || 60);
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'title':
          return (a.exam.title || '').localeCompare(b.exam.title || '');
        default: // 'date'
          const dateA = a.submittedAt ? new Date(a.submittedAt) : new Date(0);
          const dateB = b.submittedAt ? new Date(b.submittedAt) : new Date(0);
          return dateB - dateA;
      }
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="student" />
      
      <div className="ml-80 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Results</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Exams</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalExams}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <FaMedal className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <FaCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Highest Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.highestScore}%</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <FaTimes className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.passRate}%</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <FaClock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Results</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="date">Sort by Date</option>
                <option value="score">Sort by Score</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredAndSortedResults.length === 0 ? (
          <div className="text-center text-gray-600">
            <p>No exam results found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedResults.map((result) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(result.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {result.exam.title || 'Untitled Exam'}
                      </h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                        <span>Completed on {new Date(result.submittedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Time spent: {formatDuration(result.timeSpent || 0)}</span>
                        <span>•</span>
                        <span className={result.score >= (result.exam.passingScore || 60) ? 'text-green-600' : 'text-red-600'}>
                          {result.score >= (result.exam.passingScore || 60) ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`text-lg font-bold ${
                        result.score >= 70 ? 'text-green-600' :
                        result.score >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {result.score}%
                      </span>
                      {expandedResult === result.id ? (
                        <FaChevronUp className="text-gray-400" />
                      ) : (
                        <FaChevronDown className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedResult === result.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-gray-200"
                    >
                      <div className="p-6 bg-gray-50">
                        {/* Exam Statistics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <p className="text-sm text-gray-600">Time Taken</p>
                            <p className="text-lg font-medium">{formatDuration(result.timeSpent || 0)}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <p className="text-sm text-gray-600">Questions Flagged</p>
                            <p className="text-lg font-medium">{result.flaggedQuestions?.length || 0}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <p className="text-sm text-gray-600">Questions Bookmarked</p>
                            <p className="text-lg font-medium">{result.bookmarkedQuestions?.length || 0}</p>
                          </div>
                        </div>

                        <h4 className="font-medium text-gray-900 mb-4">Question Details</h4>
                        <div className="space-y-6">
                          {result.exam.questions?.map((question, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-start justify-between">
                                <p className="font-medium text-gray-900">
                                  {index + 1}. {question.question}
                                </p>
                                <span className="text-sm font-medium">
                                  {result.answers?.[index] === question.correctAnswer ? (
                                    <span className="text-green-600">+{question.points} points</span>
                                  ) : (
                                    <span className="text-red-600">0 points</span>
                                  )}
                                </span>
                              </div>
                              
                              {question.imageUrl && (
                                <img
                                  src={question.imageUrl}
                                  alt="Question"
                                  className="mt-2 max-w-full h-auto rounded-lg"
                                />
                              )}

                              <div className="ml-4 space-y-1">
                                {question.options?.map((option, optionIndex) => (
                                  <div
                                    key={optionIndex}
                                    className={`p-2 rounded ${
                                      question.correctAnswer === optionIndex
                                        ? 'bg-green-100 text-green-800'
                                        : result.answers?.[index] === optionIndex
                                        ? 'bg-red-100 text-red-800'
                                        : 'text-gray-600'
                                    }`}
                                  >
                                    {option}
                                    {question.correctAnswer === optionIndex && (
                                      <span className="ml-2">✓ Correct Answer</span>
                                    )}
                                    {result.answers?.[index] === optionIndex &&
                                      question.correctAnswer !== optionIndex && (
                                      <span className="ml-2">✗ Your Answer</span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {question.explanation && (
                                <div className="mt-2 p-3 bg-blue-50 text-blue-800 rounded-md">
                                  <p className="text-sm font-medium">Explanation:</p>
                                  <p className="mt-1">{question.explanation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyResults; 