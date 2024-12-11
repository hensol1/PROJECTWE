import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import HeaderLogo from './HeaderLogo';

const WelcomeSlides = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenWelcome', 'true');
    }
    setIsOpen(false);
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
                Think You Know Better?
              </h2>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xl text-gray-600">Challenge our AI and join thousands of fans in predicting match outcomes!</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center mt-6"
            >
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-green-700 font-medium">Join the ultimate football prediction challenge!</p>
              </div>
            </motion.div>
          </div>
        </div>
      )
    },
    {
      title: "How to Play",
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
                    <h3 className="font-semibold text-lg text-green-700 mb-2">Make Your Prediction</h3>
                    <p className="text-gray-600">Vote on upcoming matches and predict the winners</p>
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
                    <h3 className="font-semibold text-lg text-green-700 mb-2">Create Your Account</h3>
                    <p className="text-gray-600">Register to track your predictions and compete with others</p>
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
                    <h3 className="font-semibold text-lg text-green-700 mb-2">Watch Live Results</h3>
                    <p className="text-gray-600">See your predictions come true in real-time!</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )
    },
    {
      title: "Climb the Rankings",
      content: (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h2 className="text-2xl font-bold text-green-700 mb-2">Compete Globally</h2>
            <p className="text-gray-600">See where you stand among the world's best predictors</p>
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
                  <h3 className="font-semibold text-green-700">Global Rankings</h3>
                  <p className="text-sm text-gray-600">Compete with predictors worldwide</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-green-700">National Rankings</h3>
                  <p className="text-sm text-gray-600">Be the best in your country</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-green-700">Local Leaderboard</h3>
                  <p className="text-sm text-gray-600">Dominate your city's rankings</p>
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

        <div className="mt-4 flex items-center gap-2">
          <Checkbox
            id="dontShow"
            checked={dontShowAgain}
            onCheckedChange={setDontShowAgain}
            className="border-green-200 text-green-600"
          />
          <label htmlFor="dontShow" className="text-sm text-gray-500">
            Don't show this again
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeSlides;