import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import AdminSettingsModal from './AdminSettingsModal';
import { useSchedule } from '../context/ScheduleContext';

const { FiSettings } = FiIcons;

function Footer() {
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const { state } = useSchedule();
  
  return (
    <footer className="bg-white py-3 px-6 border-t border-gray-200 mt-8 print:hidden">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} by Achim Helm
        </div>
        
        <button 
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setShowAdminSettings(true)}
          aria-label="Admin-Einstellungen"
        >
          <SafeIcon icon={FiSettings} className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      
      {showAdminSettings && (
        <AdminSettingsModal 
          onClose={() => setShowAdminSettings(false)}
          settings={state.settings}
        />
      )}
    </footer>
  );
}

export default Footer;