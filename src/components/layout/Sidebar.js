import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChalkboardTeacher,
  FaBook,
  FaChartBar,
  FaUserGraduate,
  FaClipboardList,
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaSignOutAlt,
  FaPlus,
  FaEye,
  FaBookmark,
  FaFlag,
  FaChartLine,
  FaQuestionCircle,
  FaSearch,
  FaGraduationCap,
  FaList,
  FaHistory,
  FaUserCog
} from 'react-icons/fa';
import { auth } from '../../config/firebase';

const Sidebar = ({ role }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const teacherMenuItems = [
    { icon: FaChalkboardTeacher, label: 'Dashboard', path: '/dashboard' },
    { icon: FaPlus, label: 'Create Exam', path: '/create-exam' },
    { icon: FaList, label: 'Exam List', path: '/exam-list' },
    { icon: FaEye, label: 'View Submissions', path: '/view-submissions' },
    { icon: FaQuestionCircle, label: 'Question Pool', path: '/question-pool' },
    { icon: FaFlag, label: 'Flagged Questions', path: '/flagged-questions' },
    { icon: FaChartBar, label: 'Analytics', path: '/teacher-analytics' },
    { icon: FaHistory, label: 'Exam History', path: '/exam-history' },
    { icon: FaUserCog, label: 'Settings', path: '/settings' },
  ];

  const studentMenuItems = [
    { icon: FaChalkboardTeacher, label: 'Dashboard', path: '/dashboard' },
    { icon: FaBook, label: 'Available Exams', path: '/available-exams' },
    { icon: FaChartBar, label: 'My Results', path: '/my-results' },
    { icon: FaBookmark, label: 'Bookmarked Questions', path: '/bookmarked' },
    { icon: FaChartLine, label: 'Analytics', path: '/analytics' },
    { icon: FaSearch, label: 'Join Exam', path: '/join-exam/public' },
    { icon: FaHistory, label: 'Exam History', path: '/student-exam-history' },
    { icon: FaUserCog, label: 'Settings', path: '/settings' },
  ];

  const menuItems = role === 'teacher' ? teacherMenuItems : studentMenuItems;

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? '80px' : '240px' }}
      className="h-screen fixed left-0 top-0 bg-white shadow-lg z-20 flex flex-col justify-between"
    >
      <div className="flex flex-col pt-6">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-0 top-4 bg-primary-600 text-white p-2 rounded-l-none rounded-r-md"
        >
          {isCollapsed ? <FaChevronRight size={16} /> : <FaChevronLeft size={16} />}
        </button>

        <div className="px-4 py-6">
          <div className="flex items-center mb-8">
            <FaUserGraduate className={`text-primary-600 text-2xl ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xl font-bold text-gray-900"
              >
                ExamPortal
              </motion.span>
            )}
          </div>

          <AnimatePresence>
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center py-3 px-4 rounded-md mb-2 transition-colors duration-200 ${
                  isActive(item.path)
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`text-lg ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-4 border-t">
        <button
          onClick={handleSignOut}
          className={`flex items-center py-3 px-4 rounded-md text-red-600 hover:bg-red-50 w-full ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <FaSignOutAlt className={`text-lg ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-medium"
            >
              Sign Out
            </motion.span>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;