// Real-time User Experience and Energy Management Types

export interface UserEnergyProfile {
  currentEnergyLevel: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  energyHistory: EnergyDataPoint[];
  optimalStudyTimes: TimeSlot[];
  energyPatterns: EnergyPattern[];
  lastUpdated: string;
  adaptivePreferences: AdaptivePreferences;
}

export interface EnergyDataPoint {
  timestamp: string;
  energyLevel: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  context?: {
    timeOfDay: string;
    dayOfWeek: number;
    weather?: string;
    sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
    caffeine?: boolean;
    exercise?: boolean;
    meals?: 'empty' | 'light' | 'full';
    stress?: 'low' | 'medium' | 'high';
  };
  productivity?: number; // 1-10 scale of how productive they felt
  sessionCompleted?: boolean;
}

export interface EnergyPattern {
  type: 'daily' | 'weekly' | 'monthly';
  pattern: {
    timeSlot: string;
    averageEnergy: number;
    confidence: number; // How consistent this pattern is
  }[];
  recommendations: string[];
}

export interface TimeSlot {
  startHour: number;
  endHour: number;
  energyLevel: number; // 1-10
  suitabilityScores: {
    reading: number;
    writing: number;
    problemSolving: number;
    creative: number;
    review: number;
  };
}

export interface AdaptivePreferences {
  adjustDifficultyByEnergy: boolean;
  suggestBreaksBasedOnEnergy: boolean;
  adaptSessionLengthByEnergy: boolean;
  enableEnergyNotifications: boolean;
  autoRescheduleOnLowEnergy: boolean;
  preferredLowEnergyActivities: TaskType[];
  preferredHighEnergyActivities: TaskType[];
}

export interface RealTimeContext {
  currentTime: Date;
  dayOfWeek: number;
  userPresence: 'active' | 'idle' | 'away';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  networkStatus: 'online' | 'offline' | 'slow';
  batteryLevel?: number; // For mobile devices
  ambientLight?: 'bright' | 'medium' | 'dim';
  locationContext?: 'home' | 'library' | 'cafe' | 'transport' | 'other';
}

export interface SmartSuggestion {
  id: string;
  type: 'energy-based' | 'context-based' | 'pattern-based' | 'urgent';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionText: string;
  onAccept: () => void;
  onDismiss: () => void;
  expiresAt?: string;
  icon: string;
  category: 'scheduling' | 'energy' | 'productivity' | 'break' | 'session';
}

export interface ProductivityMetrics {
  focusScore: number; // 0-100
  completionRate: number; // 0-100
  consistencyScore: number; // 0-100
  energyUtilization: number; // 0-100
  adaptationSuccess: number; // 0-100
  streakQuality: number; // 0-100
  timeOptimization: number; // 0-100
}

export interface SessionFeedback {
  sessionId: string;
  timestamp: string;
  difficultyRating: 1 | 2 | 3 | 4 | 5;
  energyBefore: 1 | 2 | 3 | 4 | 5;
  energyAfter: 1 | 2 | 3 | 4 | 5;
  focusRating: 1 | 2 | 3 | 4 | 5;
  environmentRating: 1 | 2 | 3 | 4 | 5;
  satisfaction: 1 | 2 | 3 | 4 | 5;
  distractions: string[];
  notes?: string;
  recommendNextSession?: boolean;
}

export interface AdaptiveSchedulingConfig {
  enableEnergyAdaptation: boolean;
  enableContextualScheduling: boolean;
  learningMode: 'passive' | 'active' | 'aggressive';
  adaptationSensitivity: 'low' | 'medium' | 'high';
  minDataPointsForPattern: number;
  energyThresholdForRescheduling: number;
  contextualWeights: {
    energy: number;
    time: number;
    environment: number;
    history: number;
  };
}

export interface PersonalizedInsight {
  id: string;
  type: 'energy-pattern' | 'productivity-trend' | 'optimization-opportunity' | 'streak-analysis';
  insight: string;
  data: any;
  actionable: boolean;
  actions?: SmartSuggestion[];
  confidence: number;
  timestamp: string;
}

export type TaskType = 'reading' | 'writing' | 'problem-solving' | 'creative' | 'review' | 'research' | 'practice' | 'memorization';

export interface UserPersona {
  type: 'early-bird' | 'night-owl' | 'flexible' | 'inconsistent';
  characteristics: string[];
  optimalScheduling: string[];
  challenges: string[];
  recommendations: string[];
  confidenceLevel: number;
}

export interface RealTimeUserExperience {
  energyProfile: UserEnergyProfile;
  currentContext: RealTimeContext;
  smartSuggestions: SmartSuggestion[];
  productivityMetrics: ProductivityMetrics;
  recentFeedback: SessionFeedback[];
  adaptiveConfig: AdaptiveSchedulingConfig;
  personalizedInsights: PersonalizedInsight[];
  userPersona: UserPersona;
}