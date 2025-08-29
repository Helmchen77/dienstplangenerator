import React, { useState, useEffect } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useSchedule } from '../context/ScheduleContext';
import EmployeeForm from '../components/EmployeeForm';
import DatabaseService from '../utils/databaseService';
import '../styles/neumorphism.css';

const { FiPlus, FiEdit2, FiTrash2, FiUser, FiCalendar, FiClock, FiLoader } = FiIcons;

function EmployeeManagement() {
  const { state, dispatch } = useSchedule();
  const { employees, loading } = state;
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAddEmployee = async (employeeData) => {
    setIsProcessing(true);
    try {
      const savedEmployee = await DatabaseService.saveEmployee(employeeData);
      dispatch({ type: 'ADD_EMPLOYEE', payload: savedEmployee });
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setIsProcessing(false);
      setShowForm(false);
    }
  };

  const handleEditEmployee = async (employeeData) => {
    setIsProcessing(true);
    try {
      const updatedEmployee = await DatabaseService.saveEmployee(employeeData);
      dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
    } catch (error) {
      console.error('Error updating employee:', error);
    } finally {
      setIsProcessing(false);
      setEditingEmployee(null);
      setShowForm(false);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (confirm('Möchten Sie diesen Mitarbeiter wirklich löschen?')) {
      setIsProcessing(true);
      try {
        await DatabaseService.deleteEmployee(employeeId);
        dispatch({ type: 'DELETE_EMPLOYEE', payload: employeeId });
      } catch (error) {
        console.error('Error deleting employee:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const startEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  // Helper function to format available days using German day abbreviations
  const formatAvailableDays = (availableDays) => {
    if (!availableDays) return 'Alle Tage';
    
    // Map to German abbreviations: M,D,M,D,F,S,S
    const dayMapping = {
      'monday': 'M',
      'tuesday': 'D', 
      'wednesday': 'M', 
      'thursday': 'D', 
      'friday': 'F', 
      'saturday': 'S', 
      'sunday': 'S'
    };
    
    const availableDaysArray = Object.entries(availableDays)
      .filter(([_, value]) => value)
      .map(([day]) => dayMapping[day]);
    
    return availableDaysArray.join(',') || 'Keine Tage';
  };

  // Function to count sick days for an employee
  const countSickDays = (employee) => {
    if (!employee.sickLeave || !employee.sickLeave.from || !employee.sickLeave.to) {
      return 0;
    }
    
    const fromDate = new Date(employee.sickLeave.from);
    const toDate = new Date(employee.sickLeave.to);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return 0;
    }
    
    // Calculate days between the two dates (inclusive)
    const diffTime = Math.abs(toDate - fromDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Function to count vacation days for an employee
  const countVacationDays = (employee) => {
    if (!employee.vacation || !employee.vacation.from || !employee.vacation.to) {
      return 0;
    }
    
    const fromDate = new Date(employee.vacation.from);
    const toDate = new Date(employee.vacation.to);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return 0;
    }
    
    // Calculate days between the two dates (inclusive)
    const diffTime = Math.abs(toDate - fromDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Function to check if an employee is currently on vacation or sick leave
  const getEmployeeStatus = (employee) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Check sick leave
    if (employee.sickLeave && employee.sickLeave.from && employee.sickLeave.to) {
      if (todayStr >= employee.sickLeave.from && todayStr <= employee.sickLeave.to) {
        return { status: 'sick', until: employee.sickLeave.to };
      }
    }
    
    // Check vacation
    if (employee.vacation && employee.vacation.from && employee.vacation.to) {
      if (todayStr >= employee.vacation.from && todayStr <= employee.vacation.to) {
        return { status: 'vacation', until: employee.vacation.to };
      }
    }
    
    return { status: 'active' };
  };

  if (loading || isProcessing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <SafeIcon icon={FiLoader} className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="text-lg text-gray-700">Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mitarbeiter Verwaltung</h1>
          <p className="mt-2 text-gray-600">Verwalten Sie Ihr Team und deren Arbeitszeiten</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 neu-button bg-primary-50 text-primary-700"
        >
          <SafeIcon icon={FiPlus} className="w-5 h-5 mr-2" />
          Mitarbeiter hinzufügen
        </button>
      </div>

      <div className="neu-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Team Übersicht</h3>
        </div>
        {employees.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full neu-element flex items-center justify-center">
              <SafeIcon icon={FiUser} className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Mitarbeiter</h3>
            <p className="text-gray-500 mb-4">Fügen Sie Ihren ersten Mitarbeiter hinzu</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 neu-button bg-primary-50 text-primary-700"
            >
              <SafeIcon icon={FiPlus} className="w-4 h-4 mr-2" />
              Mitarbeiter hinzufügen
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arbeitspensum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max. Tage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verfügbare Tage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qualifikationen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => {
                  const status = getEmployeeStatus(employee);
                  const wishCount = employee.preferences?.length || 0;
                  const sickDays = countSickDays(employee);
                  const vacationDays = countVacationDays(employee);
                  
                  return (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 neu-element rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700">
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium neu-element-inset bg-blue-50 text-blue-700">
                          {employee.workload}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <SafeIcon icon={FiClock} className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{employee.maxConsecutiveDays || 4}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <SafeIcon icon={FiCalendar} className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{formatAvailableDays(employee.availableDays)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {employee.skills.map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium neu-element-inset bg-green-50 text-green-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {wishCount > 0 && (
                            <span className="neu-element-inset px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs">
                              {wishCount} Wünsche
                            </span>
                          )}
                          {vacationDays > 0 && (
                            <span className="neu-element-inset px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                              {vacationDays} Ferientage
                            </span>
                          )}
                          {sickDays > 0 && (
                            <span className="neu-element-inset px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs">
                              {sickDays} Krankheitstage
                            </span>
                          )}
                          {status.status === 'sick' && (
                            <span className="neu-element-inset px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs">
                              Krank bis {new Date(status.until).toLocaleDateString('de-DE')}
                            </span>
                          )}
                          {status.status === 'vacation' && (
                            <span className="neu-element-inset px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                              Ferien bis {new Date(status.until).toLocaleDateString('de-DE')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => startEdit(employee)}
                            className="text-primary-600 hover:text-primary-900 p-2 neu-button"
                            aria-label="Bearbeiten"
                          >
                            <SafeIcon icon={FiEdit2} className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="text-red-600 hover:text-red-900 p-2 neu-button"
                            aria-label="Löschen"
                          >
                            <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={editingEmployee ? handleEditEmployee : handleAddEmployee}
          onCancel={() => {
            setShowForm(false);
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}

export default EmployeeManagement;