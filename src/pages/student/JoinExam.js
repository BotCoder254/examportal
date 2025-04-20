import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { toast } from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';

const JoinExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        if (!auth.currentUser) {
          navigate('/login');
          return;
        }

        const examsRef = collection(db, 'exams');
        const q = query(
          examsRef,
          where('publicLink', '==', examId),
          where('visibility', '==', 'public')
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          toast.error('Exam not found or is not publicly accessible');
          navigate('/dashboard');
          return;
        }

        const examDoc = querySnapshot.docs[0];
        const examData = { id: examDoc.id, ...examDoc.data() };

        // Check if student is already a participant
        const isParticipant = examData.participants?.includes(auth.currentUser.uid);
        if (isParticipant) {
          toast.error('You have already joined this exam');
          navigate('/dashboard');
          return;
        }

        // Check if exam is still active
        if (examData.status !== 'active') {
          toast.error('This exam is no longer available');
          navigate('/dashboard');
          return;
        }

        setExam(examData);
      } catch (error) {
        console.error('Error fetching exam:', error);
        toast.error('Failed to load exam');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId, navigate]);

  const handleJoinExam = async () => {
    if (!exam || !auth.currentUser) return;

    try {
      setJoining(true);

      const examRef = doc(db, 'exams', exam.id);
      
      // Add student to participants array
      await updateDoc(examRef, {
        participants: [...(exam.participants || []), auth.currentUser.uid]
      });

      toast.success('Successfully joined the exam');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error joining exam:', error);
      toast.error('Failed to join exam');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar role="student" />
        <div className="ml-80 p-8 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="student" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="ml-80 p-8"
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Join Exam</h1>
            
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800">{exam.title}</h2>
              <p className="mt-2 text-gray-600">{exam.description}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center">
                <span className="text-gray-600 w-32">Time Limit:</span>
                <span className="font-medium">{exam.timeLimit} minutes</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600 w-32">Questions:</span>
                <span className="font-medium">{exam.questions?.length || 0}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600 w-32">Passing Score:</span>
                <span className="font-medium">{exam.passingScore}%</span>
              </div>
            </div>

            {exam.instructions && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Instructions</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{exam.instructions}</p>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinExam}
                disabled={joining}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {joining ? 'Joining...' : 'Join Exam'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default JoinExam; 