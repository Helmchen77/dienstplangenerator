import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import '../styles/neumorphism.css';

const { FiMenu } = FiIcons;

function Header({ onMenuClick, logo }) {
  return (
    <header className="bg-white fixed w-full top-0 z-50 neu-element">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg neu-button lg:hidden"
          >
            <SafeIcon icon={FiMenu} className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center space-x-3">
            <img 
              src={logo} 
              alt="HelmPlanner Logo" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HelmPlanner</h1>
              <p className="text-xs text-gray-500">SGM Dienstplangenerator</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 p-2 rounded-lg neu-element-inset">
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