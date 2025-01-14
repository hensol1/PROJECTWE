import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import HeaderLogo from './HeaderLogo';

const WelcomeSlides = ({ isOpen, setIsOpen }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenWelcome', 'true');
    }
    setIsOpen(false);
    setCurrentSlide(0); // Reset to first slide when closing
  };

  const slides = [
    {
      title: "Welcome to We Know Better!",
      content: (
        <div className="space-y-6 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20">
              <HeaderLogo />
            </div>
          </div>
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-700 bg-clip-text text-transparent">
                AI-Powered Expert Predictions
              </h2>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xl text-gray-600 mb-4">
                Stay ahead with our cutting-edge prediction technology
              </p>
              <div className="bg-green-50 rounded-lg p-6 border border-green-200 text-left">
                <p className="text-gray-700 leading-relaxed text-sm">
                  Our platform stands out through its innovative combination of human insight 
                  and artificial intelligence. Our expert system utilizes sophisticated algorithms, 
                  machine learning models, and AI tools to analyze matches and generate predictions 
                  with remarkable accuracy. We're confident in our ability to outperform traditional 
                  prediction methods, and we have the track record to prove it.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center mt-6"
            >
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <HeaderLogo className="w-5 h-5" />
                <span>Your trusted source for football predictions</span>
              </div>
            </motion.div>
          </div>
        </div>
      )
        },
    {
      title: "Key Features",
      content: (
        <div className="space-y-6">
          <motion.div 
            className="flex flex-col gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative">
              <div className="absolute left-8 top-0 h-full w-0.5 bg-gradient-to-b from-green-500 to-transparent"></div>
              <div className="space-y-6">
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">1</div>
                  <div className="bg-white p-4 rounded-lg shadow-md flex-1">
                    <h3 className="font-semibold text-lg text-green-700 mb-2">Expert Predictions</h3>
                    <p className="text-gray-600">Get accurate predictions for upcoming matches</p>
                  </div>
                </motion.div>
  
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">2</div>
                  <div className="bg-white p-4 rounded-lg shadow-md flex-1">
                    <h3 className="font-semibold text-lg text-green-700 mb-2">Live Scores</h3>
                    <p className="text-gray-600">Follow matches in real-time with live score updates</p>
                  </div>
                </motion.div>
  
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">3</div>
                  <div className="bg-white p-4 rounded-lg shadow-md flex-1">
                    <h3 className="font-semibold text-lg text-green-700 mb-2">Performance Tracking</h3>
                    <p className="text-gray-600">Track our experts' prediction accuracy over time</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )
    },
    {
      title: "Match Coverage",
      content: (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h2 className="text-2xl font-bold text-green-700 mb-2">Comprehensive Coverage</h2>
            <p className="text-gray-600">Expert predictions for major leagues worldwide</p>
          </motion.div>
  
          <div className="grid grid-cols-1 gap-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-green-700">Top Leagues</h3>
                  <p className="text-sm text-gray-600">Premier League, La Liga, Bundesliga & more</p>
                </div>
              </div>
            </motion.div>
  
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-green-700">Performance Analysis</h3>
                  <p className="text-sm text-gray-600">Detailed accuracy statistics and trends</p>
                </div>
              </div>
            </motion.div>
  
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-green-700">Real-Time Updates</h3>
                  <p className="text-sm text-gray-600">Live scores and instant match events</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )
    }
  ];
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl bg-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 p-2"
          >
            {slides[currentSlide].content}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between items-center mt-8 border-t pt-4">
          <div className="flex items-center gap-2">
            {slides.map((_, index) => (
              <motion.div
                key={index}
                className={`w-3 h-3 rounded-full cursor-pointer ${
                  currentSlide === index 
                    ? 'bg-green-500' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                whileHover={{ scale: 1.2 }}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
          <div className="flex gap-3">
            {currentSlide > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentSlide(curr => curr - 1)}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                Previous
              </Button>
            )}
            {currentSlide < slides.length - 1 ? (
              <Button 
                onClick={() => setCurrentSlide(curr => curr + 1)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleClose}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Get Started
              </Button>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default WelcomeSlides;