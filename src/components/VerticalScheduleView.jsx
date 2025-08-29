import React, { useRef } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { de } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../styles/neumorphism.css';

const { FiAlertTriangle, FiPrinter, FiDownload } = FiIcons;

function VerticalScheduleView({ schedule, employees, settings }) {
  const printRef = useRef();

  if (!schedule) return null;

  const monthDate = new Date(schedule.month + '-01');
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const daysWithoutZwischendienst = schedule.daysWithoutZwischendienst || [];

  const getShiftCode = (shift) => {
    switch (shift) {
      case 'früh': return '1';
      case 'zwischen': return '2';
      case 'spät': return '3';
      default: return '-';
    }
  };

  const getEmployeeShiftForDay = (employeeId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySchedule = schedule.schedule[dateStr] || {};
    if (daySchedule.früh && daySchedule.früh.includes(employeeId)) {
      return 'früh';
    }
    if (daySchedule.zwischen && daySchedule.zwischen.includes(employeeId)) {
      return 'zwischen';
    }
    if (daySchedule.spät && daySchedule.spät.includes(employeeId)) {
      return 'spät';
    }
    return null;
  };

  const getShiftCellClass = (shift) => {
    switch (shift) {
      case 'früh': return 'bg-blue-500 text-white';
      case 'zwischen': return 'bg-green-500 text-white';
      case 'spät': return 'bg-purple-500 text-white';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const handlePrint = () => {
    // Apply print-optimized styles
    const style = document.createElement('style');
    style.id = 'print-styles';
    style.innerHTML = `
      @page { size: A4 portrait; margin: 0.5cm; }
      @media print {
        body * { visibility: hidden; }
        #print-content, #print-content * { visibility: visible; }
        #print-content { position: absolute; left: 0; top: 0; width: 100%; }
        .neu-card, .neu-element, .neu-element-inset { box-shadow: none !important; border: 1px solid #eee; }
        /* Improved DIN A4 printing */
        table { page-break-inside: auto; border-collapse: collapse; font-size: 6pt !important; }
        th, td { padding: 1px !important; }
        .w-8, .h-8 { width: 12px !important; height: 12px !important; min-width: 12px !important; min-height: 12px !important; }
        .text-sm, .text-xs, .text-xxs { font-size: 6pt !important; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        /* Add page numbers */
        @page {
          @bottom-center { content: "Seite " counter(page) " von " counter(pages); }
          @top-center { content: "Dienstplan ${format(monthDate, 'MMMM yyyy', { locale: de })}" }
        }
      }
    `;
    document.head.appendChild(style);

    // Print the document
    window.print();

    // Remove the print styles after printing
    setTimeout(() => {
      const printStyle = document.getElementById('print-styles');
      if (printStyle) {
        printStyle.remove();
      }
    }, 1000);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('print-content');
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const imgWidth = 210; // A4 portrait width
      const pageHeight = 297; // A4 portrait height
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

      pdf.save(`Dienstplan_${format(monthDate, 'yyyy-MM', { locale: de })}_Vertikal.pdf`);
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      alert('Fehler beim Erstellen der PDF-Datei');
    }
  };

  // Check if a date is in the holidays list
  const isHoliday = (date) => {
    if (!settings.holidays || !settings.holidays.length) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    return settings.holidays.some(holiday => holiday.date === dateStr);
  };

  // Get the main explanation reason for the schedule issues
  const getMainExplanationReason = () => {
    const explanations = schedule.explanations || [];
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

  const mainReason = getMainExplanationReason();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2 print:hidden">
        <h2 className="text-xl font-semibold text-gray-900">
          Dienstplan {format(monthDate, 'MMMM yyyy', { locale: de })}
        </h2>
        <div className="flex space-x-3">
          <button onClick={handleDownloadPDF} className="flex items-center px-4 py-2 neu-button bg-primary-50 text-primary-700">
            <SafeIcon icon={FiDownload} className="w-5 h-5 mr-2" />
            PDF herunterladen
          </button>
          <button onClick={handlePrint} className="flex items-center px-4 py-2 neu-button bg-orange-50 text-orange-700">
            <SafeIcon icon={FiPrinter} className="w-5 h-5 mr-2" />
            Drucken
          </button>
        </div>
      </div>

      <div id="print-content" className="overflow-auto" ref={printRef}>
        <div className="print:hidden flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dienstplan</h1>
            <p className="text-xs text-gray-500">SGM Dienstplangenerator</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">
              Dienstplan {format(monthDate, 'MMMM yyyy', { locale: de })}
            </p>
            <p className="text-xs text-gray-500">
              Erstellt am {format(new Date(), 'dd.MM.yyyy', { locale: de })}
            </p>
          </div>
        </div>

        {mainReason && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg print:hidden">
            <p className="text-sm text-orange-800">
              <strong>Warum der Plan nicht optimal erstellt werden konnte:</strong> {mainReason}
            </p>
          </div>
        )}

        <div className="relative overflow-x-auto">
          <table className="min-w-full neu-card border-collapse print:border print:border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 sticky left-0 bg-white neu-element z-10 min-w-[120px] top-0 print:border print:border-gray-300">
                  Mitarbeiter
                </th>
                {days.map(day => (
                  <th key={format(day, 'yyyy-MM-dd')} className={`px-1 py-1 text-center text-xxs font-medium text-gray-700 min-w-[24px] sticky top-0 print:border print:border-gray-300 ${isWeekend(day) ? 'bg-blue-50' : 'bg-white'} ${isHoliday(day) ? 'bg-orange-100' : ''}`}>
                    <div>{format(day, 'dd')}</div>
                    <div className="text-xxs">{format(day, 'EE', { locale: de })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => {
                const stats = schedule.employeeStats?.[employee.id] || { früh: 0, zwischen: 0, spät: 0, totalDays: 0 };
                return (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap sticky left-0 bg-white neu-element z-10 print:border print:border-gray-300">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <div className="w-6 h-6 neu-element flex items-center justify-center rounded-full">
                            <span className="text-xs font-medium text-orange-700">
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="ml-2 text-xs font-medium text-gray-900">
                            {employee.name}
                          </span>
                        </div>
                        <div className="ml-8 mt-1">
                          <span className="text-xxs text-gray-500">{employee.workload}%</span>
                        </div>
                      </div>
                    </td>
                    {days.map(day => {
                      const shift = getEmployeeShiftForDay(employee.id, day);
                      const isWeekendDay = isWeekend(day);
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const isOnHoliday = isHoliday(day);
                      const isZwischendienstOmitted = daysWithoutZwischendienst.includes(dateStr);

                      // Check if employee is on sick leave for this day
                      const isOnSickLeave = employee.sickLeave && employee.sickLeave.from && employee.sickLeave.to && 
                                          dateStr >= employee.sickLeave.from && dateStr <= employee.sickLeave.to;
                      
                      // Check if employee is on vacation for this day
                      const isOnVacation = employee.vacation && employee.vacation.from && employee.vacation.to && 
                                         dateStr >= employee.vacation.from && dateStr <= employee.vacation.to;

                      return (
                        <td key={dateStr} className={`px-1 py-1 text-center print:border print:border-gray-300 ${isWeekendDay ? 'bg-blue-50' : ''} ${isOnHoliday ? 'bg-orange-100' : ''}`}>
                          {isOnSickLeave ? (
                            <div className="w-6 h-6 mx-auto rounded-full bg-red-100 flex items-center justify-center neu-element-inset print:border print:border-red-200">
                              <span className="text-red-700 text-xxs font-bold">K</span>
                            </div>
                          ) : isOnVacation ? (
                            <div className="w-6 h-6 mx-auto rounded-full bg-blue-100 flex items-center justify-center neu-element-inset print:border print:border-blue-200">
                              <span className="text-blue-700 text-xxs font-bold">U</span>
                            </div>
                          ) : shift ? (
                            <div className={`w-6 h-6 mx-auto rounded-full ${getShiftCellClass(shift)} flex items-center justify-center neu-element-inset print:border print:border-gray-300 shadow-md`}>
                              <span className="font-bold text-xs">{getShiftCode(shift)}</span>
                            </div>
                          ) : (
                            <div className="w-6 h-6 mx-auto rounded-full bg-gray-100 flex items-center justify-center neu-element-inset print:border print:border-gray-300">
                              {isOnHoliday ? <span className="text-orange-700 text-xxs font-bold">F</span> : <span className="text-gray-400">-</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="print:visible print:table-header-group hidden">
              <tr>
                <td colSpan={days.length + 1} className="px-4 py-3 text-xs text-center text-gray-500">
                  Dienstplan | {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 neu-card print:mt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Legende</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center neu-element-inset text-white font-bold">1</div>
            <span className="text-sm text-gray-700">Frühdienst ({settings.shifts.früh.start}-{settings.shifts.früh.end})</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center neu-element-inset text-white font-bold">2</div>
            <span className="text-sm text-gray-700">Zwischendienst ({settings.shifts.zwischen.start}-{settings.shifts.zwischen.end})</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center neu-element-inset text-white font-bold">3</div>
            <span className="text-sm text-gray-700">Spätdienst ({settings.shifts.spät.start}-{settings.shifts.spät.end})</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center neu-element-inset text-red-700 font-bold">K</div>
            <span className="text-sm text-gray-700">Krankheit</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center neu-element-inset text-blue-700 font-bold">U</div>
            <span className="text-sm text-gray-700">Urlaub/Ferien</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center neu-element-inset text-orange-700 font-bold">F</div>
            <span className="text-sm text-gray-700">Feiertag</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerticalScheduleView;