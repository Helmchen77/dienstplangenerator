import React, { createContext, useContext, useReducer, useEffect } from 'react';

const ScheduleContext = createContext();

const initialState = {
  employees: [
    {
      id: 1,
      name: 'Anna Müller',
      workload: 100,
      preferences: [],
      skills: ['früh', 'zwischen', 'spät'],
      maxConsecutiveDays: 4,
      sickLeave: { from: '', to: '' },
      availableDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true
      }
    },
    {
      id: 2,
      name: 'Thomas Schmidt',
      workload: 80,
      preferences: [],
      skills: ['früh', 'zwischen', 'spät'],
      maxConsecutiveDays: 3,
      sickLeave: { from: '', to: '' },
      availableDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      }
    },
    {
      id: 3,
      name: 'Lisa Weber',
      workload: 60,
      preferences: [],
      skills: ['zwischen', 'spät'],
      maxConsecutiveDays: 3,
      sickLeave: { from: '', to: '' },
      availableDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: false
      }
    }
  ],
  schedules: [],
  currentSchedule: null,
  viewMode: 'horizontal',
  settings: {
    shifts: {
      früh: { start: '07:00', end: '15:54', hours: 8, minutes: 24 },
      zwischen: { start: '10:00', end: '18:54', hours: 8, minutes: 24 },
      spät: { start: '12:45', end: '21:39', hours: 8, minutes: 54 }
    },
    minStaffing: {
      weekday: { früh: 2, zwischen: 3, spät: 2 },
      weekend: { früh: 1, zwischen: 2, spät: 1 }
    },
    rules: {
      minRestHours: 11,
      noEarlyAfterLate: true,
      maxHoursPerDay: 12,
      maxHoursPerWeek: 48,
      hoursTolerance: 8,
      minutesTolerance: 0,
      minDaysOffBetweenBlocks: 2
    },
    webhooks: {
      schedule: '',
      employees: ''
    },
    holidays: []
  }
};

function scheduleReducer(state, action) {
  switch (action.type) {
    case 'ADD_EMPLOYEE':
      return {
        ...state,
        employees: [...state.employees, { 
          ...action.payload, 
          id: Date.now(),
          maxConsecutiveDays: action.payload.maxConsecutiveDays || 4,
          sickLeave: action.payload.sickLeave || { from: '', to: '' },
          availableDays: action.payload.availableDays || {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: true
          }
        }]
      };
    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map(emp => 
          emp.id === action.payload.id ? { ...emp, ...action.payload } : emp
        )
      };
    case 'DELETE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.filter(emp => emp.id !== action.payload)
      };
    case 'SET_CURRENT_SCHEDULE':
      return {
        ...state,
        currentSchedule: action.payload
      };
    case 'ADD_SCHEDULE':
      // Keep only the last 50 schedules
      const newSchedules = [...state.schedules, action.payload]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);
      
      return {
        ...state,
        schedules: newSchedules,
        currentSchedule: action.payload
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    case 'UPDATE_WEBHOOKS':
      return {
        ...state,
        settings: { 
          ...state.settings, 
          webhooks: { ...state.settings.webhooks, ...action.payload } 
        }
      };
    case 'ADD_HOLIDAY':
      return {
        ...state,
        settings: {
          ...state.settings,
          holidays: [...state.settings.holidays, action.payload]
        }
      };
    case 'DELETE_HOLIDAY':
      return {
        ...state,
        settings: {
          ...state.settings,
          holidays: state.settings.holidays.filter(h => h.id !== action.payload)
        }
      };
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload
      };
    case 'IMPORT_SCHEDULE_FROM_WEBHOOK':
      if (!action.payload) return state;
      
      // Check if the schedule already exists by month
      const existingScheduleIndex = state.schedules.findIndex(
        s => s.month === action.payload.month
      );
      
      let updatedSchedules = [...state.schedules];
      
      if (existingScheduleIndex >= 0) {
        // Replace existing schedule
        updatedSchedules[existingScheduleIndex] = {
          ...action.payload,
          id: state.schedules[existingScheduleIndex].id
        };
      } else {
        // Add new schedule
        updatedSchedules.push({
          ...action.payload,
          id: Date.now()
        });
        
        // Keep only the last 50
        updatedSchedules = updatedSchedules
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 50);
      }
      
      return {
        ...state,
        schedules: updatedSchedules,
        currentSchedule: action.payload
      };
    default:
      return state;
  }
}

export function ScheduleProvider({ children }) {
  const [state, dispatch] = useReducer(scheduleReducer, initialState);

  useEffect(() => {
    const savedData = localStorage.getItem('dienstplan-data');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        
        // Handle employees with new properties
        if (parsedData.employees) {
          parsedData.employees.forEach(emp => {
            // Add new properties if missing
            const updatedEmployee = {
              ...emp,
              maxConsecutiveDays: emp.maxConsecutiveDays || 4,
              sickLeave: emp.sickLeave || { from: '', to: '' },
              availableDays: emp.availableDays || {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: true
              }
            };
            dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
          });
        }
        
        // Handle settings with new properties
        if (parsedData.settings) {
          const updatedSettings = {
            ...parsedData.settings,
            rules: {
              ...parsedData.settings.rules,
              minutesTolerance: parsedData.settings.rules.minutesTolerance || 0,
              minDaysOffBetweenBlocks: parsedData.settings.rules.minDaysOffBetweenBlocks || 2
            },
            webhooks: parsedData.settings.webhooks || {
              schedule: '',
              employees: ''
            },
            holidays: parsedData.settings.holidays || []
          };
          
          // Remove maxConsecutiveDays from global settings if present
          if (updatedSettings.rules.maxConsecutiveDays) {
            delete updatedSettings.rules.maxConsecutiveDays;
          }
          
          // Update shift times to new standards if not already set
          if (!parsedData.settings.shiftsUpdated) {
            updatedSettings.shifts = {
              früh: { start: '07:00', end: '15:54', hours: 8, minutes: 24 },
              zwischen: { start: '10:00', end: '18:54', hours: 8, minutes: 24 },
              spät: { start: '12:45', end: '21:39', hours: 8, minutes: 54 }
            };
            updatedSettings.shiftsUpdated = true;
          }
          
          dispatch({ type: 'UPDATE_SETTINGS', payload: updatedSettings });
        }
        
        // Handle schedules - limit to 50
        if (parsedData.schedules && parsedData.schedules.length > 0) {
          const limitedSchedules = parsedData.schedules
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 50);
          
          limitedSchedules.forEach(schedule => {
            dispatch({ type: 'ADD_SCHEDULE', payload: schedule });
          });
          
          // Set current schedule
          if (parsedData.currentSchedule) {
            dispatch({ type: 'SET_CURRENT_SCHEDULE', payload: parsedData.currentSchedule });
          }
        }
        
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dienstplan-data', JSON.stringify(state));
  }, [state]);

  return (
    <ScheduleContext.Provider value={{ state, dispatch }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}