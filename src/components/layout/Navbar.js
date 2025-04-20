import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserGraduate, FaSignInAlt, FaUserPlus } from 'react-icons/fa';

const Navbar = () => {
  return (
    <nav className="bg-white shadow-lg fixed w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <FaUserGraduate className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-800">ExamPortal</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
              Home
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
              About
            </Link>
            <Link to="/login" className="inline-flex items-center text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
              <FaSignInAlt className="mr-2" />
              Login
            </Link>
            <Link to="/signup" className="inline-flex items-center bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition duration-150 ease-in-out">
              <FaUserPlus className="mr-2" />
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 