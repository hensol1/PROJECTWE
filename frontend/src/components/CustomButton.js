import React from 'react';

const CustomButton = ({ onClick, children, className = '' }) => {
  return (
    <button 
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full bg-[#4e65ff] text-white font-semibold text-sm
        shadow-[0_4px_6px_-1px_rgba(78,101,255,0.3)] 
        hover:shadow-[0_6px_8px_-1px_rgba(78,101,255,0.4)] 
        active:shadow-[0_2px_4px_-1px_rgba(78,101,255,0.2)]
        transition-all duration-300 ease-in-out
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default CustomButton;