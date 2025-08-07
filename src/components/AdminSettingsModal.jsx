import React, { useState, useEffect } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useSchedule } from '../context/ScheduleContext';
import WebhookService from '../utils/webhookService';

const { FiX, FiSave, FiPlus, FiTrash2 } = FiIcons;

function AdminSettingsModal({ onClose }) {
  const { state, dispatch } = useSchedule();
  const [webhooks, setWebhooks] = useState({
    schedule: state.settings.webhooks?.schedule || '',
    employees: state.settings.webhooks?.employees || ''
  });
  const [newHoliday, setNewHoliday] = useState({
    id: Date.now(),
    date: '',
    name: ''
  });
  
  useEffect(() => {
    // Load webhook URLs from database when component mounts
    const loadWebhooks = async () => {
      const scheduleUrl = await WebhookService.getWebhookUrl('schedule');
      const employeesUrl = await WebhookService.getWebhookUrl('employees');
      
      setWebhooks({
        schedule: scheduleUrl || state.settings.webhooks?.schedule || '',
        employees: employeesUrl || state.settings.webhooks?.employees || ''
      });
    };
    
    loadWebhooks();
  }, [state.settings.webhooks]);

  const handleSave = async () => {
    // Update webhooks in database
    await WebhookService.saveWebhookUrl('schedule', webhooks.schedule);
    await WebhookService.saveWebhookUrl('employees', webhooks.employees);
    
    // Update webhooks in application state
    dispatch({ type: 'UPDATE_WEBHOOKS', payload: webhooks });
    onClose();
  };

  const addHoliday = () => {
    if (!newHoliday.date) {
      alert('Bitte geben Sie ein Datum ein');
      return;
    }
    
    dispatch({
      type: 'ADD_HOLIDAY',
      payload: { ...newHoliday, id: Date.now() }
    });
    
    setNewHoliday({ id: Date.now(), date: '', name: '' });
  };

  const deleteHoliday = (id) => {
    dispatch({ type: 'DELETE_HOLIDAY', payload: id });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="neu-card bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Admin Einstellungen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full neu-button">
            <SafeIcon icon={FiX} className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Webhooks</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dienstplan Webhook URL
                </label>
                <input
                  type="text"
                  value={webhooks.schedule}
                  onChange={(e) => setWebhooks(prev => ({ ...prev, schedule: e.target.value }))}
                  className="neu-input w-full"
                  placeholder="https://example.com/webhook/schedule"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Wird beim Erstellen eines neuen Dienstplans ausgelöst
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mitarbeiterdaten Webhook URL
                </label>
                <input
                  type="text"
                  value={webhooks.employees}
                  onChange={(e) => setWebhooks(prev => ({ ...prev, employees: e.target.value }))}
                  className="neu-input w-full"
                  placeholder="https://example.com/webhook/employees"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Wird beim Speichern von Mitarbeiterdaten ausgelöst
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Feiertage</h3>
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                className="neu-input flex-1"
              />
              <input
                type="text"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                className="neu-input flex-1"
                placeholder="Name des Feiertags"
              />
              <button
                type="button"
                onClick={addHoliday}
                className="p-2 neu-button bg-orange-50 text-orange-700"
              >
                <SafeIcon icon={FiPlus} className="w-5 h-5" />
              </button>
            </div>

            <div className="neu-element-inset rounded-lg overflow-hidden">
              {state.settings.holidays && state.settings.holidays.length > 0 ? (
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Datum</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {state.settings.holidays.map(holiday => (
                      <tr key={holiday.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{holiday.date}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{holiday.name}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => deleteHoliday(holiday.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-sm text-gray-500 text-center">
                  Keine Feiertage definiert
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 neu-button text-gray-700"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 neu-button bg-orange-50 text-orange-700"
            >
              <SafeIcon icon={FiSave} className="w-4 h-4 mr-2 inline-block" />
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsModal;