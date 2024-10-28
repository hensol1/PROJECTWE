import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, X } from 'lucide-react';
import MatchVotingBox from './MatchVotingBox';

const AnimatedVotingBox = ({ matches, onVote, onSkip, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMatchesToVote, setHasMatchesToVote] = useState(false);

  // Check if there are matches to vote on
  useEffect(() => {
    const checkMatchesToVote = () => {
      if (!user) {
        const votedMatches = new Set(JSON.parse(localStorage.getItem('votedMatches') || '[]'));
        return matches.some(match => !votedMatches.has(match.id));
      }
      return matches.some(match => !match.userVote);
    };

    setHasMatchesToVote(checkMatchesToVote());
  }, [matches, user]);

  // If there are no matches to vote on, don't render anything
  if (!hasMatchesToVote) {
    return null;
  }

  const containerVariants = {
    hidden: { 
      scale: 0.8,
      opacity: 0,
      y: 100,
      rotateX: 45
    },
    visible: { 
      scale: 1,
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 100
      }
    },
    exit: {
      scale: 0.8,
      opacity: 0,
      y: -100,
      rotateX: -45,
      transition: {
        duration: 0.3
      }
    }
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    },
    tap: { scale: 0.95 }
  };

  const sparkleVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: [0, 1, 0],
      opacity: [0, 1, 0],
      transition: {
        duration: 0.5,
        times: [0, 0.5, 1]
      }
    }
  };

  // Don't render anything if there are no matches to vote on
  if (!matches || matches.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {!isOpen && (
        <motion.div
          className="flex justify-center"
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          variants={buttonVariants}
        >
          <Button 
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center gap-2"
          >
            <Vote className="w-5 h-5" />
            Start Voting
            {/* Sparkles */}
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full"
              variants={sparkleVariants}
              initial="initial"
              animate="animate"
              key="sparkle1"
            />
            <motion.div
              className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-300 rounded-full"
              variants={sparkleVariants}
              initial="initial"
              animate="animate"
              key="sparkle2"
            />
          </Button>
        </motion.div>
      )}

      {/* Voting Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-sm bg-transparent rounded-xl overflow-hidden"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.button
                className="absolute top-2 right-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 z-10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(false)}
              >
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>

              <MatchVotingBox
                matches={matches}
                onVote={async (...args) => {
                  await onVote(...args);
                  // Check if this was the last match
                  if (matches.length <= 1) {
                    setIsOpen(false);
                  }
                }}
                onSkip={(...args) => {
                  onSkip(...args);
                }}
                user={user}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedVotingBox;
