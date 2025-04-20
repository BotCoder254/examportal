import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaArrowRight, FaClock, FaFlag, FaBookmark } from 'react-icons/fa';
import { doc, getDoc, setDoc, query, getDocs, where, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import Sidebar from '../../components/layout/Sidebar';
import { shuffleArray } from '../../utils/shuffle';
import { toast } from 'react-hot-toast';

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [questionOrder, setQuestionOrder] = useState([]);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [isTimerWarning, setIsTimerWarning] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        const examDoc = await getDoc(doc(db, 'exams', examId));
        
        if (!examDoc.exists()) {
          setError('Exam not found');
          return;
        }

        const examData = examDoc.data();
        
        // Check if exam is published
        if (!examData.isPublished) {
          setError('This exam is not available');
          return;
        }

        // Fetch previous attempts
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('examId', '==', examId),
          where('studentId', '==', auth.currentUser.uid)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const attempts = submissionsSnapshot.size;

        // Check if reattempts are allowed
        if (attempts > 0 && !examData.allowReattempts) {
          setError('You have already attempted this exam');
          return;
        }

        setAttemptNumber(attempts + 1);
        
        // Initialize question order and shuffled questions
        let order;
        let questions = [...examData.questions];
        if (examData.shuffleQuestions) {
          order = shuffleArray([...Array(questions.length).keys()]);
          // Create shuffled questions array based on order
          const shuffled = order.map(index => questions[index]);
          setShuffledQuestions(shuffled);
        } else {
          order = [...Array(questions.length).keys()];
          setShuffledQuestions(questions);
        }
        setQuestionOrder(order);
        
        // Initialize answers array
        setAnswers(new Array(questions.length).fill(-1));
        setTimeLeft(examData.timeLimit * 60);
        setExam(examData);
      } catch (error) {
        console.error('Error fetching exam:', error);
        setError('Failed to load exam');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  useEffect(() => {
    if (!timeLeft || !exam) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, exam]);

  const handleTimeUp = async () => {
    setShowTimeUpModal(true);
    await handleSubmit();
  };

  const handleAnswer = (questionIndex, answerIndex) => {
    const newAnswers = [...answers];
    newAnswers[questionOrder[questionIndex]] = answerIndex;
    setAnswers(newAnswers);
  };

  const toggleBookmark = (questionIndex) => {
    const actualIndex = questionOrder[questionIndex];
    setBookmarkedQuestions(prev => {
      if (prev.includes(actualIndex)) {
        return prev.filter(i => i !== actualIndex);
      }
      return [...prev, actualIndex];
    });
  };

  const toggleFlag = (questionIndex) => {
    const actualIndex = questionOrder[questionIndex];
    setFlaggedQuestions(prev => {
      if (prev.includes(actualIndex)) {
        return prev.filter(i => i !== actualIndex);
      }
      return [...prev, actualIndex];
    });
  };

  const handleSubmit = async () => {
    try {
      if (!exam) return;

      // Calculate score
      let score = 0;
      let totalPoints = 0;
      answers.forEach((answer, index) => {
        const question = exam.questions[index];
        if (answer === question.correctAnswer) {
          score += question.points;
        }
        totalPoints += question.points;
      });

      const finalScore = Math.round((score / totalPoints) * 100);

      // Create submission document
      const submissionData = {
        examId,
        studentId: auth.currentUser.uid,
        teacherId: exam.createdBy,
        answers,
        score: finalScore,
        timeSpent: exam.timeLimit * 60 - timeLeft,
        submittedAt: new Date().toISOString(),
        bookmarkedQuestions,
        flaggedQuestions,
        attemptNumber
      };

      await addDoc(collection(db, 'submissions'), submissionData);

      // Show success message and redirect
      toast.success('Exam submitted successfully!');
      navigate('/my-results');
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error('Failed to submit exam');
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!exam || !shuffledQuestions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const currentQuestionData = shuffledQuestions[currentQuestion];
  const isBookmarked = bookmarkedQuestions.includes(questionOrder[currentQuestion]);
  const isFlagged = flaggedQuestions.includes(questionOrder[currentQuestion]);
  const currentAnswer = answers[questionOrder[currentQuestion]];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="student" />
      
      <div className="ml-80 p-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
              <p className="text-gray-600 mt-1">{exam.description}</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Question</p>
                <p className="text-lg font-medium text-gray-900">
                  {currentQuestion + 1} / {shuffledQuestions.length}
                </p>
              </div>
              <motion.div
                animate={{
                  scale: isTimerWarning ? [1, 1.1, 1] : 1,
                  color: isTimerWarning ? '#DC2626' : '#2563EB'
                }}
                transition={{
                  duration: 2,
                  repeat: isTimerWarning ? Infinity : 0,
                  repeatType: "reverse"
                }}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  isTimerWarning ? 'bg-red-50' : 'bg-primary-50'
                }`}
              >
                <FaClock className="mr-2" />
                <span className="font-medium">{formatTime(timeLeft)}</span>
              </motion.div>
            </div>
          </div>

          {/* Question Navigation */}
          <div className="mt-6 flex flex-wrap gap-2">
            {shuffledQuestions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium relative ${
                  currentQuestion === index
                    ? 'bg-primary-600 text-white'
                    : answers[questionOrder[index]] !== undefined
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
                {bookmarkedQuestions.includes(questionOrder[index]) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full" />
                )}
                {flaggedQuestions.includes(questionOrder[index]) && (
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-400 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-medium text-gray-900">
                  {currentQuestionData.question}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleBookmark(currentQuestion)}
                    className={`p-2 rounded-lg ${
                      isBookmarked
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <FaBookmark />
                  </button>
                  <button
                    onClick={() => toggleFlag(currentQuestion)}
                    className={`p-2 rounded-lg ${
                      isFlagged
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <FaFlag />
                  </button>
                </div>
              </div>

              {currentQuestionData.imageUrl && (
                <img
                  src={currentQuestionData.imageUrl}
                  alt="Question"
                  className="max-w-full h-auto rounded-lg"
                />
              )}

              <div className="space-y-4">
                {currentQuestionData.options.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${
                      currentAnswer === index
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion}`}
                      checked={currentAnswer === index}
                      onChange={() => handleAnswer(currentQuestion, index)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-3 text-gray-900">{option}</span>
                  </label>
                ))}
              </div>

              <p className="text-sm text-gray-600">
                Points: {currentQuestionData.points}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentQuestion((prev) => prev - 1)}
            disabled={currentQuestion === 0}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaArrowLeft className="mr-2" />
            Previous
          </button>

          {currentQuestion === shuffledQuestions.length - 1 ? (
            <button
              onClick={() => setShowConfirmSubmit(true)}
              disabled={answers.length !== exam.questions.length}
              className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {answers.length !== exam.questions.length ? 'Submitting...' : 'Submit Exam'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion((prev) => prev + 1)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Next
              <FaArrowRight className="ml-2" />
            </button>
          )}
        </div>

        {/* Confirm Submit Modal */}
        <AnimatePresence>
          {showConfirmSubmit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Submit Exam?
                </h3>
                <p className="text-gray-600 mb-6">
                  {answers.length} of {exam.questions.length} questions answered.
                  {flaggedQuestions.length > 0 &&
                    ` You have ${flaggedQuestions.length} flagged questions.`}
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowConfirmSubmit(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={answers.length !== exam.questions.length}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {answers.length !== exam.questions.length ? 'Submitting...' : 'Confirm Submit'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Time Up Modal */}
        <AnimatePresence>
          {showTimeUpModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Time's Up!
                </h3>
                <p className="text-gray-600 mb-6">
                  Your exam has been automatically submitted.
                  {answers.length} of {exam.questions.length} questions were answered.
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowTimeUpModal(false);
                      navigate('/my-results');
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    View Results
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TakeExam; 