import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaChartBar, FaLink, FaSearch } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const examsSnapshot = await getDocs(collection(db, 'exams'));
      const examList = examsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(exam => exam.teacherId === auth.currentUser.uid)
        .sort((a, b) => b.createdAt - a.createdAt);
      setExams(examList);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (examId) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await deleteDoc(doc(db, 'exams', examId));
        setExams(exams.filter(exam => exam.id !== examId));
        toast.success('Exam deleted successfully');
      } catch (error) {
        console.error('Error deleting exam:', error);
        toast.error('Failed to delete exam');
      }
    }
  };

  const handleEdit = (examId) => {
    navigate(`/exam/${examId}/edit`);
  };

  const handleViewAnalytics = (examId) => {
    navigate(`/exam/${examId}/analytics`);
  };

  const copyPublicLink = async (examId) => {
    try {
      const examRef = doc(db, 'exams', examId);
      const publicLink = `${window.location.origin}/join/${examId}`;
      
      // Update exam with public link if not exists
      await updateDoc(examRef, {
        publicLink: examId,
        visibility: 'public'
      });

      await navigator.clipboard.writeText(publicLink);
      toast.success('Public link copied to clipboard!');
    } catch (error) {
      console.error('Error copying public link:', error);
      toast.error('Failed to copy public link');
    }
  };

  const filteredExams = exams.filter(exam =>
    exam.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prepare data for charts
  const statusDistribution = [
    { name: 'Active', value: exams.filter(e => e.status === 'active').length },
    { name: 'Draft', value: exams.filter(e => e.status === 'draft').length },
    { name: 'Completed', value: exams.filter(e => e.status === 'completed').length }
  ];

  const difficultyDistribution = exams.reduce((acc, exam) => {
    const difficulty = exam.difficulty || 'Medium';
    acc[difficulty] = (acc[difficulty] || 0) + 1;
    return acc;
  }, {});

  const difficultyData = Object.entries(difficultyDistribution).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="teacher" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="ml-80 p-8"
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Exam List</h1>
          <button
            onClick={() => navigate('/create-exam')}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition duration-150 ease-in-out"
          >
            Create New Exam
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Exam Status Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Difficulty Distribution Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Difficulty Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={difficultyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Number of Exams" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Exam List Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredExams.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      No exams found
                    </td>
                  </tr>
                ) : (
                  filteredExams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{exam.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{exam.duration} minutes</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          exam.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {exam.status || 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <button
                          onClick={() => handleViewAnalytics(exam.id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View Question Analytics"
                        >
                          <FaChartBar className="inline-block text-xl" />
                        </button>
                        <button
                          onClick={() => copyPublicLink(exam.id)}
                          className="text-purple-600 hover:text-purple-800 transition-colors"
                          title="Copy Public Link"
                        >
                          <FaLink className="inline-block text-xl" />
                        </button>
                        <button
                          onClick={() => handleEdit(exam.id)}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors"
                          title="Edit Exam"
                        >
                          <FaEdit className="inline-block text-xl" />
                        </button>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete Exam"
                        >
                          <FaTrash className="inline-block text-xl" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ExamList; 
