import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useSchedule } from '../context/ScheduleContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { de } from 'date-fns/locale';
import SchedulePDF from '../components/SchedulePDF';
import ScheduleExcel from '../components/ScheduleExcel';

const { FiDownload, FiAlertTriangle, FiCalendar, FiUsers, FiFileText } = FiIcons;

function ScheduleView() {
  const { state } = useSchedule();
  const { currentSchedule, employees } = state;
  const [showPDF, setShowPDF] = useState(false);
  const [showExcel, setShowExcel] = useState(false);

  if (!currentSchedule) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dienstplan anzeigen</h1>
          <p className="mt-2 text-gray-600">Aktueller Monatsplan und Übersicht</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <SafeIcon icon={FiCalendar} className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Kein Plan vorhanden</h3>
          <p className="text-gray-600 mb-6">Erstellen Sie zuerst einen Dienstplan</p>
        </div>
      </div>
    );
  }

  const monthDate = new Date(currentSchedule.month + '-01');
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unbekannt';
  };

  const getShiftColor = (shift) => {
    switch (shift) {
      case 'früh': return 'bg-blue-100 text-blue-800';
      case 'zwischen': return 'bg-green-100 text-green-800';
      case 'spät': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatHours = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0 ? `${wholeHours}h ${minutes}min` : `${wholeHours}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dienstplan anzeigen</h1>
          <p className="mt-2 text-gray-600">
            {format(monthDate, 'MMMM yyyy', { locale: de })}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExcel(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <SafeIcon icon={FiFileText} className="w-5 h-5 mr-2" />
            Excel Export
          </button>
          <button
            onClick={() => setShowPDF(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <SafeIcon icon={FiDownload} className="w-5 h-5 mr-2" />
            PDF Export
          </button>
        </div>
      </div>

      {currentSchedule.violations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center mb-2">
            <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-sm font-medium text-yellow-800">Regelverstöße gefunden</h3>
          </div>
          <div className="space-y-1">
            {currentSchedule.violations.map((violation, index) => (
              <p key={index} className="text-sm text-yellow-700">
                {violation.type === 'understaffed' && 
                  `${violation.date}: Unterbesetzung im ${violation.shift}dienst (${violation.assigned}/${violation.required})`}
                {violation.type === 'hours_mismatch' && 
                  `${violation.employeeName}: Stunden-Abweichung (${formatHours(violation.actual)} statt ${formatHours(violation.target)})`}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Mitarbeiter Statistiken */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mitarbeiter Statistiken</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frühdienst
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zwischendienst
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spätdienst
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gesamt Tage
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gesamtstunden
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Soll-Stunden
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => {
                const stats = currentSchedule.employeeStats?.[employee.id] || { früh: 0, zwischen: 0, spät: 0, totalDays: 0 };
                const actualHours = currentSchedule.employeeHours?.[employee.id] || 0;
                const targetHours = currentSchedule.targetHours?.[employee.id] || 0;
                
                return (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-700">
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900">{employee.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {stats.früh}x
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {stats.zwischen}x
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {stats.spät}x
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {stats.totalDays}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                      {formatHours(actualHours)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {formatHours(targetHours)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frühdienst ({state.settings.shifts.früh.start}-{state.settings.shifts.früh.end})
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zwischendienst ({state.settings.shifts.zwischen.start}-{state.settings.shifts.zwischen.end})
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spätdienst ({state.settings.shifts.spät.start}-{state.settings.shifts.spät.end})
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const daySchedule = currentSchedule.schedule[dateStr] || {};
                const isWeekendDay = isWeekend(day);
                
                return (
                  <tr key={dateStr} className={isWeekendDay ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {format(day, 'dd.MM.yyyy')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(day, 'EEEE', { locale: de })}
                      </div>
                    </td>
                    {['früh', 'zwischen', 'spät'].map((shift) => (
                      <td key={shift} className="px-4 py-3">
                        <div className="space-y-1">
                          {daySchedule[shift]?.map((employeeId) => (
                            <span
                              key={employeeId}
                              className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getShiftColor(shift)}`}
                            >
                              {getEmployeeName(employeeId)}
                            </span>
                          )) || (
                            <span className="text-xs text-gray-400">Nicht besetzt</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <SafeIcon icon={FiUsers} className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Statistiken</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Arbeitstage:</span>
              <span className="text-sm font-medium text-gray-900">{days.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Wochenenden:</span>
              <span className="text-sm font-medium text-gray-900">
                {days.filter(day => isWeekend(day)).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Regelverstöße:</span>
              <span className={`text-sm font-medium ${currentSchedule.violations.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {currentSchedule.violations.length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Schichtverteilung</h3>
          <div className="space-y-2">
            {['früh', 'zwischen', 'spät'].map((shift) => (
              <div key={shift} className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${getShiftColor(shift).split(' ')[0]}`}></div>
                <span className="text-sm text-gray-600 capitalize">{shift}dienst</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Arbeitszeiten</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div>Frühdienst: {state.settings.shifts.früh.start} - {state.settings.shifts.früh.end} 
              ({state.settings.shifts.früh.hours}h {state.settings.shifts.früh.minutes}min)</div>
            <div>Zwischendienst: {state.settings.shifts.zwischen.start} - {state.settings.shifts.zwischen.end} 
              ({state.settings.shifts.zwischen.hours}h {state.settings.shifts.zwischen.minutes}min)</div>
            <div>Spätdienst: {state.settings.shifts.spät.start} - {state.settings.shifts.spät.end} 
              ({state.settings.shifts.spät.hours}h {state.settings.shifts.spät.minutes}min)</div>
          </div>
        </div>
      </div>

      {showPDF && (
        <SchedulePDF
          schedule={currentSchedule}
          employees={employees}
          settings={state.settings}
          onClose={() => setShowPDF(false)}
        />
      )}

      {showExcel && (
        <ScheduleExcel
          schedule={currentSchedule}
          employees={employees}
          settings={state.settings}
          onClose={() => setShowExcel(false)}
        />
      )}
    </div>
  );
}

export default ScheduleView;