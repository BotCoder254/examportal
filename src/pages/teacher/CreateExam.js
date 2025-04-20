import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTrash, FaClock, FaImage, FaInfoCircle, FaTimes, FaQuestionCircle } from 'react-icons/fa';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, increment, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import Sidebar from '../../components/layout/Sidebar';
import { Toaster, toast } from 'react-hot-toast';

const CreateExam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    timeLimit: '',
    passingScore: '',
    category: '',
    difficulty: 'Medium',
    instructions: '',
    isPublished: false,
    shuffleQuestions: false,
    allowReattempts: false,
    questions: []
  });
  const [showQuestionPoolModal, setShowQuestionPoolModal] = useState(false);
  const [poolQuestions, setPoolQuestions] = useState([]);
  const [selectedPoolQuestions, setSelectedPoolQuestions] = useState([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = [
    'general',
    'mathematics',
    'science',
    'history',
    'literature',
    'programming',
  ];

  const difficulties = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ];

  // Verify user authentication
  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExamData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...examData.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setExamData(prev => ({
      ...prev,
      questions: updatedQuestions
    }));
  };

  const addQuestion = () => {
    setExamData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question: '',
          options: ['', ''],
          correctAnswer: 0,
          points: '1',
          explanation: ''
        }
      ]
    }));
  };

  const removeQuestion = (index) => {
    setExamData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...examData.questions];
    updatedQuestions[questionIndex].options.push('');
    setExamData(prev => ({
      ...prev,
      questions: updatedQuestions
    }));
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...examData.questions];
    updatedQuestions[questionIndex].options = updatedQuestions[questionIndex].options
      .filter((_, i) => i !== optionIndex);
    setExamData(prev => ({
      ...prev,
      questions: updatedQuestions
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      toast.error('You must be logged in to create an exam');
      navigate('/login');
      return;
    }

    if (!examData.title || !examData.timeLimit || !examData.passingScore) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!examData.questions || examData.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    // Validate questions
    for (let i = 0; i < examData.questions.length; i++) {
      const question = examData.questions[i];
      if (!question.question.trim()) {
        toast.error(`Question ${i + 1} text is required`);
        return;
      }
      if (question.options.some(opt => !opt.trim())) {
        toast.error(`All options in Question ${i + 1} must be filled`);
        return;
      }
    }

    try {
      setLoading(true);

      // Process the exam data
      const processedQuestions = examData.questions.map(q => ({
        question: q.question.trim(),
        options: q.options.map(opt => opt.trim()),
        correctAnswer: Number(q.correctAnswer),
        points: Number(q.points),
        imageUrl: q.imageUrl?.trim() || '',
        explanation: q.explanation?.trim() || ''
      }));

      // Calculate total points
      const totalPoints = processedQuestions.reduce((sum, q) => sum + q.points, 0);

      // Create exam data object
      const examToSubmit = {
        title: examData.title.trim(),
        description: examData.description.trim(),
        timeLimit: Number(examData.timeLimit),
        passingScore: Number(examData.passingScore),
        instructions: examData.instructions.trim(),
        category: examData.category,
        difficulty: examData.difficulty,
        isPublished: Boolean(examData.isPublished),
        shuffleQuestions: Boolean(examData.shuffleQuestions),
        allowReattempts: Boolean(examData.allowReattempts),
        questions: processedQuestions,
        totalPoints,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        status: 'active'
      };

      // Add exam to Firestore
      const examRef = await addDoc(collection(db, 'exams'), examToSubmit);
      
      if (!examRef.id) {
        throw new Error('Failed to create exam document');
      }

      // Show success message and redirect
      toast.success('Exam created successfully!');
      navigate('/dashboard');

    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error(error.message || 'Failed to create exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionPool = async () => {
    setLoadingPool(true);
    try {
      const poolQuery = query(
        collection(db, 'questionPool'),
        where('teacherId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(poolQuery);
      const questions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPoolQuestions(questions);
    } catch (error) {
      console.error('Error fetching question pool:', error);
      toast.error('Failed to load question pool');
    } finally {
      setLoadingPool(false);
    }
  };

  const handleImportQuestions = () => {
    const importedQuestions = selectedPoolQuestions.map(q => ({
      question: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: 1,
      category: q.category,
      difficulty: q.difficulty
    }));

    setExamData(prev => ({
      ...prev,
      questions: [...prev.questions, ...importedQuestions]
    }));

    // Update usage count for imported questions
    selectedPoolQuestions.forEach(async (q) => {
      try {
        const questionRef = doc(db, 'questionPool', q.id);
        await updateDoc(questionRef, {
          timesUsed: (q.timesUsed || 0) + 1
        });
      } catch (error) {
        console.error('Error updating question usage:', error);
      }
    });

    setSelectedPoolQuestions([]);
    setShowQuestionPoolModal(false);
    toast.success('Questions imported successfully');
  };

  const toggleQuestionSelection = (question) => {
    setSelectedPoolQuestions(prev => {
      const isSelected = prev.some(q => q.id === question.id);
      if (isSelected) {
        return prev.filter(q => q.id !== question.id);
      } else {
        return [...prev, question];
      }
    });
  };

  const filteredPoolQuestions = poolQuestions.filter(question => {
    const matchesSearch = question.questionText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || question.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const renderQuestionPoolButton = () => (
    <button
      onClick={() => {
        setShowQuestionPoolModal(true);
        fetchQuestionPool();
      }}
      className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition"
    >
      <FaQuestionCircle className="mr-2" />
      Import from Pool
    </button>
  );

  const renderQuestionPoolModal = () => (
    <AnimatePresence>
      {showQuestionPoolModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowQuestionPoolModal(false);
              setSelectedPoolQuestions([]);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Import Questions from Pool</h2>
              <button
                onClick={() => {
                  setShowQuestionPoolModal(false);
                  setSelectedPoolQuestions([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Categories</option>
                {[...new Set(poolQuestions.map(q => q.category))].map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {loadingPool ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredPoolQuestions.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No questions found in your pool.</p>
            ) : (
              <div className="space-y-4 mb-6">
                {filteredPoolQuestions.map((question) => (
                  <div
                    key={question.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPoolQuestions.some(q => q.id === question.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                    onClick={() => toggleQuestionSelection(question)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{question.questionText}</p>
                        <div className="mt-2 space-y-1">
                          {question.options.map((option, index) => (
                            <p
                              key={index}
                              className={`text-sm ${
                                index === question.correctAnswer ? 'text-green-600 font-medium' : 'text-gray-600'
                              }`}
                            >
                              {index + 1}. {option}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                          question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {question.difficulty}
                        </span>
                        <span className="text-xs text-gray-500">
                          Used {question.timesUsed || 0} times
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-gray-600">
                {selectedPoolQuestions.length} questions selected
              </span>
              <div className="space-x-4">
                <button
                  onClick={() => {
                    setShowQuestionPoolModal(false);
                    setSelectedPoolQuestions([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportQuestions}
                  disabled={selectedPoolQuestions.length === 0}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import Selected
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="teacher" />
      <Toaster position="top-right" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="ml-80 p-8"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create Exam</h1>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Exam'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Exam Details */}
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={examData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={examData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Mathematics, Science, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Limit (minutes)
                  </label>
                  <div className="relative">
                    <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      name="timeLimit"
                      value={examData.timeLimit}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    name="passingScore"
                    value={examData.passingScore}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                    max="100"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={examData.description}
                    onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="3"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    name="difficulty"
                    value={examData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions
                  </label>
                  <textarea
                    name="instructions"
                    value={examData.instructions}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="4"
                    placeholder="Enter exam instructions..."
                  />
                </div>

                <div className="flex flex-wrap gap-6 mb-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPublished"
                      name="isPublished"
                      checked={examData.isPublished}
                      onChange={(e) => handleInputChange({
                        target: { name: 'isPublished', value: e.target.checked }
                      })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublished" className="text-sm text-gray-700">
                      Publish exam immediately
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="shuffleQuestions"
                      name="shuffleQuestions"
                      checked={examData.shuffleQuestions}
                      onChange={(e) => handleInputChange({
                        target: { name: 'shuffleQuestions', value: e.target.checked }
                      })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="shuffleQuestions" className="text-sm text-gray-700">
                      Shuffle questions for each student
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowReattempts"
                      name="allowReattempts"
                      checked={examData.allowReattempts}
                      onChange={(e) => handleInputChange({
                        target: { name: 'allowReattempts', value: e.target.checked }
                      })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allowReattempts" className="text-sm text-gray-700">
                      Allow students to reattempt exam
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              {examData.questions.map((question, questionIndex) => (
                <motion.div
                  key={questionIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-md p-6"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Question {questionIndex + 1}
                    </h3>
                    {examData.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(questionIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Text
                      </label>
                      <input
                        type="text"
                        value={question.question}
                        onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image URL (optional)
                      </label>
                      <div className="relative">
                        <FaImage className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="url"
                          value={question.imageUrl}
                          onChange={(e) => handleQuestionChange(questionIndex, 'imageUrl', e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Points
                      </label>
                      <input
                        type="number"
                        value={question.points}
                        onChange={(e) => handleQuestionChange(questionIndex, 'points', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        min="1"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-gray-700">
                          Options
                        </label>
                        {question.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => addOption(questionIndex)}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            <FaPlus className="inline-block mr-1" />
                            Add Option
                          </button>
                        )}
                      </div>
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`correct-${questionIndex}`}
                            checked={question.correctAnswer === optionIndex}
                            onChange={() => handleQuestionChange(questionIndex, 'correctAnswer', optionIndex)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...question.options];
                              newOptions[optionIndex] = e.target.value;
                              handleQuestionChange(questionIndex, 'options', newOptions);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder={`Option ${optionIndex + 1}`}
                            required
                          />
                          {question.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(questionIndex, optionIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Explanation (shown after submission)
                      </label>
                      <textarea
                        value={question.explanation}
                        onChange={(e) => handleQuestionChange(questionIndex, 'explanation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        rows="2"
                        placeholder="Explain why the correct answer is right..."
                      />
                    </div>
                  </div>
                </motion.div>
              ))}

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Questions</h2>
                <div className="flex space-x-4">
                  {renderQuestionPoolButton()}
                  <button
                    onClick={addQuestion}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition"
                  >
                    <FaPlus className="mr-2" />
                    Add Question
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/view-submissions')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {renderQuestionPoolModal()}
    </div>
  );
};

export default CreateExam; 