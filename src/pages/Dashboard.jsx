import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useSchedule } from '../context/ScheduleContext';

const { FiUsers, FiCalendar, FiClock, FiTrendingUp } = FiIcons;

function Dashboard() {
  const { state } = useSchedule();
  const { employees, schedules, currentSchedule } = state;

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
      name: 'Auslastung',
      value: `${Math.round(employees.reduce((acc, emp) => acc + emp.workload, 0) / employees.length)}%`,
      icon: FiTrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Übersicht über Ihre Dienstplanung</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`${stat.bg} p-3 rounded-lg`}>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mitarbeiter Übersicht</h3>
          <div className="space-y-3">
            {employees.slice(0, 5).map((employee) => (
              <div key={employee.id} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">{employee.name}</span>
                </div>
                <span className="text-sm text-gray-500">{employee.workload}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktuelle Woche</h3>
          {currentSchedule ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Plan für {new Date(currentSchedule.month).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">✓ Plan erfolgreich erstellt</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <SafeIcon icon={FiCalendar} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Noch kein Plan erstellt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;