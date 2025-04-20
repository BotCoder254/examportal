import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
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
import { FaClock, FaChartBar, FaThermometerHalf } from 'react-icons/fa';
import Sidebar from '../../components/layout/Sidebar';

const QuestionAnalytics = () => {
  const { examId } = useParams();
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState(null);
  const [questionAnalytics, setQuestionAnalytics] = useState([]);
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    const fetchQuestionAnalytics = async () => {
      try {
        // Fetch exam data
        const examDoc = await getDoc(doc(db, 'exams', examId));
        if (!examDoc.exists()) {
          throw new Error('Exam not found');
        }
        const examDataFromDb = { id: examId, ...examDoc.data() };
        setExamData(examDataFromDb);

        // Fetch all submissions for this exam
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('examId', '==', examId)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const submissions = submissionsSnapshot.docs.map(doc => doc.data());

        // Process analytics for each question
        const questions = examDataFromDb.questions || [];
        const analytics = questions.map((question, index) => {
          const questionResponses = submissions.map(sub => ({
            selectedOption: sub.answers?.[index],
            timeSpent: sub.questionTimes?.[index] || 0,
            isCorrect: sub.answers?.[index] === question.correctAnswer
          }));

          // Calculate option distribution
          const optionCounts = {};
          question.options.forEach((_, optIndex) => {
            optionCounts[`Option ${optIndex + 1}`] = 0;
          });
          questionResponses.forEach(response => {
            if (response.selectedOption !== undefined) {
              optionCounts[`Option ${response.selectedOption + 1}`]++;
            }
          });

          // Calculate average time spent
          const totalTimeSpent = questionResponses.reduce((acc, curr) => acc + curr.timeSpent, 0);
          const avgTimeSpent = questionResponses.length > 0 
            ? Math.round(totalTimeSpent / questionResponses.length)
            : 0;

          // Calculate difficulty based on correct answers
          const correctCount = questionResponses.filter(r => r.isCorrect).length;
          const difficultyScore = questionResponses.length > 0
            ? Math.round((correctCount / questionResponses.length) * 100)
            : 0;

          let difficulty = 'Medium';
          if (difficultyScore >= 80) difficulty = 'Easy';
          else if (difficultyScore <= 40) difficulty = 'Hard';

          // Format option distribution for chart
          const optionDistribution = Object.entries(optionCounts).map(([label, count]) => ({
            name: label,
            count,
            percentage: questionResponses.length > 0
              ? Math.round((count / questionResponses.length) * 100)
              : 0
          }));

          return {
            questionText: question.question,
            optionDistribution,
            averageTimeSpent: avgTimeSpent,
            difficultyScore,
            difficulty,
            totalAttempts: questionResponses.length,
            correctPercentage: questionResponses.length > 0
              ? Math.round((correctCount / questionResponses.length) * 100)
              : 0
          };
        });

        setQuestionAnalytics(analytics);
      } catch (error) {
        console.error('Error fetching question analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionAnalytics();
  }, [examId]);

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="teacher" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="ml-80 p-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Question Analytics: {examData?.title || 'Loading...'}
        </h1>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {questionAnalytics.map((question, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Question {index + 1}: {question.questionText}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Time Spent Card */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Average Time Spent</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {formatTime(question.averageTimeSpent)}
                        </p>
                      </div>
                      <div className="p-3 rounded-full bg-blue-100">
                        <FaClock className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Correct Percentage Card */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Correct Answers</p>
                        <p className="text-2xl font-bold text-green-900">
                          {question.correctPercentage}%
                        </p>
                      </div>
                      <div className="p-3 rounded-full bg-green-100">
                        <FaChartBar className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Card */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Difficulty Level</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {question.difficulty}
                        </p>
                      </div>
                      <div className="p-3 rounded-full bg-purple-100">
                        <FaThermometerHalf className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Option Distribution Chart */}
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Option Distribution
                    </h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={question.optionDistribution} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="percentage"
                            name="Selected %"
                            fill="#8884d8"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Pie Chart for Correct vs Incorrect */}
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Correct vs Incorrect
                    </h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Correct', value: question.correctPercentage },
                              { name: 'Incorrect', value: 100 - question.correctPercentage }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}%`}
                          >
                            {[0, 1].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default QuestionAnalytics;
