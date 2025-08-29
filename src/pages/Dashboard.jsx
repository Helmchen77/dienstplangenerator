import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useSchedule } from '../context/ScheduleContext';
import { useNavigate } from 'react-router-dom';
import { calculateCoveragePercentage } from '../utils/coverageCalculator';
import '../styles/neumorphism.css';

const { FiUsers, FiCalendar, FiClock, FiTrendingUp } = FiIcons;

function Dashboard() {
  const { state, dispatch } = useSchedule();
  const navigate = useNavigate();
  const { employees, schedules, currentSchedule } = state;

  // Calculate coverage percentage if a current schedule exists
  let coveragePercentage = 0;
  if (currentSchedule) {
    coveragePercentage = calculateCoveragePercentage(
      currentSchedule,
      state.settings.minStaffing
    );
  }

  const stats = [
    {
      name: 'Mitarbeiter',
      value: employees.length,
      icon: FiUsers,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      name: 'Erstelle Pläne',
      value: schedules.length,
      icon: FiCalendar,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      name: 'Aktiver Plan',
      value: currentSchedule ? '1' : '0',
      icon: FiClock,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      name: 'Dienstabdeckung',
      value: `${Math.round(coveragePercentage)}%`,
      icon: FiTrendingUp,
      color: coveragePercentage >= 95 ? 'text-green-600' : coveragePercentage >= 85 ? 'text-orange-600' : 'text-red-600',
      bg: coveragePercentage >= 95 ? 'bg-green-50' : coveragePercentage >= 85 ? 'bg-orange-50' : 'bg-red-50'
    }
  ];

  const handleScheduleClick = (schedule) => {
    dispatch({ type: 'SET_CURRENT_SCHEDULE', payload: schedule });
    navigate('/schedule');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Übersicht über Ihre Dienstplanung</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="p-6 neu-card">
            <div className="flex items-center">
              <div className={`${stat.bg} p-3 rounded-lg neu-element`}>
                <SafeIcon icon={stat.icon} className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 neu-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mitarbeiter Übersicht</h3>
          <div className="space-y-3">
            {/* Show all employees instead of just the first 5 */}
            {employees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between py-2 px-3 neu-element rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 neu-element-inset rounded-full flex items-center justify-center bg-primary-50">
                    <span className="text-sm font-medium text-primary-700">
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">{employee.name}</span>
                </div>
                <span className="text-sm neu-element-inset px-3 py-1 rounded-full bg-blue-50 text-blue-700">{employee.workload}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 neu-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktuelle Woche</h3>
          {currentSchedule ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 p-3 neu-element-inset rounded-lg">
                Plan für {new Date(currentSchedule.month).toLocaleDateString('de-DE', {month: 'long', year: 'numeric'})}
              </p>
              <div className="neu-element p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800 flex items-center">
                  <SafeIcon icon={FiClock} className="w-4 h-4 mr-2" />
                  Plan erfolgreich erstellt
                </p>
              </div>

              {coveragePercentage < 100 && (
                <div className="neu-element p-4 bg-orange-50 rounded-lg mt-3">
                  <p className="text-sm text-orange-800 font-medium mb-2">Tipps zur Verbesserung der Dienstabdeckung:</p>
                  <ul className="text-xs text-orange-700 space-y-1">
                    <li>• Prüfen Sie die Verfügbarkeit der Mitarbeiter an kritischen Tagen</li>
                    <li>• Erwägen Sie eine geringfügige Erhöhung des Stundenpensums</li>
                    <li>• Verteilen Sie Wochenenddienste gleichmäßiger</li>
                    {coveragePercentage < 90 && (
                      <li className="font-medium">• Notfallmaßnahme: Temporäre Anpassung der Mindestbesetzung in Betracht ziehen</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 neu-element-inset rounded-lg">
              <SafeIcon icon={FiCalendar} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Noch kein Plan erstellt</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 neu-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gespeicherte Pläne</h3>
        {schedules.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-2">
              Die letzten {Math.min(schedules.length, 50)} von maximal 50 Plänen werden gespeichert.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {schedules.slice(0, 6).map((schedule, index) => (
                <div key={index} className="p-3 neu-element rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleScheduleClick(schedule)}>
                  <div className="flex items-center">
                    <div className="w-8 h-8 neu-element-inset rounded-full flex items-center justify-center bg-primary-50 mr-3">
                      <SafeIcon icon={FiCalendar} className="w-4 h-4 text-primary-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(schedule.month).toLocaleDateString('de-DE', {month: 'long', year: 'numeric'})}
                      </p>
                      <p className="text-xs text-gray-500">
                        Erstellt am {new Date(schedule.createdAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {schedules.length > 6 && (
              <button onClick={() => navigate('/schedule')} className="w-full mt-3 py-2 neu-button text-sm text-gray-700">
                Alle Pläne anzeigen
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 p-4 neu-element-inset rounded-lg">
            Keine gespeicherten Pläne vorhanden. Erstellen Sie Ihren ersten Plan.
          </p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;