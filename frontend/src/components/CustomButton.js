import React from 'react';

const CustomButton = ({ onClick, children }) => {
  return (
    <button 
      onClick={onClick}
      className="w-24 h-8 sm:w-32 sm:h-10 rounded-full bg-[#4e65ff] text-white font-semibold text-xs sm:text-sm 
                 shadow-[0_4px_6px_-1px_rgba(78,101,255,0.3)] 
                 hover:shadow-[0_6px_8px_-1px_rgba(78,101,255,0.4)] 
                 active:shadow-[0_2px_4px_-1px_rgba(78,101,255,0.2)]
                 transition-all duration-300 ease-in-out"
    >
      {children}
    </button>
  );
};

export default CustomButton;