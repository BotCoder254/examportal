import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { FaPlus, FaUpload, FaSearch, FaFilter, FaTrash, FaEdit } from 'react-icons/fa';
import Sidebar from '../../components/layout/Sidebar';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import QuestionForm from '../../components/question/QuestionForm';

const QuestionPool = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    categoriesCount: 0,
    difficultyLevels: 0,
    reusedCount: 0
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const questionsQuery = query(
        collection(db, 'questionPool'),
        where('teacherId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(questionsQuery);
      const questionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Extract unique categories
      const uniqueCategories = [...new Set(questionData.map(q => q.category).filter(Boolean))];
      setCategories(uniqueCategories);

      // Calculate stats
      setStats({
        totalQuestions: questionData.length,
        categoriesCount: uniqueCategories.length,
        difficultyLevels: [...new Set(questionData.map(q => q.difficulty))].length,
        reusedCount: questionData.reduce((acc, q) => acc + (q.timesUsed || 0), 0)
      });

      setQuestions(questionData);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: async (results) => {
        try {
          const { data } = results;
          const validQuestions = data
            .filter(row => row.length >= 4 && row[0]) // Ensure question text exists
            .map(row => ({
              teacherId: auth.currentUser.uid,
              questionText: row[0],
              options: row.slice(1, -2).filter(Boolean), // Remove empty options
              correctAnswer: parseInt(row[row.length - 2], 10) || 0,
              category: row[row.length - 1] || 'Uncategorized',
              difficulty: 'Medium',
              timesUsed: 0,
              createdAt: new Date().toISOString()
            }));

          for (const question of validQuestions) {
            await addDoc(collection(db, 'questionPool'), question);
          }

          toast.success(`Successfully imported ${validQuestions.length} questions`);
          fetchQuestions();
        } catch (error) {
          console.error('Error importing questions:', error);
          toast.error('Failed to import questions');
        }
      },
      header: false
    });
    
    // Reset file input
    event.target.value = '';
  };

  const handleAddQuestion = async (questionData) => {
    try {
      await addDoc(collection(db, 'questionPool'), {
        ...questionData,
        teacherId: auth.currentUser.uid,
        timesUsed: 0,
        createdAt: new Date().toISOString()
      });
      toast.success('Question added successfully');
      fetchQuestions();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding question:', error);
      toast.error('Failed to add question');
    }
  };

  const handleEditQuestion = async (questionData) => {
    try {
      const questionRef = doc(db, 'questionPool', editingQuestion.id);
      await updateDoc(questionRef, {
        ...questionData,
        updatedAt: new Date().toISOString()
      });
      toast.success('Question updated successfully');
      fetchQuestions();
      setEditingQuestion(null);
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to update question');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    try {
      await deleteDoc(doc(db, 'questionPool', questionId));
      toast.success('Question deleted successfully');
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.questionText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || question.category === filterCategory;
    const matchesDifficulty = filterDifficulty === 'all' || question.difficulty === filterDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="teacher" />
      
      <div className="ml-80 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Question Pool</h1>
          <div className="flex space-x-4">
            <label className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition cursor-pointer">
              <FaUpload className="inline-block mr-2" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition"
            >
              <FaPlus className="mr-2" />
              Add Question
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Questions', value: stats.totalQuestions },
            { title: 'Categories', value: stats.categoriesCount },
            { title: 'Difficulty Levels', value: stats.difficultyLevels },
            { title: 'Times Reused', value: stats.reusedCount }
          ].map((stat) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 max-w-xs">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Questions Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No questions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Times Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuestions.map((question) => (
                    <motion.tr
                      key={question.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td className="px-6 py-4 whitespace-normal">
                        <div className="text-sm text-gray-900">{question.questionText}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{question.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                          question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {question.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {question.timesUsed || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setEditingQuestion(question)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Question Modal */}
      <AnimatePresence>
        {(showAddModal || editingQuestion) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddModal(false);
                setEditingQuestion(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h2>
              <QuestionForm
                question={editingQuestion}
                onSubmit={editingQuestion ? handleEditQuestion : handleAddQuestion}
                onClose={() => {
                  setShowAddModal(false);
                  setEditingQuestion(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestionPool; 