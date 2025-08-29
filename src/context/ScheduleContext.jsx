import React, { createContext, useContext, useReducer, useEffect } from 'react';
import DatabaseService from '../utils/databaseService';

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
      vacation: { from: '', to: '' }, // Added vacation
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
      vacation: { from: '', to: '' }, // Added vacation
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
      vacation: { from: '', to: '' }, // Added vacation
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
    weekendRules: {
      under50: 1, // Max weekend days per month for employees with workload <= 50%
      over50: 2  // Max weekend days per month for employees with workload > 50%
    },
    webhooks: {
      schedule: '',
      employees: ''
    },
    holidays: []
  },
  loading: false,
  error: null
};

function scheduleReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_EMPLOYEES':
      return { ...state, employees: action.payload };
      
    case 'SET_SCHEDULES':
      return { ...state, schedules: action.payload };
      
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
      
    case 'ADD_EMPLOYEE':
      return {
        ...state,
        employees: [
          ...state.employees,
          {
            ...action.payload,
            id: action.payload.id || Date.now(),
            maxConsecutiveDays: action.payload.maxConsecutiveDays || 4,
            sickLeave: action.payload.sickLeave || { from: '', to: '' },
            vacation: action.payload.vacation || { from: '', to: '' },
            availableDays: action.payload.availableDays || {
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: true,
              sunday: true
            }
          }
        ]
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
      return { ...state, currentSchedule: action.payload };
      
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
      
    case 'DELETE_SCHEDULE':
      const filteredSchedules = state.schedules.filter(s => s.id !== action.payload);
      const updatedCurrentSchedule = state.currentSchedule && state.currentSchedule.id === action.payload
        ? filteredSchedules[0] || null
        : state.currentSchedule;
        
      return {
        ...state,
        schedules: filteredSchedules,
        currentSchedule: updatedCurrentSchedule
      };
      
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
      
    case 'UPDATE_WEEKEND_RULES':
      return {
        ...state,
        settings: {
          ...state.settings,
          weekendRules: { ...state.settings.weekendRules, ...action.payload }
        }
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
      return { ...state, viewMode: action.payload };
      
    case 'IMPORT_SCHEDULE_FROM_WEBHOOK':
      if (!action.payload) return state;
      
      // Check if the schedule already exists by month
      const existingScheduleIndex = state.schedules.findIndex(
        s => s.month === action.payload.month
      );
      
      let schedulesList = [...state.schedules];
      if (existingScheduleIndex >= 0) {
        // Replace existing schedule
        schedulesList[existingScheduleIndex] = {
          ...action.payload,
          id: state.schedules[existingScheduleIndex].id
        };
      } else {
        // Add new schedule
        schedulesList.push({
          ...action.payload,
          id: action.payload.id || Date.now()
        });
        
        // Keep only the last 50
        schedulesList = schedulesList
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 50);
      }
      
      return {
        ...state,
        schedules: schedulesList,
        currentSchedule: action.payload
      };
      
    default:
      return state;
  }
}

export function ScheduleProvider({ children }) {
  const [state, dispatch] = useReducer(scheduleReducer, initialState);
  
  // Load data from database on mount
  useEffect(() => {
    const loadData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        // Load data from local storage first (for backwards compatibility)
        const savedData = localStorage.getItem('dienstplan-data');
        let localData = null;
        
        if (savedData) {
          try {
            localData = JSON.parse(savedData);
          } catch (error) {
            console.error('Error parsing local data:', error);
          }
        }

        // Load employees from database
        const employees = await DatabaseService.loadEmployees();
        if (employees && employees.length > 0) {
          dispatch({ type: 'SET_EMPLOYEES', payload: employees });
        } else if (localData && localData.employees) {
          // Use local data as fallback and save to database
          const updatedEmployees = [];
          for (const emp of localData.employees) {
            const savedEmp = await DatabaseService.saveEmployee(emp);
            updatedEmployees.push(savedEmp);
          }
          dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
        }

        // Load schedules from database
        const schedules = await DatabaseService.loadSchedules();
        if (schedules && schedules.length > 0) {
          dispatch({ type: 'SET_SCHEDULES', payload: schedules });
          
          // Set current schedule if it exists in local data
          if (localData && localData.currentSchedule) {
            const currentScheduleId = localData.currentSchedule.id;
            const currentSchedule = schedules.find(s => s.id === currentScheduleId) || schedules[0];
            dispatch({ type: 'SET_CURRENT_SCHEDULE', payload: currentSchedule });
          } else {
            dispatch({ type: 'SET_CURRENT_SCHEDULE', payload: schedules[0] });
          }
        } else if (localData && localData.schedules && localData.schedules.length > 0) {
          // Use local data as fallback and save to database
          const updatedSchedules = [];
          for (const schedule of localData.schedules) {
            const savedSchedule = await DatabaseService.saveSchedule(schedule);
            updatedSchedules.push(savedSchedule);
          }
          dispatch({ type: 'SET_SCHEDULES', payload: updatedSchedules });
          
          if (localData.currentSchedule) {
            const currentScheduleMonth = localData.currentSchedule.month;
            const currentSchedule = updatedSchedules.find(s => s.month === currentScheduleMonth) || updatedSchedules[0];
            dispatch({ type: 'SET_CURRENT_SCHEDULE', payload: currentSchedule });
          }
        }

        // Load settings from database
        const settings = await DatabaseService.loadSettings();
        if (settings) {
          dispatch({ type: 'SET_SETTINGS', payload: settings });
        } else if (localData && localData.settings) {
          // Use local data as fallback and save to database
          const updatedSettings = {
            ...localData.settings,
            weekendRules: localData.settings.weekendRules || { under50: 1, over50: 2 }
          };
          await DatabaseService.saveSettings(updatedSettings);
          dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
        }
      } catch (error) {
        console.error('Error loading data:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load data from database' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    loadData();
  }, []);

  // Save data to database when it changes
  useEffect(() => {
    const saveData = async () => {
      try {
        // Save to local storage for backwards compatibility
        localStorage.setItem('dienstplan-data', JSON.stringify(state));
      } catch (error) {
        console.error('Error saving data to local storage:', error);
      }
    };
    
    saveData();
  }, [state]);

  // Save employees to database when they change
  useEffect(() => {
    const saveEmployees = async () => {
      try {
        // We don't want to save on initial load
        if (state.loading) return;
        
        // Save each employee to database
        for (const employee of state.employees) {
          await DatabaseService.saveEmployee(employee);
        }
      } catch (error) {
        console.error('Error saving employees to database:', error);
      }
    };
    
    saveEmployees();
  }, [state.employees]);

  // Save settings to database when they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        // We don't want to save on initial load
        if (state.loading) return;
        
        // Save settings to database
        await DatabaseService.saveSettings(state.settings);
      } catch (error) {
        console.error('Error saving settings to database:', error);
      }
    };
    
    saveSettings();
  }, [state.settings]);

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