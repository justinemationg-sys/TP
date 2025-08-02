import {
  UserEnergyProfile,
  EnergyDataPoint,
  EnergyPattern,
  TimeSlot,
  AdaptivePreferences,
  RealTimeContext,
  SmartSuggestion,
  ProductivityMetrics,
  SessionFeedback,
  AdaptiveSchedulingConfig,
  PersonalizedInsight,
  TaskType,
  UserPersona,
  RealTimeUserExperience
} from '../types-user-experience';
import { Task, StudySession, StudyPlan } from '../types';

// Default adaptive preferences
export const defaultAdaptivePreferences: AdaptivePreferences = {
  adjustDifficultyByEnergy: true,
  suggestBreaksBasedOnEnergy: true,
  adaptSessionLengthByEnergy: true,
  enableEnergyNotifications: true,
  autoRescheduleOnLowEnergy: false,
  preferredLowEnergyActivities: ['reading', 'review'],
  preferredHighEnergyActivities: ['problem-solving', 'creative', 'writing']
};

// Default adaptive scheduling configuration
export const defaultAdaptiveConfig: AdaptiveSchedulingConfig = {
  enableEnergyAdaptation: true,
  enableContextualScheduling: true,
  learningMode: 'active',
  adaptationSensitivity: 'medium',
  minDataPointsForPattern: 7,
  energyThresholdForRescheduling: 2,
  contextualWeights: {
    energy: 0.4,
    time: 0.3,
    environment: 0.2,
    history: 0.1
  }
};

// Initialize user energy profile
export function initializeEnergyProfile(): UserEnergyProfile {
  return {
    currentEnergyLevel: 'medium',
    energyHistory: [],
    optimalStudyTimes: [],
    energyPatterns: [],
    lastUpdated: new Date().toISOString(),
    adaptivePreferences: defaultAdaptivePreferences
  };
}

// Record energy data point
export function recordEnergyData(
  currentProfile: UserEnergyProfile,
  energyLevel: EnergyDataPoint['energyLevel'],
  context?: EnergyDataPoint['context'],
  productivity?: number,
  sessionCompleted?: boolean
): UserEnergyProfile {
  const dataPoint: EnergyDataPoint = {
    timestamp: new Date().toISOString(),
    energyLevel,
    context,
    productivity,
    sessionCompleted
  };

  const updatedHistory = [...currentProfile.energyHistory, dataPoint];
  
  // Keep only last 30 days of data for performance
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const filteredHistory = updatedHistory.filter(
    point => new Date(point.timestamp) > thirtyDaysAgo
  );

  return {
    ...currentProfile,
    currentEnergyLevel: energyLevel,
    energyHistory: filteredHistory,
    lastUpdated: new Date().toISOString(),
    energyPatterns: analyzePatternsFromHistory(filteredHistory),
    optimalStudyTimes: calculateOptimalStudyTimes(filteredHistory)
  };
}

// Analyze energy patterns from history
export function analyzePatternsFromHistory(history: EnergyDataPoint[]): EnergyPattern[] {
  if (history.length < 7) return [];

  const patterns: EnergyPattern[] = [];

  // Daily pattern analysis
  const hourlyData = new Map<number, { total: number; count: number; energySum: number }>();
  
  history.forEach(point => {
    const hour = new Date(point.timestamp).getHours();
    const energyValue = energyLevelToNumber(point.energyLevel);
    
    if (!hourlyData.has(hour)) {
      hourlyData.set(hour, { total: 0, count: 0, energySum: 0 });
    }
    
    const data = hourlyData.get(hour)!;
    data.count++;
    data.energySum += energyValue;
  });

  const dailyPattern: EnergyPattern = {
    type: 'daily',
    pattern: Array.from(hourlyData.entries()).map(([hour, data]) => ({
      timeSlot: `${hour}:00`,
      averageEnergy: data.energySum / data.count,
      confidence: Math.min(data.count / 7, 1) // Confidence based on data points
    })),
    recommendations: generateDailyRecommendations(hourlyData)
  };

  patterns.push(dailyPattern);

  // Weekly pattern analysis
  const weeklyData = new Map<number, { energySum: number; count: number }>();
  
  history.forEach(point => {
    const dayOfWeek = new Date(point.timestamp).getDay();
    const energyValue = energyLevelToNumber(point.energyLevel);
    
    if (!weeklyData.has(dayOfWeek)) {
      weeklyData.set(dayOfWeek, { energySum: 0, count: 0 });
    }
    
    const data = weeklyData.get(dayOfWeek)!;
    data.count++;
    data.energySum += energyValue;
  });

  const weeklyPattern: EnergyPattern = {
    type: 'weekly',
    pattern: Array.from(weeklyData.entries()).map(([day, data]) => ({
      timeSlot: getDayName(day),
      averageEnergy: data.energySum / data.count,
      confidence: Math.min(data.count / 4, 1)
    })),
    recommendations: generateWeeklyRecommendations(weeklyData)
  };

  patterns.push(weeklyPattern);

  return patterns;
}

// Calculate optimal study times based on energy history
export function calculateOptimalStudyTimes(history: EnergyDataPoint[]): TimeSlot[] {
  if (history.length < 7) return [];

  const hourlyPerformance = new Map<number, {
    energySum: number;
    productivitySum: number;
    count: number;
    completionRate: number;
  }>();

  history.forEach(point => {
    const hour = new Date(point.timestamp).getHours();
    const energyValue = energyLevelToNumber(point.energyLevel);
    
    if (!hourlyPerformance.has(hour)) {
      hourlyPerformance.set(hour, {
        energySum: 0,
        productivitySum: 0,
        count: 0,
        completionRate: 0
      });
    }
    
    const data = hourlyPerformance.get(hour)!;
    data.count++;
    data.energySum += energyValue;
    if (point.productivity) data.productivitySum += point.productivity;
    if (point.sessionCompleted) data.completionRate++;
  });

  const timeSlots: TimeSlot[] = [];

  hourlyPerformance.forEach((data, hour) => {
    const avgEnergy = data.energySum / data.count;
    const avgProductivity = data.productivitySum / data.count || 0;
    const completionRate = data.completionRate / data.count;
    
    // Only include hours with good performance
    if (avgEnergy >= 3 && completionRate >= 0.7) {
      timeSlots.push({
        startHour: hour,
        endHour: hour + 1,
        energyLevel: avgEnergy,
        suitabilityScores: calculateSuitabilityScores(avgEnergy, avgProductivity)
      });
    }
  });

  return timeSlots.sort((a, b) => b.energyLevel - a.energyLevel);
}

// Generate smart suggestions based on current context and energy
export function generateSmartSuggestions(
  userExperience: RealTimeUserExperience,
  tasks: Task[],
  studyPlans: StudyPlan[]
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const { energyProfile, currentContext } = userExperience;

  // Energy-based suggestions
  if (energyProfile.currentEnergyLevel === 'very-low' || energyProfile.currentEnergyLevel === 'low') {
    suggestions.push({
      id: `energy-low-${Date.now()}`,
      type: 'energy-based',
      priority: 'high',
      title: 'Low Energy Detected',
      description: 'Consider taking a break or switching to lighter tasks like reading or review.',
      actionText: 'Suggest Light Tasks',
      onAccept: () => console.log('Suggesting light tasks'),
      onDismiss: () => console.log('Dismissed'),
      icon: '😴',
      category: 'energy'
    });
  }

  if (energyProfile.currentEnergyLevel === 'high' || energyProfile.currentEnergyLevel === 'very-high') {
    const difficultTasks = tasks.filter(task => 
      task.status !== 'completed' && 
      (task.taskType === 'problem-solving' || task.taskType === 'creative')
    );
    
    if (difficultTasks.length > 0) {
      suggestions.push({
        id: `energy-high-${Date.now()}`,
        type: 'energy-based',
        priority: 'medium',
        title: 'High Energy - Perfect for Challenging Tasks!',
        description: 'You have high energy right now. Great time for problem-solving or creative work.',
        actionText: 'Start Difficult Task',
        onAccept: () => console.log('Starting difficult task'),
        onDismiss: () => console.log('Dismissed'),
        icon: '⚡',
        category: 'scheduling'
      });
    }
  }

  // Time-based suggestions
  const currentHour = currentContext.currentTime.getHours();
  const optimalTime = energyProfile.optimalStudyTimes.find(
    slot => slot.startHour <= currentHour && slot.endHour > currentHour
  );

  if (optimalTime) {
    suggestions.push({
      id: `optimal-time-${Date.now()}`,
      type: 'pattern-based',
      priority: 'medium',
      title: 'This is your optimal study time!',
      description: `Based on your patterns, you're most productive at this time.`,
      actionText: 'Start Study Session',
      onAccept: () => console.log('Starting optimal session'),
      onDismiss: () => console.log('Dismissed'),
      icon: '🎯',
      category: 'scheduling'
    });
  }

  // Break suggestions based on continuous work
  const recentActivity = energyProfile.energyHistory
    .filter(point => {
      const pointTime = new Date(point.timestamp);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return pointTime > hourAgo;
    });

  if (recentActivity.length >= 4 && !recentActivity.some(point => point.energyLevel === 'low')) {
    suggestions.push({
      id: `break-suggestion-${Date.now()}`,
      type: 'context-based',
      priority: 'medium',
      title: 'Time for a break?',
      description: 'You\'ve been working for a while. A short break might help maintain your energy.',
      actionText: 'Take Break',
      onAccept: () => console.log('Taking break'),
      onDismiss: () => console.log('Dismissed'),
      icon: '☕',
      category: 'break'
    });
  }

  return suggestions;
}

// Generate personalized insights
export function generatePersonalizedInsights(
  userExperience: RealTimeUserExperience,
  tasks: Task[]
): PersonalizedInsight[] {
  const insights: PersonalizedInsight[] = [];
  const { energyProfile, productivityMetrics } = userExperience;

  // Energy pattern insights
  const dailyPattern = energyProfile.energyPatterns.find(p => p.type === 'daily');
  if (dailyPattern) {
    const peakHours = dailyPattern.pattern
      .filter(p => p.averageEnergy >= 4)
      .sort((a, b) => b.averageEnergy - a.averageEnergy)
      .slice(0, 3);

    if (peakHours.length > 0) {
      insights.push({
        id: `peak-hours-${Date.now()}`,
        type: 'energy-pattern',
        insight: `Your peak energy hours are ${peakHours.map(h => h.timeSlot).join(', ')}. Schedule your most important tasks during these times.`,
        data: { peakHours },
        actionable: true,
        confidence: 0.8,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Productivity trend insights
  if (productivityMetrics.completionRate < 70) {
    insights.push({
      id: `completion-rate-${Date.now()}`,
      type: 'productivity-trend',
      insight: `Your task completion rate is ${productivityMetrics.completionRate}%. Consider breaking larger tasks into smaller chunks or adjusting time estimates.`,
      data: { completionRate: productivityMetrics.completionRate },
      actionable: true,
      confidence: 0.9,
      timestamp: new Date().toISOString()
    });
  }

  return insights;
}

// Determine user persona based on patterns
export function determineUserPersona(energyProfile: UserEnergyProfile): UserPersona {
  const { energyPatterns } = energyProfile;
  
  const dailyPattern = energyPatterns.find(p => p.type === 'daily');
  if (!dailyPattern) {
    return {
      type: 'inconsistent',
      characteristics: ['Insufficient data for pattern recognition'],
      optimalScheduling: ['Start with flexible scheduling'],
      challenges: ['Building consistent habits'],
      recommendations: ['Track energy levels for a few more days'],
      confidenceLevel: 0.1
    };
  }

  const morningEnergy = dailyPattern.pattern
    .filter(p => p.timeSlot >= '06:00' && p.timeSlot <= '10:00')
    .reduce((sum, p) => sum + p.averageEnergy, 0) / 4;

  const eveningEnergy = dailyPattern.pattern
    .filter(p => p.timeSlot >= '18:00' && p.timeSlot <= '22:00')
    .reduce((sum, p) => sum + p.averageEnergy, 0) / 4;

  if (morningEnergy > eveningEnergy + 0.5) {
    return {
      type: 'early-bird',
      characteristics: ['High morning energy', 'Prefers early starts', 'Productive in first half of day'],
      optimalScheduling: ['Schedule important tasks 6-10 AM', 'Light tasks in afternoon'],
      challenges: ['Maintaining energy in evenings', 'Late deadlines'],
      recommendations: ['Front-load your day', 'Plan easier tasks for afternoons'],
      confidenceLevel: 0.8
    };
  } else if (eveningEnergy > morningEnergy + 0.5) {
    return {
      type: 'night-owl',
      characteristics: ['Higher evening energy', 'Slow morning starts', 'Peak performance later'],
      optimalScheduling: ['Light tasks in morning', 'Important work 6-10 PM'],
      challenges: ['Morning commitments', 'Early deadlines'],
      recommendations: ['Save challenging work for evening', 'Use mornings for routine tasks'],
      confidenceLevel: 0.8
    };
  } else {
    return {
      type: 'flexible',
      characteristics: ['Consistent energy throughout day', 'Adaptable to schedules'],
      optimalScheduling: ['Balanced throughout day', 'Can adapt to constraints'],
      challenges: ['May lack strong optimization opportunities'],
      recommendations: ['Focus on task prioritization', 'Optimize based on other factors'],
      confidenceLevel: 0.7
    };
  }
}

// Calculate productivity metrics
export function calculateProductivityMetrics(
  energyProfile: UserEnergyProfile,
  recentFeedback: SessionFeedback[],
  studyPlans: StudyPlan[]
): ProductivityMetrics {
  const recentData = energyProfile.energyHistory.slice(-14); // Last 2 weeks
  
  // Focus score based on session feedback
  const focusScore = recentFeedback.length > 0
    ? recentFeedback.reduce((sum, f) => sum + f.focusRating * 20, 0) / recentFeedback.length
    : 50;

  // Completion rate based on session completion
  const completedSessions = recentData.filter(d => d.sessionCompleted).length;
  const completionRate = recentData.length > 0 ? (completedSessions / recentData.length) * 100 : 0;

  // Consistency score based on energy variance
  const energyValues = recentData.map(d => energyLevelToNumber(d.energyLevel));
  const avgEnergy = energyValues.reduce((sum, e) => sum + e, 0) / energyValues.length;
  const variance = energyValues.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / energyValues.length;
  const consistencyScore = Math.max(0, 100 - variance * 20);

  // Energy utilization based on optimal time usage
  const energyUtilization = calculateEnergyUtilization(energyProfile, recentData);

  return {
    focusScore: Math.round(focusScore),
    completionRate: Math.round(completionRate),
    consistencyScore: Math.round(consistencyScore),
    energyUtilization: Math.round(energyUtilization),
    adaptationSuccess: 75, // Placeholder - would be calculated based on adaptation effectiveness
    streakQuality: 80, // Placeholder - would be calculated based on streak consistency
    timeOptimization: 70 // Placeholder - would be calculated based on optimal time usage
  };
}

// Helper functions
function energyLevelToNumber(level: EnergyDataPoint['energyLevel']): number {
  const mapping = { 'very-low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very-high': 5 };
  return mapping[level];
}

function getDayName(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
}

function calculateSuitabilityScores(energy: number, productivity: number) {
  return {
    reading: Math.min(100, (energy * 20) + (productivity * 5)),
    writing: Math.min(100, (energy * 25) + (productivity * 10)),
    problemSolving: Math.min(100, (energy * 30) + (productivity * 15)),
    creative: Math.min(100, (energy * 25) + (productivity * 12)),
    review: Math.min(100, (energy * 15) + (productivity * 8))
  };
}

function generateDailyRecommendations(hourlyData: Map<number, any>): string[] {
  const recommendations: string[] = [];
  
  // Find peak hours
  const peakHour = Array.from(hourlyData.entries())
    .reduce((max, [hour, data]) => 
      data.energySum / data.count > (hourlyData.get(max)?.[0] || 0) ? hour : max, 0);
  
  recommendations.push(`Your peak energy hour is ${peakHour}:00 - schedule important tasks then`);
  
  return recommendations;
}

function generateWeeklyRecommendations(weeklyData: Map<number, any>): string[] {
  const recommendations: string[] = [];
  
  // Find best day
  const bestDay = Array.from(weeklyData.entries())
    .reduce((max, [day, data]) => 
      data.energySum / data.count > (weeklyData.get(max)?.[0] || 0) ? day : max, 0);
  
  recommendations.push(`${getDayName(bestDay)} is your most productive day`);
  
  return recommendations;
}

function calculateEnergyUtilization(profile: UserEnergyProfile, recentData: EnergyDataPoint[]): number {
  // Placeholder calculation - would compare actual energy usage vs optimal times
  const highEnergyData = recentData.filter(d => 
    d.energyLevel === 'high' || d.energyLevel === 'very-high'
  );
  
  const utilizedHighEnergy = highEnergyData.filter(d => d.sessionCompleted).length;
  
  return highEnergyData.length > 0 
    ? (utilizedHighEnergy / highEnergyData.length) * 100 
    : 50;
}

// Get current real-time context
export function getCurrentContext(): RealTimeContext {
  return {
    currentTime: new Date(),
    dayOfWeek: new Date().getDay(),
    userPresence: 'active', // Would be detected via activity monitoring
    deviceType: /Mobile|Tablet/.test(navigator.userAgent) ? 'mobile' : 'desktop',
    networkStatus: navigator.onLine ? 'online' : 'offline',
    // Additional context would be gathered from device APIs
  };
}