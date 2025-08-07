import supabase from '../lib/supabase';

/**
 * Service for handling database operations with Supabase
 */
export default class DatabaseService {
  /**
   * Save employee data to database
   * 
   * @param {Object} employee - The employee data to save
   * @returns {Promise<Object>} - The saved employee data with ID
   */
  static async saveEmployee(employee) {
    try {
      const employeeData = {
        name: employee.name,
        workload: employee.workload,
        skills: employee.skills,
        preferences: employee.preferences,
        max_consecutive_days: employee.maxConsecutiveDays,
        sick_leave: employee.sickLeave,
        available_days: employee.availableDays
      };
      
      if (employee.id && !employee.id.toString().startsWith('local_')) {
        // Update existing employee
        const { data, error } = await supabase
          .from('employees_helm')
          .update(employeeData)
          .eq('id', employee.id)
          .select();
        
        if (error) throw error;
        return data[0] ? transformEmployeeFromDb(data[0]) : employee;
      } else {
        // Create new employee
        const { data, error } = await supabase
          .from('employees_helm')
          .insert(employeeData)
          .select();
        
        if (error) throw error;
        return data[0] ? transformEmployeeFromDb(data[0]) : employee;
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      // Return the original employee with a local ID to ensure it still works client-side
      if (!employee.id) {
        employee.id = `local_${Date.now()}`;
      }
      return employee;
    }
  }

  /**
   * Delete an employee from the database
   * 
   * @param {string} employeeId - The ID of the employee to delete
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteEmployee(employeeId) {
    try {
      // Only delete from database if it's not a local ID
      if (!employeeId.toString().startsWith('local_')) {
        const { error } = await supabase
          .from('employees_helm')
          .delete()
          .eq('id', employeeId);
        
        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      return false;
    }
  }

  /**
   * Load all employees from database
   * 
   * @returns {Promise<Array>} - Array of employee objects
   */
  static async loadEmployees() {
    try {
      const { data, error } = await supabase
        .from('employees_helm')
        .select('*');
      
      if (error) throw error;
      
      // Transform database format to application format
      return data.map(transformEmployeeFromDb);
    } catch (error) {
      console.error('Error loading employees:', error);
      return [];
    }
  }

  /**
   * Save a schedule to the database
   * 
   * @param {Object} schedule - The schedule to save
   * @returns {Promise<Object>} - The saved schedule with ID
   */
  static async saveSchedule(schedule) {
    try {
      const scheduleData = {
        month: schedule.month,
        schedule: schedule.schedule,
        violations: schedule.violations,
        employee_hours: schedule.employeeHours,
        employee_stats: schedule.employeeStats,
        target_hours: schedule.targetHours,
        employee_weekend_shifts: schedule.employeeWeekendShifts,
        created_at: schedule.createdAt || new Date().toISOString()
      };
      
      if (schedule.id && !schedule.id.toString().startsWith('local_')) {
        // Update existing schedule
        const { data, error } = await supabase
          .from('schedules_helm')
          .update(scheduleData)
          .eq('id', schedule.id)
          .select();
        
        if (error) throw error;
        return data[0] ? transformScheduleFromDb(data[0]) : schedule;
      } else {
        // Create new schedule
        const { data, error } = await supabase
          .from('schedules_helm')
          .insert(scheduleData)
          .select();
        
        if (error) throw error;
        return data[0] ? transformScheduleFromDb(data[0]) : schedule;
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      // Return the original schedule with a local ID
      if (!schedule.id) {
        schedule.id = `local_${Date.now()}`;
      }
      return schedule;
    }
  }

  /**
   * Delete a schedule from the database
   * 
   * @param {string} scheduleId - The ID of the schedule to delete
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteSchedule(scheduleId) {
    try {
      if (!scheduleId.toString().startsWith('local_')) {
        const { error } = await supabase
          .from('schedules_helm')
          .delete()
          .eq('id', scheduleId);
        
        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return false;
    }
  }

  /**
   * Load all schedules from database
   * 
   * @returns {Promise<Array>} - Array of schedule objects
   */
  static async loadSchedules() {
    try {
      const { data, error } = await supabase
        .from('schedules_helm')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform database format to application format
      return data.map(transformScheduleFromDb);
    } catch (error) {
      console.error('Error loading schedules:', error);
      return [];
    }
  }

  /**
   * Save settings to database
   * 
   * @param {Object} settings - The settings to save
   * @returns {Promise<Object>} - The saved settings
   */
  static async saveSettings(settings) {
    try {
      const settingsData = {
        shifts: settings.shifts,
        min_staffing: settings.minStaffing,
        rules: settings.rules,
        holidays: settings.holidays || [],
        weekend_rules: {
          under50: settings.weekendRules?.under50 || 1,
          over50: settings.weekendRules?.over50 || 2
        },
        updated_at: new Date().toISOString()
      };
      
      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('settings_helm')
        .select('id')
        .limit(1);
      
      if (existingSettings && existingSettings.length > 0) {
        // Update existing settings
        const { data, error } = await supabase
          .from('settings_helm')
          .update(settingsData)
          .eq('id', existingSettings[0].id)
          .select();
        
        if (error) throw error;
        return data[0] ? transformSettingsFromDb(data[0]) : settings;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('settings_helm')
          .insert(settingsData)
          .select();
        
        if (error) throw error;
        return data[0] ? transformSettingsFromDb(data[0]) : settings;
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      return settings;
    }
  }

  /**
   * Load settings from database
   * 
   * @returns {Promise<Object>} - The settings object
   */
  static async loadSettings() {
    try {
      const { data, error } = await supabase
        .from('settings_helm')
        .select('*')
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return transformSettingsFromDb(data[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Error loading settings:', error);
      return null;
    }
  }
}

/**
 * Transform an employee from database format to application format
 * 
 * @param {Object} dbEmployee - The employee in database format
 * @returns {Object} - The employee in application format
 */
function transformEmployeeFromDb(dbEmployee) {
  return {
    id: dbEmployee.id,
    name: dbEmployee.name,
    workload: dbEmployee.workload,
    skills: dbEmployee.skills || [],
    preferences: dbEmployee.preferences || [],
    maxConsecutiveDays: dbEmployee.max_consecutive_days || 4,
    sickLeave: dbEmployee.sick_leave || { from: '', to: '' },
    availableDays: dbEmployee.available_days || {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    }
  };
}

/**
 * Transform a schedule from database format to application format
 * 
 * @param {Object} dbSchedule - The schedule in database format
 * @returns {Object} - The schedule in application format
 */
function transformScheduleFromDb(dbSchedule) {
  return {
    id: dbSchedule.id,
    month: dbSchedule.month,
    schedule: dbSchedule.schedule || {},
    violations: dbSchedule.violations || [],
    employeeHours: dbSchedule.employee_hours || {},
    employeeStats: dbSchedule.employee_stats || {},
    targetHours: dbSchedule.target_hours || {},
    employeeWeekendShifts: dbSchedule.employee_weekend_shifts || {},
    createdAt: dbSchedule.created_at
  };
}

/**
 * Transform settings from database format to application format
 * 
 * @param {Object} dbSettings - The settings in database format
 * @returns {Object} - The settings in application format
 */
function transformSettingsFromDb(dbSettings) {
  return {
    shifts: dbSettings.shifts || {
      früh: { start: '07:00', end: '15:54', hours: 8, minutes: 24 },
      zwischen: { start: '10:00', end: '18:54', hours: 8, minutes: 24 },
      spät: { start: '12:45', end: '21:39', hours: 8, minutes: 54 }
    },
    minStaffing: dbSettings.min_staffing || {
      weekday: { früh: 2, zwischen: 3, spät: 2 },
      weekend: { früh: 1, zwischen: 2, spät: 1 }
    },
    rules: dbSettings.rules || {
      minRestHours: 11,
      noEarlyAfterLate: true,
      maxHoursPerDay: 12,
      maxHoursPerWeek: 48,
      hoursTolerance: 8,
      minutesTolerance: 0,
      minDaysOffBetweenBlocks: 2
    },
    holidays: dbSettings.holidays || [],
    weekendRules: dbSettings.weekend_rules || {
      under50: 1,
      over50: 2
    }
  };
}