import React from 'react';
import { Link } from 'react-router-dom';
import HeaderLogo from './HeaderLogo';
import { Facebook, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-8">
          {/* Mobile Layout: Logo and Social Icons in same row */}
          <div className="flex justify-between sm:block">
            {/* Logo Section */}
            <div className="flex items-center">
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

            {/* Social Media Icons - Mobile */}
            <div className="flex sm:hidden items-center gap-4">
              <a href="https://www.tiktok.com/@weknowbetter2024?_t=8s6MSbrXfNq&_r=1" 
                 className="text-gray-300 hover:text-white"
                 target="_blank"
                 rel="noopener noreferrer">
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a href="https://www.facebook.com/share/14wVvrg51T/" 
                 className="text-gray-300 hover:text-white"
                 target="_blank"
                 rel="noopener noreferrer">
                <Facebook size={20} />
              </a>
              <a href="https://www.instagram.com/weknowbetter2024?igsh=azcwbzkyeDN1ZXJt" 
                 className="text-gray-300 hover:text-white"
                 target="_blank"
                 rel="noopener noreferrer">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Navigation Links - Now in row for desktop */}
          <div className="flex justify-center gap-4">
            <Link to="/" className="text-gray-300 hover:text-white text-sm">Home</Link>
            <Link to="/about" className="text-gray-300 hover:text-white text-sm">About Us</Link>
            <Link to="/contact" className="text-gray-300 hover:text-white text-sm">Contact Us</Link>
          </div>

          {/* Social Media Icons - Desktop */}
          <div className="hidden sm:flex flex-col items-end">
            <div className="text-sm font-medium mb-2">Connect With Us</div>
            <div className="flex items-center gap-4">
              <a href="https://www.tiktok.com/@weknowbetter2024?_t=8s6MSbrXfNq&_r=1" 
                 className="text-gray-300 hover:text-white"
                 target="_blank"
                 rel="noopener noreferrer">
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a href="https://www.facebook.com/share/14wVvrg51T/" 
                 className="text-gray-300 hover:text-white"
                 target="_blank"
                 rel="noopener noreferrer">
                <Facebook size={20} />
              </a>
              <a href="https://www.instagram.com/weknowbetter2024?igsh=azcwbzkyeDN1ZXJt" 
                 className="text-gray-300 hover:text-white"
                 target="_blank"
                 rel="noopener noreferrer">
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