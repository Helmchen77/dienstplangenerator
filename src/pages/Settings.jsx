import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useSchedule } from '../context/ScheduleContext';
import DatabaseService from '../utils/databaseService';
import '../styles/neumorphism.css';

const { FiSave, FiClock, FiUsers, FiSettings, FiCalendar } = FiIcons;

function Settings() {
  const { state, dispatch } = useSchedule();
  const [settings, setSettings] = useState(state.settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save settings to database
      await DatabaseService.saveSettings(settings);
      
      // Update local state
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      alert('Einstellungen gespeichert!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Fehler beim Speichern der Einstellungen!');
    } finally {
      setIsSaving(false);
    }
  };

  const updateShift = (shiftType, field, value) => {
    setSettings(prev => ({
      ...prev,
      shifts: {
        ...prev.shifts,
        [shiftType]: {
          ...prev.shifts[shiftType],
          [field]: field === 'hours' || field === 'minutes' ? parseInt(value) || 0 : value
        }
      }
    }));
  };

  const updateMinStaffing = (dayType, shift, value) => {
    setSettings(prev => ({
      ...prev,
      minStaffing: {
        ...prev.minStaffing,
        [dayType]: {
          ...prev.minStaffing[dayType],
          [shift]: parseInt(value) || 0
        }
      }
    }));
  };

  const updateRule = (rule, value) => {
    setSettings(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [rule]: typeof prev.rules[rule] === 'boolean' ? value : parseInt(value) || 0
      }
    }));
  };

  const updateWeekendRule = (type, value) => {
    setSettings(prev => ({
      ...prev,
      weekendRules: {
        ...prev.weekendRules,
        [type]: parseInt(value) || 0
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
        <p className="mt-2 text-gray-600">Konfiguration der Schichtzeiten und Besetzungsregeln</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 neu-card">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full neu-element flex items-center justify-center mr-3">
              <SafeIcon icon={FiClock} className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Schichtzeiten</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(settings.shifts).map(([shiftType, shift]) => (
              <div key={shiftType} className="p-4 neu-element rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3 capitalize">
                  {shiftType}dienst
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Beginn
                    </label>
                    <input
                      type="time"
                      value={shift.start}
                      onChange={(e) => updateShift(shiftType, 'start', e.target.value)}
                      className="w-full neu-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Ende
                    </label>
                    <input
                      type="time"
                      value={shift.end}
                      onChange={(e) => updateShift(shiftType, 'end', e.target.value)}
                      className="w-full neu-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Stunden
                    </label>
                    <input
                      type="number"
                      value={shift.hours}
                      onChange={(e) => updateShift(shiftType, 'hours', e.target.value)}
                      className="w-full neu-input"
                      min="0"
                      max="24"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Minuten
                    </label>
                    <input
                      type="number"
                      value={shift.minutes}
                      onChange={(e) => updateShift(shiftType, 'minutes', e.target.value)}
                      className="w-full neu-input"
                      min="0"
                      max="59"
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Gesamtdauer: {shift.hours}h {shift.minutes}min
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 neu-card">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full neu-element flex items-center justify-center mr-3">
              <SafeIcon icon={FiUsers} className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Mindestbesetzung</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 neu-element rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Werktage</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(settings.minStaffing.weekday).map(([shift, count]) => (
                  <div key={shift}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                      {shift}
                    </label>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => updateMinStaffing('weekday', shift, e.target.value)}
                      className="w-full neu-input"
                      min="0"
                      max="10"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 neu-element rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Wochenende</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(settings.minStaffing.weekend).map(([shift, count]) => (
                  <div key={shift}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                      {shift}
                    </label>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => updateMinStaffing('weekend', shift, e.target.value)}
                      className="w-full neu-input"
                      min="0"
                      max="10"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 neu-card">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full neu-element flex items-center justify-center mr-3">
            <SafeIcon icon={FiCalendar} className="w-5 h-5 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Wochenendregeln</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 neu-element rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Mitarbeiter mit Pensum bis 50%</h4>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Maximale Anzahl Wochenenden pro Monat
              </label>
              <input
                type="number"
                value={settings.weekendRules?.under50 || 1}
                onChange={(e) => updateWeekendRule('under50', e.target.value)}
                className="w-full neu-input"
                min="0"
                max="5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Die Anzahl der Wochenenden, die Mitarbeiter mit einem Pensum von bis zu 50% pro Monat arbeiten können.
              </p>
            </div>
          </div>
          <div className="p-4 neu-element rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Mitarbeiter mit Pensum über 50%</h4>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Maximale Anzahl Wochenenden pro Monat
              </label>
              <input
                type="number"
                value={settings.weekendRules?.over50 || 2}
                onChange={(e) => updateWeekendRule('over50', e.target.value)}
                className="w-full neu-input"
                min="0"
                max="5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Die Anzahl der Wochenenden, die Mitarbeiter mit einem Pensum von über 50% pro Monat arbeiten können.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 neu-card">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full neu-element flex items-center justify-center mr-3">
            <SafeIcon icon={FiSettings} className="w-5 h-5 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Planungsregeln</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min. freie Tage zwischen Dienstblöcken
              </label>
              <input
                type="number"
                value={settings.rules.minDaysOffBetweenBlocks}
                onChange={(e) => updateRule('minDaysOffBetweenBlocks', e.target.value)}
                className="w-full neu-input"
                min="0"
                max="7"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min. Ruhezeit (Stunden)
              </label>
              <input
                type="number"
                value={settings.rules.minRestHours}
                onChange={(e) => updateRule('minRestHours', e.target.value)}
                className="w-full neu-input"
                min="8"
                max="24"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max. Arbeitszeit pro Tag (Stunden)
              </label>
              <input
                type="number"
                value={settings.rules.maxHoursPerDay}
                onChange={(e) => updateRule('maxHoursPerDay', e.target.value)}
                className="w-full neu-input"
                min="4"
                max="24"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max. Arbeitszeit pro Woche (Stunden)
              </label>
              <input
                type="number"
                value={settings.rules.maxHoursPerWeek}
                onChange={(e) => updateRule('maxHoursPerWeek', e.target.value)}
                className="w-full neu-input"
                min="10"
                max="60"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stunden-Toleranz
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    value={settings.rules.hoursTolerance}
                    onChange={(e) => updateRule('hoursTolerance', e.target.value)}
                    className="w-full neu-input"
                    min="0"
                    max="20"
                  />
                  <span className="text-xs text-gray-500">Stunden</span>
                </div>
                <div>
                  <input
                    type="number"
                    value={settings.rules.minutesTolerance}
                    onChange={(e) => updateRule('minutesTolerance', e.target.value)}
                    className="w-full neu-input"
                    min="0"
                    max="59"
                  />
                  <span className="text-xs text-gray-500">Minuten</span>
                </div>
              </div>
            </div>
            <div className="flex items-center p-4 neu-element rounded-lg">
              <input
                type="checkbox"
                id="noEarlyAfterLate"
                checked={settings.rules.noEarlyAfterLate}
                onChange={(e) => updateRule('noEarlyAfterLate', e.target.checked)}
                className="hidden"
              />
              <div
                className={`neu-toggle ${settings.rules.noEarlyAfterLate ? 'active' : ''}`}
                onClick={() => updateRule('noEarlyAfterLate', !settings.rules.noEarlyAfterLate)}
              >
                <div className="neu-toggle-switch"></div>
              </div>
              <label htmlFor="noEarlyAfterLate" className="ml-3 text-sm text-gray-700">
                Kein Frühdienst nach Spätdienst
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center px-6 py-3 neu-button bg-orange-50 text-orange-700"
        >
          <SafeIcon icon={isSaving ? FiClock : FiSave} className={`w-5 h-5 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
          {isSaving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
        </button>
      </div>
    </div>
  );
}

export default Settings;