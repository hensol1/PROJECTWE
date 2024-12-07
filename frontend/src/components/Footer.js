import React from 'react';
import { Link } from 'react-router-dom';
import HeaderLogo from './HeaderLogo';
import { Twitter, Facebook, Instagram, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-8">
          {/* Logo Section */}
          <div className="flex items-center sm:items-start">
            <div className="flex items-center gap-2">
              <HeaderLogo />
              <div className="flex flex-col">
                <span className="font-sans text-sm font-extrabold tracking-tight"
                      style={{
                        background: 'linear-gradient(to right, #40c456, #2d8b3c)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '0.05em'
                      }}>
                  WE KNOW BETTER
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex justify-center gap-4 sm:flex-col sm:gap-2">
            <Link to="/" className="text-gray-300 hover:text-white text-sm">Home</Link>
            <Link to="/about" className="text-gray-300 hover:text-white text-sm">About Us</Link>
            <Link to="/contact" className="text-gray-300 hover:text-white text-sm">Contact Us</Link>
          </div>

          {/* Social Media Icons */}
          <div className="flex flex-col items-center sm:items-end">
            <div className="hidden sm:block text-sm font-medium mb-2">Connect With Us</div>
            <div className="flex items-center gap-4">
              <a href="mailto:contact@weknowbetter.com" className="text-gray-300 hover:text-white">
                <Mail size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <Instagram size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 mt-4 pt-4">
          <p className="text-center text-gray-400 text-xs">
            &copy; {new Date().getFullYear()} We Know Better. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;