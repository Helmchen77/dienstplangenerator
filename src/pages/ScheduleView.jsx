import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useSchedule } from '../context/ScheduleContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { de } from 'date-fns/locale';
import { getCoverageImprovementSuggestions } from '../utils/coverageCalculator';
import SchedulePDF from '../components/SchedulePDF';
import ScheduleExcel from '../components/ScheduleExcel';
import VerticalScheduleView from '../components/VerticalScheduleView';
import DatabaseService from '../utils/databaseService';
import '../styles/neumorphism.css';

const { 
  FiDownload, FiAlertTriangle, FiCalendar, FiUsers, FiFileText, 
  FiColumns, FiList, FiInfo, FiX, FiTrash2, FiLoader 
} = FiIcons;

function ScheduleView() {
  const { state, dispatch } = useSchedule();
  const { currentSchedule, employees, viewMode, schedules } = state;
  const [showPDF, setShowPDF] = useState(false);
  const [showExcel, setShowExcel] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleViewMode = () => {
    const newMode = viewMode === 'horizontal' ? 'vertical' : 'horizontal';
    dispatch({ type: 'SET_VIEW_MODE', payload: newMode });
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (confirm('Möchten Sie diesen Dienstplan wirklich löschen?')) {
      setIsDeleting(true);
      try {
        await DatabaseService.deleteSchedule(scheduleId);
        dispatch({ type: 'DELETE_SCHEDULE', payload: scheduleId });
      } catch (error) {
        console.error('Error deleting schedule:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (!currentSchedule) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dienstplan anzeigen</h1>
          <p className="mt-2 text-gray-600">Aktueller Monatsplan und Übersicht</p>
        </div>
        <div className="p-12 text-center neu-card">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full neu-element flex items-center justify-center">
            <SafeIcon icon={FiCalendar} className="w-8 h-8 text-gray-400" />
          </div>
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
      case 'früh': return 'bg-blue-50 text-blue-700';
      case 'zwischen': return 'bg-green-50 text-green-700';
      case 'spät': return 'bg-purple-50 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatHours = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0 ? `${wholeHours}h ${minutes}min` : `${wholeHours}h`;
  };

  const getHoursStatusClass = (actualHours, targetHours) => {
    if (actualHours > targetHours) {
      return "text-red-600 font-medium";
    } else {
      return "text-green-600 font-medium";
    }
  };

  // Generate improvement suggestions
  const suggestions = getCoverageImprovementSuggestions(
    currentSchedule, 
    state.settings.minStaffing,
    employees
  );

  const handleScheduleSelect = (schedule) => {
    dispatch({ type: 'SET_CURRENT_SCHEDULE', payload: schedule });
    setShowArchive(false);
  };

  // Helper function to determine weekend limit for an employee
  const getWeekendLimit = (employee) => {
    return employee.workload <= 50 ? 
      (state.settings.weekendRules?.under50 || 1) : 
      (state.settings.weekendRules?.over50 || 2);
  };

  if (isDeleting) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <SafeIcon icon={FiLoader} className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="text-lg text-gray-700">Dienstplan wird gelöscht...</p>
        </div>
      </div>
    );
  }

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
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center px-4 py-2 neu-button"
          >
            <SafeIcon icon={FiCalendar} className="w-5 h-5 mr-2" />
            Archiv
          </button>
          {suggestions.length > 0 && (
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center px-4 py-2 neu-button bg-orange-50 text-orange-700"
            >
              <SafeIcon icon={FiInfo} className="w-5 h-5 mr-2" />
              Verbesserungsvorschläge
            </button>
          )}
          <button
            onClick={toggleViewMode}
            className="flex items-center px-4 py-2 neu-button"
            title={viewMode === 'horizontal' ? 'Vertikale Ansicht' : 'Horizontale Ansicht'}
          >
            <SafeIcon icon={viewMode === 'horizontal' ? FiList : FiColumns} className="w-5 h-5 mr-2" />
            {viewMode === 'horizontal' ? 'Vertikale Ansicht' : 'Horizontale Ansicht'}
          </button>
          <button
            onClick={() => setShowExcel(true)}
            className="flex items-center px-4 py-2 neu-button bg-green-50 text-green-700"
          >
            <SafeIcon icon={FiFileText} className="w-5 h-5 mr-2" />
            Excel Export
          </button>
          <button
            onClick={() => setShowPDF(true)}
            className="flex items-center px-4 py-2 neu-button bg-primary-50 text-primary-700"
          >
            <SafeIcon icon={FiDownload} className="w-5 h-5 mr-2" />
            PDF Export
          </button>
        </div>
      </div>

      {showArchive && (
        <div className="p-6 neu-card bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Archivierte Pläne</h3>
            <button 
              onClick={() => setShowArchive(false)}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <SafeIcon icon={FiX} className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {schedules.map((schedule, index) => (
              <div 
                key={index} 
                className={`p-3 neu-element rounded-lg hover:bg-gray-50 transition-colors ${
                  currentSchedule.month === schedule.month ? 'bg-orange-50 border border-orange-200' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center flex-1 cursor-pointer" 
                    onClick={() => handleScheduleSelect(schedule)}
                  >
                    <div className="w-8 h-8 neu-element-inset rounded-full flex items-center justify-center bg-primary-50 mr-3">
                      <SafeIcon icon={FiCalendar} className="w-4 h-4 text-primary-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(schedule.month + '-01').toLocaleDateString('de-DE', {month: 'long', year: 'numeric'})}
                      </p>
                      <p className="text-xs text-gray-500">
                        Erstellt am {new Date(schedule.createdAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSchedule(schedule.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Dienstplan löschen"
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="p-6 neu-card bg-orange-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-orange-900">Verbesserungsvorschläge</h3>
            <button 
              onClick={() => setShowSuggestions(false)}
              className="text-orange-700 hover:text-orange-900"
            >
              <SafeIcon icon={FiX} className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="p-4 bg-white rounded-lg neu-element">
                <h4 className="font-medium text-orange-800 mb-2">{suggestion.title}</h4>
                
                {suggestion.type === 'critical_days' && (
                  <div>
                    <p className="text-sm text-gray-700 mb-2">
                      Es gibt {suggestion.totalCount} Tage mit Unterbesetzung.
                    </p>
                    <div className="space-y-1 mb-2">
                      {suggestion.days.map((day, i) => (
                        <div key={i} className="text-sm">
                          <span className={`${day.isWeekend ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                            {day.displayDate}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {suggestion.type === 'available_capacity' && (
                  <div>
                    <p className="text-sm text-gray-700 mb-2">
                      Folgende Mitarbeiter haben noch freie Kapazität:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {suggestion.employees.map((emp, i) => (
                        <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                          <span className="font-medium">{emp.name}</span>: {emp.percentUsed}% ausgelastet 
                          ({formatHours(emp.actualHours)} von {formatHours(emp.targetHours)})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {suggestion.type === 'weekend_redistribution' && (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-700 mb-2">
                          Überbelastete Mitarbeiter an Wochenenden:
                        </p>
                        <div className="space-y-1">
                          {suggestion.overAllocated.map((emp, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium">{emp.name}</span>: {emp.weekendShifts} Tage 
                              (max. {emp.recommendedMax} bei {emp.workload}% Pensum)
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 mb-2">
                          Mitarbeiter mit Kapazität für Wochenenden:
                        </p>
                        <div className="space-y-1">
                          {suggestion.hasCapacity.map((emp, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium">{emp.name}</span>: {emp.weekendShifts} von {emp.recommendedMax} Tage
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {currentSchedule.violations.length > 0 && (
        <div className="p-4 neu-card bg-yellow-50">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 rounded-full neu-element bg-yellow-50 flex items-center justify-center mr-3">
              <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 text-yellow-600" />
            </div>
            <h3 className="text-sm font-medium text-yellow-800">Regelverstöße gefunden</h3>
          </div>
          <div className="space-y-1 ml-11">
            {currentSchedule.violations.map((violation, index) => (
              <p key={index} className="text-sm text-yellow-700">
                {violation.type === 'understaffed' && `${violation.date}: Unterbesetzung im ${violation.shift}dienst (${violation.assigned}/${violation.required})`}
                {violation.type === 'hours_mismatch' && `${violation.employeeName}: Stunden-Abweichung (${formatHours(violation.actual)} statt ${formatHours(violation.target)})`}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Mitarbeiter Statistiken */}
      <div className="p-6 neu-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mitarbeiter Statistiken</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full neu-element">
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
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wochenendtage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => {
                const stats = currentSchedule.employeeStats?.[employee.id] || { früh: 0, zwischen: 0, spät: 0, totalDays: 0 };
                const actualHours = currentSchedule.employeeHours?.[employee.id] || 0;
                const targetHours = currentSchedule.targetHours?.[employee.id] || 0;
                const weekendDays = currentSchedule.employeeWeekendShifts?.[employee.id] || 0;
                const maxWeekendDays = getWeekendLimit(employee);
                
                return (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 neu-element rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-700">
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900">{employee.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium neu-element-inset bg-blue-50 text-blue-700">
                        {stats.früh}x
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium neu-element-inset bg-green-50 text-green-700">
                        {stats.zwischen}x
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium neu-element-inset bg-purple-50 text-purple-700">
                        {stats.spät}x
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {stats.totalDays}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center text-sm ${getHoursStatusClass(actualHours, targetHours)}`}>
                      {formatHours(actualHours)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {formatHours(targetHours)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        weekendDays > maxWeekendDays 
                          ? 'bg-red-50 text-red-700' 
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {weekendDays} / {maxWeekendDays}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewMode === 'vertical' ? (
        <VerticalScheduleView schedule={currentSchedule} employees={employees} settings={state.settings} />
      ) : (
        <div className="neu-card overflow-hidden">
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
                  const isHoliday = state.settings.holidays?.some(h => h.date === dateStr);

                  return (
                    <tr key={dateStr} className={`
                      ${isWeekendDay ? 'bg-blue-50' : 'hover:bg-gray-50'}
                      ${isHoliday ? 'bg-orange-100' : ''}
                    `}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {format(day, 'dd.MM.yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(day, 'EEEE', { locale: de })}
                        </div>
                        {isHoliday && (
                          <span className="text-xs text-orange-600">
                            {state.settings.holidays.find(h => h.date === dateStr)?.name || 'Feiertag'}
                          </span>
                        )}
                      </td>
                      {['früh', 'zwischen', 'spät'].map((shift) => (
                        <td key={shift} className="px-4 py-3">
                          <div className="space-y-1">
                            {daySchedule[shift]?.map((employeeId) => (
                              <span key={employeeId} className={`inline-block px-2 py-1 text-xs font-medium rounded-lg neu-element-inset ${getShiftColor(shift)}`}>
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 neu-card">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full neu-element flex items-center justify-center mr-3">
              <SafeIcon icon={FiUsers} className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Statistiken</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between p-3 neu-element-inset rounded-lg">
              <span className="text-sm text-gray-600">Arbeitstage:</span>
              <span className="text-sm font-medium text-gray-900">{days.length}</span>
            </div>
            <div className="flex justify-between p-3 neu-element-inset rounded-lg">
              <span className="text-sm text-gray-600">Wochenenden:</span>
              <span className="text-sm font-medium text-gray-900">
                {days.filter(day => isWeekend(day)).length / 2} Wochenenden
              </span>
            </div>
            <div className="flex justify-between p-3 neu-element-inset rounded-lg">
              <span className="text-sm text-gray-600">Regelverstöße:</span>
              <span className={`text-sm font-medium ${currentSchedule.violations.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {currentSchedule.violations.length}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 neu-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Schichtverteilung</h3>
          <div className="space-y-2">
            {['früh', 'zwischen', 'spät'].map((shift) => (
              <div key={shift} className="flex items-center p-3 neu-element-inset rounded-lg">
                <div className={`w-6 h-6 rounded-full mr-3 ${getShiftColor(shift).split(' ')[0]} neu-element`}></div>
                <span className="text-sm text-gray-600 capitalize">{shift}dienst</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 neu-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Arbeitszeiten</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="p-3 neu-element-inset rounded-lg">
              Frühdienst: {state.settings.shifts.früh.start} - {state.settings.shifts.früh.end} ({state.settings.shifts.früh.hours}h {state.settings.shifts.früh.minutes}min)
            </div>
            <div className="p-3 neu-element-inset rounded-lg">
              Zwischendienst: {state.settings.shifts.zwischen.start} - {state.settings.shifts.zwischen.end} ({state.settings.shifts.zwischen.hours}h {state.settings.shifts.zwischen.minutes}min)
            </div>
            <div className="p-3 neu-element-inset rounded-lg">
              Spätdienst: {state.settings.shifts.spät.start} - {state.settings.shifts.spät.end} ({state.settings.shifts.spät.hours}h {state.settings.shifts.spät.minutes}min)
            </div>
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