/** 
 * Calculate the coverage percentage of a schedule based on required staffing
 * 
 * @param {Object} schedule - The schedule object containing the shift assignments
 * @param {Object} minStaffing - The minimum staffing requirements
 * @returns {number} - The coverage percentage (0-100)
 */
export function calculateCoveragePercentage(schedule,minStaffing) {
  if (!schedule || !schedule.schedule || !minStaffing) {
    return 0;
  }
  
  let totalRequired=0;
  let totalFilled=0;
  
  // Go through each day in the schedule
  Object.entries(schedule.schedule).forEach(([dateStr,daySchedule])=> {
    // Skip empty days (likely holidays)
    if (!daySchedule || Object.keys(daySchedule).length===0) {
      return;
    }
    
    // Determine if it's a weekend
    const date=new Date(dateStr);
    const isWeekend=date.getDay()===0 || date.getDay()===6;
    const staffingRules=isWeekend ? minStaffing.weekend : minStaffing.weekday;
    
    // Count required and filled positions for each shift
    ['früh','zwischen','spät'].forEach(shift=> {
      const required=staffingRules[shift] || 0;
      totalRequired +=required;
      
      // If the shift exists and has assignments
      if (daySchedule[shift] && Array.isArray(daySchedule[shift])) {
        totalFilled +=Math.min(daySchedule[shift].length,required);
      }
    });
  });
  
  // Calculate percentage, avoid division by zero
  if (totalRequired===0) {
    return 100;// If nothing required, consider it 100% covered
  }
  
  return (totalFilled / totalRequired) * 100;
}

/** 
 * Get suggestions for improving schedule coverage
 * 
 * @param {Object} schedule - The schedule object
 * @param {Object} minStaffing - The minimum staffing requirements
 * @param {Array} employees - The employees array
 * @returns {Array} - Array of suggestion objects
 */
export function getCoverageImprovementSuggestions(schedule,minStaffing,employees) {
  if (!schedule || !schedule.schedule || !minStaffing || !employees) {
    return [];
  }
  
  const suggestions=[];
  const criticalDays=[];
  
  // Find days with staffing issues
  Object.entries(schedule.schedule).forEach(([dateStr,daySchedule])=> {
    // Skip empty days (likely holidays)
    if (!daySchedule || Object.keys(daySchedule).length===0) {
      return;
    }
    
    const date=new Date(dateStr);
    const isWeekend=date.getDay()===0 || date.getDay()===6;
    const staffingRules=isWeekend ? minStaffing.weekend : minStaffing.weekday;
    
    let dayHasIssue=false;
    let issueDetails = [];
    
    ['früh','zwischen','spät'].forEach(shift=> {
      const required=staffingRules[shift] || 0;
      const assigned=daySchedule[shift] ? daySchedule[shift].length : 0;
      
      if (assigned < required) {
        dayHasIssue=true;
        issueDetails.push(`${shift}: ${assigned}/${required}`);
      }
    });
    
    if (dayHasIssue) {
      criticalDays.push({
        date: dateStr,
        displayDate: new Date(dateStr).toLocaleDateString('de-DE',{
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }),
        isWeekend,
        details: issueDetails.join(', ')
      });
    }
  });
  
  // Add suggestions based on issues found
  if (criticalDays.length > 0) {
    suggestions.push({
      type: 'critical_days',
      title: 'Kritische Tage mit Unterbesetzung',
      days: criticalDays,// Include all critical days
      totalCount: criticalDays.length
    });
  }
  
  // Check for employees with capacity
  const employeesWithCapacity=employees.filter(emp=> {
    const actualHours=schedule.employeeHours?.[emp.id] || 0;
    const targetHours=schedule.targetHours?.[emp.id] || 0;
    return actualHours < targetHours * 0.9;// Less than 90% of target
  });
  
  if (employeesWithCapacity.length > 0) {
    suggestions.push({
      type: 'available_capacity',
      title: 'Mitarbeiter mit freier Kapazität',
      employees: employeesWithCapacity.map(emp=> ({
        id: emp.id,
        name: emp.name,
        actualHours: schedule.employeeHours?.[emp.id] || 0,
        targetHours: schedule.targetHours?.[emp.id] || 0,
        percentUsed: Math.round(((schedule.employeeHours?.[emp.id] || 0) / (schedule.targetHours?.[emp.id] || 1)) * 100)
      }))
    });
  }
  
  // Check weekend distribution - using weekend count (not days)
  const weekendDistribution=employees.map(emp=> {
    const stats=schedule.employeeStats?.[emp.id] || {früh: 0,zwischen: 0,spät: 0};
    const weekendCount=schedule.employeeWeekendShifts?.[emp.id] || 0;
    const recommendedMax=emp.workload > 50 ? 2 : 1;
    
    return {
      id: emp.id,
      name: emp.name,
      workload: emp.workload,
      weekendShifts: weekendCount,
      recommendedMax,
      overAllocated: weekendCount > recommendedMax
    };
  });
  
  const weekendIssues=weekendDistribution.filter(emp=> emp.overAllocated);
  const weekendCapacity=weekendDistribution.filter(emp=> emp.weekendShifts < emp.recommendedMax);
  
  if (weekendIssues.length > 0 && weekendCapacity.length > 0) {
    suggestions.push({
      type: 'weekend_redistribution',
      title: 'Mögliche Wochenendumverteilung',
      overAllocated: weekendIssues,
      hasCapacity: weekendCapacity
    });
  }
  
  // Check shift distribution balance
  const shiftDistribution = {};
  employees.forEach(emp => {
    const stats = schedule.employeeStats?.[emp.id] || {früh: 0, zwischen: 0, spät: 0, totalDays: 0};
    if (stats.totalDays > 0) {
      shiftDistribution[emp.id] = {
        name: emp.name,
        früh: stats.früh / stats.totalDays,
        zwischen: stats.zwischen / stats.totalDays,
        spät: stats.spät / stats.totalDays,
        totalDays: stats.totalDays
      };
    }
  });
  
  const unbalancedEmployees = Object.entries(shiftDistribution)
    .filter(([_, data]) => {
      if (data.totalDays < 5) return false; // Ignore employees with few days
      
      const values = [data.früh, data.zwischen, data.spät].filter(v => !isNaN(v));
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      // Check if any shift type is significantly over/under represented
      return values.some(v => Math.abs(v - avg) > 0.3);
    })
    .map(([id, data]) => ({
      id,
      name: data.name,
      früh: Math.round(data.früh * 100),
      zwischen: Math.round(data.zwischen * 100),
      spät: Math.round(data.spät * 100),
      totalDays: data.totalDays
    }));
  
  if (unbalancedEmployees.length > 0) {
    suggestions.push({
      type: 'shift_balance',
      title: 'Ungleichmäßige Schichtverteilung',
      employees: unbalancedEmployees
    });
  }
  
  return suggestions;
}