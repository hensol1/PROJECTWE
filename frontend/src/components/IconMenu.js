import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IoHomeOutline, IoPersonOutline, IoTrophyOutline, IoStatsChartOutline, IoSettingsOutline } from 'react-icons/io5';

const IconMenu = ({ user }) => {
  const location = useLocation();

  const icons = [
    { name: 'Home', path: '/', Icon: IoHomeOutline },
    { name: 'Leaderboard', path: '/leaderboard', Icon: IoTrophyOutline },
    ...(user ? [
      { name: 'Profile', path: '/profile', Icon: IoPersonOutline },
      { name: 'Stats', path: '/stats', Icon: IoStatsChartOutline },
    ] : []),
    ...(user?.isAdmin ? [{ name: 'Admin', path: '/admin', Icon: IoSettingsOutline }] : []),
  ];

  return (
    <div className="flex justify-center space-x-4 py-2">
      {icons.map(({ name, path, Icon }) => (
        <Link
          key={name}
          to={path}
          className={`
            w-10 h-10 rounded-full shadow-md flex justify-center items-center text-xl
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