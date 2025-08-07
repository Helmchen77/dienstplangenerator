import React, { useRef } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { de } from 'date-fns/locale';
import '../styles/neumorphism.css';

const { FiAlertTriangle, FiPrinter } = FiIcons;

function VerticalScheduleView({ schedule, employees, settings }) {
  const printRef = useRef();
  
  if (!schedule) return null;

  const monthDate = new Date(schedule.month + '-01');
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

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
      case 'früh': return 'bg-blue-50 text-blue-700';
      case 'zwischen': return 'bg-green-50 text-green-700';
      case 'spät': return 'bg-purple-50 text-purple-700';
      default: return 'bg-gray-50 text-gray-500';
    }
  };
  
  const handlePrint = () => {
    // Apply print-optimized styles
    const style = document.createElement('style');
    style.id = 'print-styles';
    style.innerHTML = `
      @page {
        size: A4 landscape;
        margin: 1cm;
      }
      @media print {
        body * {
          visibility: hidden;
        }
        #print-content, #print-content * {
          visibility: visible;
        }
        #print-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .neu-card, .neu-element, .neu-element-inset {
          box-shadow: none !important;
          border: 1px solid #eee;
        }
        
        /* Improved DIN A4 printing */
        table { 
          page-break-inside: auto;
          border-collapse: collapse;
        }
        tr { 
          page-break-inside: avoid;
          page-break-after: auto;
        }
        thead { 
          display: table-header-group;
        }
        tfoot { 
          display: table-footer-group;
        }
        
        /* Add page numbers */
        @page {
          @bottom-center {
            content: "Seite " counter(page) " von " counter(pages);
          }
          @top-center {
            content: "HelmPlanner - Dienstplan ${format(monthDate, 'MMMM yyyy', { locale: de })}";
          }
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

  // Check if a date is in the holidays list
  const isHoliday = (date) => {
    if (!settings.holidays || !settings.holidays.length) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    return settings.holidays.some(holiday => holiday.date === dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2 print:hidden">
        <h2 className="text-xl font-semibold text-gray-900">
          Dienstplan {format(monthDate, 'MMMM yyyy', { locale: de })}
        </h2>
        <button
          onClick={handlePrint}
          className="flex items-center px-4 py-2 neu-button bg-orange-50 text-orange-700"
        >
          <SafeIcon icon={FiPrinter} className="w-5 h-5 mr-2" />
          Drucken
        </button>
      </div>
      
      <div id="print-content" className="overflow-auto">
        <div className="print:hidden flex items-center justify-between mb-4">
          <div className="flex items-center">
            <img
              src="https://edef11.pcloud.com/DLZHMfcz0ZRytkxb7ZaQbVZXZXDFqVkZ3VZZ6s5ZZ1q5ZX0ZJ7ZoZWeoLxMXddxJugW1NaBs5s5KNMo7V/logo%20transparent.png"
              alt="HelmPlanner Logo"
              className="h-10 w-auto mr-3"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">HelmPlanner</h1>
              <p className="text-xs text-gray-500">SGM Dienstplangenerator</p>
            </div>
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
        
        <div className="relative overflow-x-auto">
          <table className="min-w-full neu-card border-collapse print:border print:border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 sticky left-0 bg-white neu-element z-10 min-w-[180px] top-0 print:border print:border-gray-300">
                  Mitarbeiter
                </th>
                {days.map(day => (
                  <th 
                    key={format(day, 'yyyy-MM-dd')} 
                    className={`px-3 py-2 text-center text-xs font-medium text-gray-700 min-w-[40px] sticky top-0 print:border print:border-gray-300 ${
                      isWeekend(day) ? 'bg-blue-50' : 'bg-white'
                    } ${isHoliday(day) ? 'bg-orange-100' : ''}`}
                  >
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
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white neu-element z-10 print:border print:border-gray-300">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <div className="w-8 h-8 neu-element flex items-center justify-center rounded-full">
                            <span className="text-sm font-medium text-orange-700">
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            {employee.name}
                          </span>
                        </div>
                        <div className="ml-11 mt-1">
                          <span className="text-xs text-gray-500">{employee.workload}%</span>
                        </div>
                      </div>
                    </td>
                    
                    {days.map(day => {
                      const shift = getEmployeeShiftForDay(employee.id, day);
                      const isWeekendDay = isWeekend(day);
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const isOnHoliday = isHoliday(day);
                      
                      // Check if employee is on sick leave for this day
                      const isOnSickLeave = employee.sickLeave && 
                                           employee.sickLeave.from && 
                                           employee.sickLeave.to && 
                                           dateStr >= employee.sickLeave.from && 
                                           dateStr <= employee.sickLeave.to;
                      
                      return (
                        <td 
                          key={dateStr}
                          className={`px-3 py-3 text-center print:border print:border-gray-300 ${isWeekendDay ? 'bg-blue-50' : ''} ${isOnHoliday ? 'bg-orange-100' : ''}`}
                        >
                          {isOnHoliday ? (
                            <div className="w-8 h-8 mx-auto rounded-full bg-orange-100 flex items-center justify-center neu-element-inset print:border print:border-orange-200">
                              <span className="text-orange-700 text-xs">F</span>
                            </div>
                          ) : isOnSickLeave ? (
                            <div className="w-8 h-8 mx-auto rounded-full bg-red-100 flex items-center justify-center neu-element-inset print:border print:border-red-200">
                              <span className="text-red-700 text-xs">K</span>
                            </div>
                          ) : shift ? (
                            <div className={`w-8 h-8 mx-auto rounded-full ${getShiftCellClass(shift)} flex items-center justify-center neu-element-inset print:border print:border-gray-300`}>
                              {getShiftCode(shift)}
                            </div>
                          ) : (
                            <div className="w-8 h-8 mx-auto rounded-full bg-gray-100 flex items-center justify-center neu-element-inset print:border print:border-gray-300">
                              -
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
                  HelmPlanner - SGM Dienstplangenerator | by Achim Helm | {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}
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
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center neu-element-inset text-blue-700">1</div>
            <span className="text-sm text-gray-700">Frühdienst ({settings.shifts.früh.start}-{settings.shifts.früh.end})</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center neu-element-inset text-green-700">2</div>
            <span className="text-sm text-gray-700">Zwischendienst ({settings.shifts.zwischen.start}-{settings.shifts.zwischen.end})</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center neu-element-inset text-purple-700">3</div>
            <span className="text-sm text-gray-700">Spätdienst ({settings.shifts.spät.start}-{settings.shifts.spät.end})</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center neu-element-inset text-red-700">K</div>
            <span className="text-sm text-gray-700">Krankheit</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerticalScheduleView;