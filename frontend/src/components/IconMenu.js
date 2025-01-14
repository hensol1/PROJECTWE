import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IoHomeOutline, IoStatsChartOutline } from 'react-icons/io5';

const IconMenu = ({ user }) => {
  const location = useLocation();

  const icons = [
    { name: 'Home', path: '/', Icon: IoHomeOutline },
    ...(user ? [
      { name: 'Stats', path: '/stats', Icon: IoStatsChartOutline },
    ] : []),
  ];

  return (
    <div className="flex justify-evenly sm:justify-center sm:space-x-8 max-w-md mx-auto">
      {icons.map(({ name, path, Icon }) => (
        <Link
          key={name}
          to={path}
          className={`
            w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-md flex justify-center items-center text-lg sm:text-xl
            transition-all duration-500 ease-in-out cursor-pointer
            ${location.pathname === path 
              ? 'text-blue-500 shadow-inner' 
              : 'text-gray-600 hover:text-blue-500'
            }
          `}
        >
          <Icon />
        </Link>
      ))}
    </div>
  );
};

export default IconMenu;