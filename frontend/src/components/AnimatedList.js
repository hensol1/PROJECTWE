// components/magicui/animated-list.tsx
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

export const AnimatedList = ({ 
    children, 
    className = "", 
    delay = 1000 
  }) => {
    const [mounted, setMounted] = useState(false);
  
    useEffect(() => {
      setMounted(true);
    }, []);
  
    return (
      <div
        className={cn(
          "flex flex-col gap-2",  // Removed overflow properties
          className
        )}
      >
        {React.Children.map(children, (child, i) => (
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: `all 0.5s ease-in-out ${i * delay}ms`,
            }}
          >
            {child}
          </div>
        ))}
      </div>
    );
  };    
  
export default AnimatedList;