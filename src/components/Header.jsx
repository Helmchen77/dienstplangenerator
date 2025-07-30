import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiMenu, FiCalendar } = FiIcons;

function Header({ onMenuClick }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <SafeIcon icon={FiMenu} className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiCalendar} className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">Dienstplan Manager</h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {new Date().toLocaleDateString('de-DE', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
      </div>
    </header>
  );
}

export default Header;