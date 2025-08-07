import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import '../styles/neumorphism.css';

const { FiHome, FiUsers, FiCalendar, FiEye, FiSettings, FiX } = FiIcons;

const navigation = [
  { name: 'Dashboard', href: '/', icon: FiHome },
  { name: 'Mitarbeiter', href: '/employees', icon: FiUsers },
  { name: 'Plan erstellen', href: '/generate', icon: FiCalendar },
  { name: 'Plan anzeigen', href: '/schedule', icon: FiEye },
  { name: 'Einstellungen', href: '/settings', icon: FiSettings },
];

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`
        fixed top-0 left-0 z-50 w-64 h-full bg-white transition-transform duration-300 neu-element
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
          <button onClick={onClose} className="p-2 rounded-lg neu-button">
            <SafeIcon icon={FiX} className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <nav className="mt-28 lg:mt-28 px-4">
          <ul className="space-y-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                      ${isActive 
                        ? 'neu-element-inset bg-orange-50 text-orange-700' 
                        : 'neu-element text-gray-700'
                      }
                    `}
                  >
                    <SafeIcon icon={item.icon} className={`mr-3 w-5 h-5 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;