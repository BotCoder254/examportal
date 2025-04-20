import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { FaChevronDown, FaChevronUp, FaFlag, FaChartBar, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import Sidebar from '../../components/layout/Sidebar';

const FlaggedQuestions = () => {
  const [flaggedData, setFlaggedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('mostFlagged'); // 'mostFlagged', 'recent'
  const [stats, setStats] = useState({
    totalFlagged: 0,
    uniqueExams: 0,
    mostFlaggedQuestion: null,
    averageFlagsPerExam: 0
  });

  useEffect(() => {
    const fetchFlaggedQuestions = async () => {
      try {
        // Get all submissions where teacher is the current user
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('teacherId', '==', auth.currentUser.uid)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const submissions = submissionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Get all exams created by the current user
        const examsQuery = query(
          collection(db, 'exams'),
          where('createdBy', '==', auth.currentUser.uid)
        );
        const examsSnapshot = await getDocs(examsQuery);
        const exams = examsSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = { id: doc.id, ...doc.data() };
          return acc;
        }, {});

        // Process submissions to group flagged questions by exam
        const processedData = {};
        let totalFlagged = 0;
        let uniqueExams = 0;
        let maxFlags = 0;
        let mostFlaggedQuestion = null;

        submissions.forEach(submission => {
          if (!submission.flaggedQuestions?.length) return;

          const examId = submission.examId;
          const exam = exams[examId];
          if (!exam) return;

          if (!processedData[examId]) {
            processedData[examId] = {
              exam,
              submissions: [],
              flaggedQuestions: {},
              totalFlags: 0
            };
            uniqueExams++;
          }

          // Add submission to the exam's data
          processedData[examId].submissions.push(submission);

          // Process flagged questions
          submission.flaggedQuestions.forEach(questionIndex => {
            const question = exam.questions[questionIndex];
            if (!question) return;

            if (!processedData[examId].flaggedQuestions[questionIndex]) {
              processedData[examId].flaggedQuestions[questionIndex] = {
                question,
                flagCount: 0,
                submissions: []
              };
            }

            processedData[examId].flaggedQuestions[questionIndex].flagCount++;
            processedData[examId].flaggedQuestions[questionIndex].submissions.push({
              submissionId: submission.id,
              studentId: submission.studentId,
              submittedAt: submission.submittedAt
            });

            processedData[examId].totalFlags++;
            totalFlagged++;

            if (processedData[examId].flaggedQuestions[questionIndex].flagCount > maxFlags) {
              maxFlags = processedData[examId].flaggedQuestions[questionIndex].flagCount;
              mostFlaggedQuestion = {
                examTitle: exam.title,
                question: question.question,
                flagCount: processedData[examId].flaggedQuestions[questionIndex].flagCount
              };
            }
          });
        });

        setStats({
          totalFlagged,
          uniqueExams,
          mostFlaggedQuestion,
          averageFlagsPerExam: uniqueExams > 0 ? Math.round(totalFlagged / uniqueExams) : 0
        });

        // Convert processed data to array format
        const flaggedArray = Object.entries(processedData).map(([examId, data]) => ({
          id: examId,
          ...data
        }));

        setFlaggedData(flaggedArray);
      } catch (error) {
        console.error('Error fetching flagged questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlaggedQuestions();
  }, []);

  const toggleExpand = (examId) => {
    setExpandedExam(expandedExam === examId ? null : examId);
  };

  const filteredAndSortedData = flaggedData
    .filter(data => 
      data.exam.title?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'mostFlagged') {
        return b.totalFlags - a.totalFlags;
      }
      // Sort by most recent submission
      const aDate = Math.max(...a.submissions.map(s => new Date(s.submittedAt)));
      const bDate = Math.max(...b.submissions.map(s => new Date(s.submittedAt)));
      return bDate - aDate;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="teacher" />
      
      <div className="ml-80 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Flagged Questions Analysis</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Flags</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalFlagged}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <FaFlag className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Affected Exams</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueExams}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <FaChartBar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Flags per Exam</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageFlagsPerExam}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Most Flagged</p>
                <p className="text-2xl font-bold text-gray-900">{stats.mostFlaggedQuestion?.flagCount || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <FaClock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Most Flagged Question Card */}
        {stats.mostFlaggedQuestion && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Most Flagged Question</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">From exam: {stats.mostFlaggedQuestion.examTitle}</p>
              <p className="text-gray-900">{stats.mostFlaggedQuestion.question}</p>
              <p className="text-sm text-red-600 mt-2">
                Flagged {stats.mostFlaggedQuestion.flagCount} times
              </p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="mostFlagged">Sort by Most Flagged</option>
                <option value="recent">Sort by Recent</option>
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
        ) : filteredAndSortedData.length === 0 ? (
          <div className="text-center text-gray-600">
            <p>No flagged questions found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedData.map((data) => (
              <motion.div
                key={data.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(data.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {data.exam.title || 'Untitled Exam'}
                      </h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                        <span>Total Flags: {data.totalFlags}</span>
                        <span>•</span>
                        <span>Unique Questions: {Object.keys(data.flaggedQuestions).length}</span>
                        <span>•</span>
                        <span>Submissions: {data.submissions.length}</span>
                      </div>
                    </div>
                    {expandedExam === data.id ? (
                      <FaChevronUp className="text-gray-400" />
                    ) : (
                      <FaChevronDown className="text-gray-400" />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedExam === data.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-gray-200"
                    >
                      <div className="p-6 bg-gray-50">
                        <h4 className="font-medium text-gray-900 mb-4">Flagged Questions Analysis</h4>
                        <div className="space-y-6">
                          {Object.entries(data.flaggedQuestions)
                            .sort(([, a], [, b]) => b.flagCount - a.flagCount)
                            .map(([questionIndex, questionData]) => (
                              <div key={questionIndex} className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      Question {parseInt(questionIndex) + 1}: {questionData.question.question}
                                    </p>
                                    <p className="text-sm text-red-600 mt-1">
                                      Flagged {questionData.flagCount} times
                                    </p>
                                  </div>
                                </div>

                                {questionData.question.imageUrl && (
                                  <img
                                    src={questionData.question.imageUrl}
                                    alt="Question"
                                    className="mt-2 max-w-full h-auto rounded-lg"
                                  />
                                )}

                                <div className="ml-4 space-y-1">
                                  {questionData.question.options?.map((option, optionIndex) => (
                                    <div
                                      key={optionIndex}
                                      className={`p-2 rounded ${
                                        questionData.question.correctAnswer === optionIndex
                                          ? 'bg-green-100 text-green-800'
                                          : 'text-gray-600'
                                      }`}
                                    >
                                      {option}
                                      {questionData.question.correctAnswer === optionIndex && (
                                        <span className="ml-2">✓ Correct Answer</span>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {questionData.question.explanation && (
                                  <div className="mt-2 p-3 bg-blue-50 text-blue-800 rounded-md">
                                    <p className="text-sm font-medium">Explanation:</p>
                                    <p className="mt-1">{questionData.question.explanation}</p>
                                  </div>
                                )}

                                <div className="mt-4 bg-gray-100 p-4 rounded-lg">
                                  <h5 className="text-sm font-medium text-gray-900 mb-2">Student Responses</h5>
                                  <div className="space-y-2">
                                    {questionData.submissions.map((submission, index) => (
                                      <div key={index} className="text-sm text-gray-600">
                                        Student {submission.studentId.slice(-4)} selected option{' '}
                                        {submission.answer + 1} on{' '}
                                        {new Date(submission.submittedAt).toLocaleDateString()}
                                      </div>
                                    ))}
                                  </div>
                                </div>
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

export default FlaggedQuestions; 