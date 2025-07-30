import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { de } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const { FiX, FiDownload, FiPrinter } = FiIcons;

function SchedulePDF({ schedule, employees, settings, onClose }) {
  const monthDate = new Date(schedule.month + '-01');
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unbekannt';
  };

  const formatHours = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0 ? `${wholeHours}h ${minutes}min` : `${wholeHours}h`;
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('schedule-pdf-content');
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 297; // A4 landscape width
      const pageHeight = 210; // A4 landscape height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Dienstplan_${format(monthDate, 'yyyy-MM', { locale: de })}.pdf`);
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      alert('Fehler beim Erstellen der PDF-Datei');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">PDF Vorschau</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <SafeIcon icon={FiPrinter} className="w-4 h-4 mr-2" />
              Drucken
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <SafeIcon icon={FiDownload} className="w-4 h-4 mr-2" />
              PDF herunterladen
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div id="schedule-pdf-content" className="p-8 bg-white">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dienstplan</h1>
            <h2 className="text-xl text-gray-600">
              {format(monthDate, 'MMMM yyyy', { locale: de })}
            </h2>
          </div>

          {/* Mitarbeiter Statistiken */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mitarbeiter Statistiken</h3>
            <table className="min-w-full border-collapse border border-gray-300 mb-6">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">Früh</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">Zwischen</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">Spät</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">Tage</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">Ist-Stunden</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">Soll-Stunden</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const stats = schedule.employeeStats?.[employee.id] || { früh: 0, zwischen: 0, spät: 0, totalDays: 0 };
                  const actualHours = schedule.employeeHours?.[employee.id] || 0;
                  const targetHours = schedule.targetHours?.[employee.id] || 0;
                  
                  return (
                    <tr key={employee.id}>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{employee.name}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-900">{stats.früh}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-900">{stats.zwischen}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-900">{stats.spät}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-900">{stats.totalDays}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-900">{formatHours(actualHours)}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-900">{formatHours(targetHours)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                    Datum
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                    Frühdienst<br />
                    <span className="font-normal text-xs">({settings.shifts.früh.start}-{settings.shifts.früh.end})</span>
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                    Zwischendienst<br />
                    <span className="font-normal text-xs">({settings.shifts.zwischen.start}-{settings.shifts.zwischen.end})</span>
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                    Spätdienst<br />
                    <span className="font-normal text-xs">({settings.shifts.spät.start}-{settings.shifts.spät.end})</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const daySchedule = schedule.schedule[dateStr] || {};
                  const isWeekendDay = isWeekend(day);
                  
                  return (
                    <tr key={dateStr} className={isWeekendDay ? 'bg-blue-50' : ''}>
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="text-sm font-medium text-gray-900">
                          {format(day, 'dd.MM.yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(day, 'EEEE', { locale: de })}
                        </div>
                      </td>
                      {['früh', 'zwischen', 'spät'].map((shift) => (
                        <td key={shift} className="border border-gray-300 px-3 py-2">
                          <div className="space-y-1">
                            {daySchedule[shift]?.map((employeeId) => (
                              <div key={employeeId} className="text-sm text-gray-900">
                                {getEmployeeName(employeeId)}
                              </div>
                            )) || (
                              <span className="text-xs text-gray-400">-</span>
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

          <div className="mt-8 grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Legende</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• Frühdienst: {settings.shifts.früh.start} - {settings.shifts.früh.end} 
                  ({settings.shifts.früh.hours}h {settings.shifts.früh.minutes}min)</div>
                <div>• Zwischendienst: {settings.shifts.zwischen.start} - {settings.shifts.zwischen.end} 
                  ({settings.shifts.zwischen.hours}h {settings.shifts.zwischen.minutes}min)</div>
                <div>• Spätdienst: {settings.shifts.spät.start} - {settings.shifts.spät.end} 
                  ({settings.shifts.spät.hours}h {settings.shifts.spät.minutes}min)</div>
                <div>• Wochenenden sind blau markiert</div>
                <div>• Max. aufeinanderfolgende Tage: {settings.rules.maxConsecutiveDays}</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiken</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>Gesamt Arbeitstage: {days.length}</div>
                <div>Wochenenden: {days.filter(day => isWeekend(day)).length}</div>
                <div>Regelverstöße: {schedule.violations.length}</div>
                <div>Erstellt am: {format(new Date(schedule.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}</div>
              </div>
            </div>
          </div>

          {schedule.violations.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hinweise</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="space-y-1">
                  {schedule.violations.map((violation, index) => (
                    <p key={index} className="text-sm text-yellow-700">
                      • {violation.type === 'understaffed' && 
                        `${violation.date}: Unterbesetzung im ${violation.shift}dienst (${violation.assigned}/${violation.required})`}
                      {violation.type === 'hours_mismatch' && 
                        `${violation.employeeName}: Stunden-Abweichung (${formatHours(violation.actual)} statt ${formatHours(violation.target)})`}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SchedulePDF;