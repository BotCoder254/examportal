import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { FaChevronDown, FaChevronUp, FaUser, FaDownload, FaFilter, FaSearch, FaCheck, FaTimes, FaClock } from 'react-icons/fa';
import Sidebar from '../../components/layout/Sidebar';

const ViewSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState(null);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'passed', 'failed', 'reviewed'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'score', 'name'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    averageScore: 0,
    passRate: 0,
    pendingReview: 0
  });

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      
      // First, fetch all exams created by the current teacher
      const examsQuery = query(
        collection(db, 'exams'),
        where('createdBy', '==', auth.currentUser.uid)
      );
      const examsSnapshot = await getDocs(examsQuery);
      const examsData = {};
      examsSnapshot.docs.forEach(doc => {
        examsData[doc.id] = { id: doc.id, ...doc.data() };
      });

      // Then fetch all submissions
      const submissionsSnapshot = await getDocs(collection(db, 'submissions'));
      const submissionsData = [];

      // Process each submission and fetch student data
      for (const docSnapshot of submissionsSnapshot.docs) {
        const submission = { id: docSnapshot.id, ...docSnapshot.data() };
        
        // Only include submissions for this teacher's exams
        if (!examsData[submission.examId]) continue;

        // Fetch student data
        if (submission.studentId) {
          const studentDocRef = doc(db, 'users', submission.studentId);
          const studentDocSnapshot = await getDoc(studentDocRef);
          if (studentDocSnapshot.exists()) {
            submission.student = studentDocSnapshot.data();
          }
        }

        submissionsData.push(submission);
      }

      // Group submissions by exam
      const groupedSubmissions = [];
      Object.values(examsData).forEach(exam => {
        const examSubmissions = submissionsData.filter(sub => sub.examId === exam.id);
        if (examSubmissions.length > 0) {
          groupedSubmissions.push({
            exam,
            submissions: examSubmissions
          });
        }
      });

      // Calculate statistics
      const totalSubmissions = submissionsData.length;
      const scores = submissionsData.map(s => s.score || 0);
      const averageScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      const passedSubmissions = submissionsData.filter(s => {
        const exam = examsData[s.examId];
        return s.score >= (exam?.passingScore || 60);
      }).length;
      const passRate = totalSubmissions > 0
        ? Math.round((passedSubmissions / totalSubmissions) * 100)
        : 0;
      const pendingReview = submissionsData.filter(s => !s.reviewed).length;

      setStats({
        totalSubmissions,
        averageScore,
        passRate,
        pendingReview
      });

      setSubmissions(groupedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExam = (examId) => {
    setExpandedExam(expandedExam === examId ? null : examId);
    setExpandedSubmission(null);
  };

  const toggleSubmission = (submissionId) => {
    setExpandedSubmission(expandedSubmission === submissionId ? null : submissionId);
  };

  const handleReviewSubmit = async (submissionId, examId, feedback, reviewed) => {
    try {
      const submissionRef = doc(db, 'submissions', submissionId);
      await updateDoc(submissionRef, {
        feedback,
        reviewed,
        reviewedAt: new Date().toISOString()
      });

      // Update local state
      setSubmissions(prevSubmissions => 
        prevSubmissions.map(examGroup => {
          if (examGroup.exam.id === examId) {
            return {
              ...examGroup,
              submissions: examGroup.submissions.map(sub => 
                sub.id === submissionId
                  ? { ...sub, feedback, reviewed, reviewedAt: new Date().toISOString() }
                  : sub
              )
            };
          }
          return examGroup;
        })
      );

      // Refresh stats
      const updatedStats = { ...stats };
      updatedStats.pendingReview = reviewed 
        ? updatedStats.pendingReview - 1 
        : updatedStats.pendingReview + 1;
      setStats(updatedStats);
    } catch (error) {
      console.error('Error updating submission:', error);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const downloadCSV = (examId) => {
    const examGroup = submissions.find(group => group.exam.id === examId);
    if (!examGroup) return;

    const headers = [
      'Student Name',
      'Student Email',
      'Score',
      'Time Spent',
      'Submission Date',
      'Reviewed',
      'Feedback'
    ];

    const rows = examGroup.submissions.map(sub => [
      sub.student?.name || 'Unknown',
      sub.student?.email || 'Unknown',
      `${sub.score}%`,
      formatDuration(sub.timeSpent || 0),
      new Date(sub.submittedAt).toLocaleDateString(),
      sub.reviewed ? 'Yes' : 'No',
      sub.feedback || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${examGroup.exam.title}_submissions.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredSubmissions = submissions.filter(examGroup => {
    if (selectedExam !== 'all' && examGroup.exam.id !== selectedExam) return false;

    const filteredSubs = examGroup.submissions.filter(sub => {
      const matchesSearch = (sub.student?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (sub.student?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' ||
                          (filterStatus === 'passed' && sub.score >= examGroup.exam.passingScore) ||
                          (filterStatus === 'failed' && sub.score < examGroup.exam.passingScore) ||
                          (filterStatus === 'reviewed' && sub.reviewed);
      return matchesSearch && matchesFilter;
    });

    return filteredSubs.length > 0;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="teacher" />
      
      <div className="ml-80 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">View Submissions</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <FaUser className="h-6 w-6 text-blue-600" />
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
                <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.passRate}%</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <FaClock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingReview}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <FaTimes className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Exams</option>
                {submissions.map(({ exam }) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="reviewed">Reviewed</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="date">Sort by Date</option>
                <option value="score">Sort by Score</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
            <div className="flex-1 max-w-md">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center text-gray-600">
            <p>No submissions found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSubmissions.map(({ exam, submissions }) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExam(exam.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {exam.title}
                      </h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                        <span>{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>Average: {Math.round(submissions.reduce((acc, sub) => acc + (sub.score || 0), 0) / submissions.length)}%</span>
                        <span>•</span>
                        <span>Pass Rate: {Math.round((submissions.filter(sub => (sub.score || 0) >= (exam.passingScore || 60)).length / submissions.length) * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadCSV(exam.id);
                        }}
                        className="p-2 text-gray-600 hover:text-primary-600"
                        title="Download CSV"
                      >
                        <FaDownload />
                      </button>
                      {expandedExam === exam.id ? (
                        <FaChevronUp className="text-gray-400" />
                      ) : (
                        <FaChevronDown className="text-gray-400" />
                      )}
                    </div>
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
                      <div className="divide-y divide-gray-200">
                        {submissions
                          .filter(sub => {
                            const matchesSearch = (sub.student?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                (sub.student?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesFilter = filterStatus === 'all' ||
                                                (filterStatus === 'passed' && sub.score >= exam.passingScore) ||
                                                (filterStatus === 'failed' && sub.score < exam.passingScore) ||
                                                (filterStatus === 'reviewed' && sub.reviewed);
                            return matchesSearch && matchesFilter;
                          })
                          .sort((a, b) => {
                            switch (sortBy) {
                              case 'score':
                                return (b.score || 0) - (a.score || 0);
                              case 'name':
                                return (a.student?.name || '').localeCompare(b.student?.name || '');
                              default: // 'date'
                                return new Date(b.submittedAt) - new Date(a.submittedAt);
                            }
                          })
                          .map(submission => (
                            <div key={submission.id}>
                              <div
                                className="p-6 hover:bg-gray-50 cursor-pointer"
                                onClick={() => toggleSubmission(submission.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-4">
                                    <div className="p-2 bg-gray-100 rounded-full">
                                      <FaUser className="text-gray-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-gray-900">
                                        {submission.student?.name || 'Unknown Student'}
                                      </h4>
                                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                                        <span>{submission.student?.email}</span>
                                        <span>•</span>
                                        <span>Submitted: {new Date(submission.submittedAt).toLocaleString()}</span>
                                        <span>•</span>
                                        <span>Time spent: {formatDuration(submission.timeSpent || 0)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      submission.reviewed
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {submission.reviewed ? 'Reviewed' : 'Pending Review'}
                                    </div>
                                    <span className={`text-lg font-bold ${
                                      (submission.score || 0) >= exam.passingScore ? 'text-green-600' :
                                      'text-red-600'
                                    }`}>
                                      {submission.score || 0}%
                                    </span>
                                    {expandedSubmission === submission.id ? (
                                      <FaChevronUp className="text-gray-400" />
                                    ) : (
                                      <FaChevronDown className="text-gray-400" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              <AnimatePresence>
                                {expandedSubmission === submission.id && (
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-6 bg-gray-50">
                                      {/* Submission Statistics */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                          <p className="text-sm text-gray-600">Time Taken</p>
                                          <p className="text-lg font-medium">{formatDuration(submission.timeSpent || 0)}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                          <p className="text-sm text-gray-600">Questions Flagged</p>
                                          <p className="text-lg font-medium">{submission.flaggedQuestions?.length || 0}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                          <p className="text-sm text-gray-600">Questions Bookmarked</p>
                                          <p className="text-lg font-medium">{submission.bookmarkedQuestions?.length || 0}</p>
                                        </div>
                                      </div>

                                      {/* Review Form */}
                                      <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Feedback
                                        </label>
                                        <textarea
                                          value={submission.feedback || ''}
                                          onChange={(e) => {
                                            setSubmissions(prevSubmissions =>
                                              prevSubmissions.map(examGroup => ({
                                                ...examGroup,
                                                submissions: examGroup.submissions.map(sub =>
                                                  sub.id === submission.id
                                                    ? { ...sub, feedback: e.target.value }
                                                    : sub
                                                )
                                              }))
                                            );
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                          rows="3"
                                          placeholder="Enter feedback for the student..."
                                        />
                                        <div className="mt-2 flex justify-end">
                                          <button
                                            onClick={() => handleReviewSubmit(
                                              submission.id,
                                              exam.id,
                                              submission.feedback || '',
                                              true
                                            )}
                                            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                                          >
                                            {submission.reviewed ? 'Update Review' : 'Submit Review'}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Question Details */}
                                      <h4 className="font-medium text-gray-900 mb-4">Question Details</h4>
                                      <div className="space-y-6">
                                        {exam.questions?.map((question, index) => (
                                          <div key={index} className="space-y-2">
                                            <div className="flex items-start justify-between">
                                              <p className="font-medium text-gray-900">
                                                {index + 1}. {question.question}
                                              </p>
                                              <span className="text-sm font-medium">
                                                {submission.answers?.[index] === question.correctAnswer ? (
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
                                                      : submission.answers?.[index] === optionIndex
                                                      ? 'bg-red-100 text-red-800'
                                                      : 'text-gray-600'
                                                  }`}
                                                >
                                                  {option}
                                                  {question.correctAnswer === optionIndex && (
                                                    <span className="ml-2">✓ Correct Answer</span>
                                                  )}
                                                  {submission.answers?.[index] === optionIndex &&
                                                    question.correctAnswer !== optionIndex && (
                                                    <span className="ml-2">✗ Student's Answer</span>
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
                            </div>
                          ))}
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

export default ViewSubmissions; 