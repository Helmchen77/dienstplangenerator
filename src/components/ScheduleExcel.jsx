import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { de } from 'date-fns/locale';

const { FiX, FiDownload } = FiIcons;

function ScheduleExcel({ schedule, employees, settings, onClose }) {
  const monthDate = new Date(schedule.month + '-01');
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const daysWithoutZwischendienst = schedule.daysWithoutZwischendienst || [];
  const explanations = schedule.explanations || [];

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unbekannt';
  };

  const formatHours = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0 ? `${wholeHours}h ${minutes}min` : `${wholeHours}h`;
  };

  // Get the main explanation reason for the schedule issues
  const getMainExplanationReason = () => {
    if (!explanations || explanations.length === 0) return null;
    
    // Check for staff shortage
    const staffingShortage = explanations.find(exp => exp.type === 'staffing_shortage');
    if (staffingShortage) {
      return "Zu wenig Gesamtressourcen";
    }
    
    // Check for many free preferences
    const tooManyFreeWishes = explanations.find(exp => exp.type === 'many_free_preferences');
    if (tooManyFreeWishes) {
      return "Zu viele Freiwünsche";
    }
    
    // Check for sick leaves
    const highSickLeave = explanations.find(exp => exp.type === 'high_sick_leave');
    if (highSickLeave) {
      return "Zu viele Krankheitstage";
    }
    
    // Check for skill shortage
    const skillShortage = explanations.find(exp => exp.type === 'skill_shortage');
    if (skillShortage) {
      return "Mangel an Qualifikationen";
    }
    
    // Check for weekend constraints
    const weekendConstraint = explanations.find(exp => exp.type === 'weekend_constraint');
    if (weekendConstraint) {
      return "Zu strikte Wochenendregeln";
    }
    
    return "Mehrere Einschränkungen";
  };
  
  // Call the function to get the main reason
  const mainReason = getMainExplanationReason();

  const handleDownloadExcel = () => {
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header
    csvContent += `Dienstplan - ${format(monthDate, 'MMMM yyyy', { locale: de })}\n\n`;
    
    // Main explanation reason
    if (mainReason) {
      csvContent += `Warum der Plan nicht optimal erstellt werden konnte: ${mainReason}\n\n`;
    }
    
    // Schedule table
    csvContent += "Datum,Wochentag,Frühdienst,Zwischendienst,Spätdienst\n";
    days.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const daySchedule = schedule.schedule[dateStr] || {};
      const isWeekendDay = isWeekend(day);
      const isZwischendienstOmitted = daysWithoutZwischendienst.includes(dateStr);
      
      const frühNames = daySchedule.früh?.map(id => getEmployeeName(id)).join(';') || '-';
      const zwischenNames = isZwischendienstOmitted ? 'Entfällt' : (daySchedule.zwischen?.map(id => getEmployeeName(id)).join(';') || '-');
      const spätNames = daySchedule.spät?.map(id => getEmployeeName(id)).join(';') || '-';
      
      csvContent += `${format(day, 'dd.MM.yyyy')},${format(day, 'EEEE', { locale: de })},${frühNames},${zwischenNames},${spätNames}\n`;
    });
    
    // Employee statistics
    csvContent += "\n\nMitarbeiter Statistiken\n";
    csvContent += "Name,Frühdienst,Zwischendienst,Spätdienst,Gesamt Tage,Gesamtstunden,Soll-Stunden,Pensum\n";
    
    employees.forEach((employee) => {
      const stats = schedule.employeeStats?.[employee.id] || { früh: 0, zwischen: 0, spät: 0, totalDays: 0 };
      const actualHours = schedule.employeeHours?.[employee.id] || 0;
      const targetHours = schedule.targetHours?.[employee.id] || 0;
      
      csvContent += `${employee.name},${stats.früh},${stats.zwischen},${stats.spät},${stats.totalDays},${formatHours(actualHours)},${formatHours(targetHours)},${employee.workload}%\n`;
    });
    
    // Violations
    if (schedule.violations.length > 0) {
      csvContent += "\n\nRegelabweichungen\n";
      csvContent += "Typ,Details\n";
      
      schedule.violations.forEach((violation) => {
        if (violation.type === 'understaffed') {
          const shiftName = violation.shift.charAt(0).toUpperCase() + violation.shift.slice(1);
          csvContent += `Unterbesetzung,"${violation.date}: ${shiftName}dienst (${violation.assigned}/${violation.required})"\n`;
        }
        
        if (violation.type === 'hours_mismatch') {
          csvContent += `Stunden-Abweichung,"${violation.employeeName}: ${formatHours(violation.actual)} statt ${formatHours(violation.target)}"\n`;
        }
      });
    }
    
    // Days without Zwischendienst
    if (daysWithoutZwischendienst.length > 0) {
      csvContent += "\n\nTage ohne Zwischendienst\n";
      csvContent += "Datum\n";
      
      daysWithoutZwischendienst.forEach(dateStr => {
        const date = new Date(dateStr);
        csvContent += `${format(date, 'dd.MM.yyyy')},${format(date, 'EEEE', { locale: de })}\n`;
      });
    }
    
    // Detailed explanations
    if (explanations && explanations.length > 0) {
      csvContent += "\n\nDetaillierte Erklärungen\n";
      
      explanations.forEach(explanation => {
        csvContent += `${explanation.message}\n`;
      });
    }
    
    // Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dienstplan_${format(monthDate, 'yyyy-MM', { locale: de })}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Excel Export</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <SafeIcon icon={FiX} className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiDownload} className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Excel-Export bereit</h3>
            <p className="text-gray-600 mb-6">
              Der Dienstplan wird als CSV-Datei exportiert, die in Excel geöffnet werden kann.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Export enthält:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Vollständiger Monatsplan</li>
                <li>• Mitarbeiter-Statistiken</li>
                <li>• Arbeitszeiten pro Mitarbeiter</li>
                <li>• Schichtverteilung</li>
                <li>• Regelabweichungen (falls vorhanden)</li>
                <li>• Berücksichtigung der Arbeitspensen</li>
                {mainReason && (
                  <li>• Begründung warum der Plan nicht optimal erstellt werden konnte</li>
                )}
                {daysWithoutZwischendienst.length > 0 && (
                  <li>• Tage ohne Zwischendienst</li>
                )}
              </ul>
            </div>
            
            <button
              onClick={handleDownloadExcel}
              className="flex items-center justify-center w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mb-3"
            >
              <SafeIcon icon={FiDownload} className="w-5 h-5 mr-2" />
              CSV-Datei herunterladen
            </button>
            <p className="text-xs text-gray-500">
              Die CSV-Datei kann in Excel, Google Sheets oder anderen Tabellenkalkulationsprogrammen geöffnet werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScheduleExcel;