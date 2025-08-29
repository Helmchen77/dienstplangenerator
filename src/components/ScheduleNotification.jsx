import React from 'react';
import {useNavigate} from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import '../styles/neumorphism.css';

const {FiCheck,FiAlertTriangle,FiEye}=FiIcons;

function ScheduleNotification({success,violations,onClose}) {
  const navigate=useNavigate();

  const viewSchedule=()=> {
    navigate('/schedule');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="neu-card bg-white max-w-md w-full p-6 space-y-6">
        <div className="text-center">
          {success ? (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full neu-element bg-green-50 flex items-center justify-center">
              <SafeIcon icon={FiCheck} className="w-8 h-8 text-green-600" />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full neu-element bg-yellow-50 flex items-center justify-center">
              <SafeIcon icon={FiAlertTriangle} className="w-8 h-8 text-yellow-600" />
            </div>
          )}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {success ? 'Dienstplan erstellt!' : 'Dienstplan mit Regelabweichungen erstellt'}
          </h3>
          <p className="text-gray-600 mb-4">
            {success ? 'Der Dienstplan wurde erfolgreich erstellt und ist jetzt verfügbar.' : `Der Dienstplan wurde mit ${violations} Regelabweichungen erstellt.`}
          </p>
          <div className="space-y-3">
            <button
              onClick={viewSchedule}
              className="w-full flex items-center justify-center px-4 py-3 neu-button bg-primary-50 text-primary-700"
            >
              <SafeIcon icon={FiEye} className="w-5 h-5 mr-2" /> Plan anzeigen
            </button>
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center px-4 py-3 neu-button text-gray-700"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScheduleNotification;