import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { FaChevronDown, FaChevronUp, FaBookmark, FaFlag, FaClock } from 'react-icons/fa';
import Sidebar from '../../components/layout/Sidebar';

const BookmarkedExams = () => {
  const [bookmarkedExams, setBookmarkedExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalBookmarked: 0,
    completedBookmarked: 0,
    pendingBookmarked: 0,
    averageScore: 0
  });

  useEffect(() => {
    const fetchBookmarkedExams = async () => {
      try {
        // Fetch all submissions for the current student
        const submissionsSnapshot = await getDocs(collection(db, 'submissions'));
        const studentSubmissions = submissionsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(sub => sub.studentId === auth.currentUser.uid && sub.bookmarkedQuestions?.length > 0);

        // Fetch all exams
        const examsSnapshot = await getDocs(collection(db, 'exams'));
        const examsData = examsSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = { id: doc.id, ...doc.data() };
          return acc;
        }, {});

        // Combine submission data with exam data
        const bookmarkedData = studentSubmissions.map(submission => {
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
        const totalBookmarked = bookmarkedData.reduce((sum, data) => 
          sum + (data.bookmarkedQuestions?.length || 0), 0);
        const completedBookmarked = bookmarkedData.length;
        const scores = bookmarkedData.map(r => r.score || 0);
        const averageScore = scores.length > 0 
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
          : 0;

        setStats({
          totalBookmarked,
          completedBookmarked,
          pendingBookmarked: totalBookmarked - completedBookmarked,
          averageScore
        });
        
        setBookmarkedExams(bookmarkedData);
      } catch (error) {
        console.error('Error fetching bookmarked exams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarkedExams();
  }, []);

  const toggleExpand = (examId) => {
    setExpandedExam(expandedExam === examId ? null : examId);
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const filteredExams = bookmarkedExams.filter(exam =>
    exam.exam.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="student" />
      
      <div className="ml-80 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Bookmarked Questions</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookmarked</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBookmarked}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <FaBookmark className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Exams</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedBookmarked}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <FaClock className="h-6 w-6 text-green-600" />
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
                <FaFlag className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingBookmarked}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <FaClock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search bookmarked exams..."
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
        ) : filteredExams.length === 0 ? (
          <div className="text-center text-gray-600">
            <p>No bookmarked questions found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExams.map((exam) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(exam.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {exam.exam.title || 'Untitled Exam'}
                      </h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                        <span>Completed on {new Date(exam.submittedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Bookmarked Questions: {exam.bookmarkedQuestions?.length || 0}</span>
                        <span>•</span>
                        <span className={exam.score >= (exam.exam.passingScore || 60) ? 'text-green-600' : 'text-red-600'}>
                          Score: {exam.score}%
                        </span>
                      </div>
                    </div>
                    {expandedExam === exam.id ? (
                      <FaChevronUp className="text-gray-400" />
                    ) : (
                      <FaChevronDown className="text-gray-400" />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedExam === exam.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-gray-200"
                    >
                      <div className="p-6 bg-gray-50">
                        <h4 className="font-medium text-gray-900 mb-4">Bookmarked Questions</h4>
                        <div className="space-y-6">
                          {exam.bookmarkedQuestions?.map((questionIndex) => {
                            const question = exam.exam.questions?.[questionIndex];
                            if (!question) return null;
                            
                            return (
                              <div key={questionIndex} className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <p className="font-medium text-gray-900">
                                    {questionIndex + 1}. {question.question}
                                  </p>
                                  <span className="text-sm font-medium">
                                    {exam.answers?.[questionIndex] === question.correctAnswer ? (
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
                                          : exam.answers?.[questionIndex] === optionIndex
                                          ? 'bg-red-100 text-red-800'
                                          : 'text-gray-600'
                                      }`}
                                    >
                                      {option}
                                      {question.correctAnswer === optionIndex && (
                                        <span className="ml-2">✓ Correct Answer</span>
                                      )}
                                      {exam.answers?.[questionIndex] === optionIndex &&
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
                            );
                          })}
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

export default BookmarkedExams; 