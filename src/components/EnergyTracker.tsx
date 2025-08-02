import React, { useState, useEffect } from 'react';
import { Battery, Zap, Coffee, Moon, Sun, TrendingUp, Brain, Heart, Eye } from 'lucide-react';
import { 
  UserEnergyProfile, 
  EnergyDataPoint, 
  SmartSuggestion,
  RealTimeUserExperience 
} from '../types-user-experience';
import { 
  recordEnergyData, 
  generateSmartSuggestions,
  determineUserPersona,
  getCurrentContext 
} from '../utils/energy-management';
import { Task, StudyPlan } from '../types';

interface EnergyTrackerProps {
  energyProfile: UserEnergyProfile;
  onEnergyUpdate: (profile: UserEnergyProfile) => void;
  tasks: Task[];
  studyPlans: StudyPlan[];
  onSuggestionAccept?: (suggestion: SmartSuggestion) => void;
  className?: string;
}

const EnergyTracker: React.FC<EnergyTrackerProps> = ({
  energyProfile,
  onEnergyUpdate,
  tasks,
  studyPlans,
  onSuggestionAccept,
  className = ''
}) => {
  const [showFullTracker, setShowFullTracker] = useState(false);
  const [contextData, setContextData] = useState({
    sleepQuality: 'good' as 'poor' | 'fair' | 'good' | 'excellent',
    caffeine: false,
    exercise: false,
    meals: 'light' as 'empty' | 'light' | 'full',
    stress: 'low' as 'low' | 'medium' | 'high'
  });
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Get current suggestions
  const currentContext = getCurrentContext();
  const userExperience: RealTimeUserExperience = {
    energyProfile,
    currentContext,
    smartSuggestions: [],
    productivityMetrics: {
      focusScore: 75,
      completionRate: 80,
      consistencyScore: 70,
      energyUtilization: 85,
      adaptationSuccess: 75,
      streakQuality: 80,
      timeOptimization: 70
    },
    recentFeedback: [],
    adaptiveConfig: {
      enableEnergyAdaptation: true,
      enableContextualScheduling: true,
      learningMode: 'active',
      adaptationSensitivity: 'medium',
      minDataPointsForPattern: 7,
      energyThresholdForRescheduling: 2,
      contextualWeights: { energy: 0.4, time: 0.3, environment: 0.2, history: 0.1 }
    },
    personalizedInsights: [],
    userPersona: determineUserPersona(energyProfile)
  };

  const suggestions = generateSmartSuggestions(userExperience, tasks, studyPlans);

  const handleEnergyUpdate = (level: EnergyDataPoint['energyLevel']) => {
    const context = {
      timeOfDay: new Date().toTimeString().slice(0, 5),
      dayOfWeek: new Date().getDay(),
      ...contextData
    };

    const updatedProfile = recordEnergyData(
      energyProfile,
      level,
      context,
      undefined, // productivity will be gathered from session feedback
      false // session completion tracked separately
    );

    onEnergyUpdate(updatedProfile);
  };

  const getEnergyIcon = (level: EnergyDataPoint['energyLevel']) => {
    switch (level) {
      case 'very-low': return <Battery className="text-red-500" size={20} />;
      case 'low': return <Moon className="text-orange-500" size={20} />;
      case 'medium': return <Coffee className="text-yellow-500" size={20} />;
      case 'high': return <Sun className="text-green-500" size={20} />;
      case 'very-high': return <Zap className="text-blue-500" size={20} />;
    }
  };

  const getEnergyColor = (level: EnergyDataPoint['energyLevel']) => {
    switch (level) {
      case 'very-low': return 'from-red-500 to-red-600';
      case 'low': return 'from-orange-500 to-orange-600';
      case 'medium': return 'from-yellow-500 to-yellow-600';
      case 'high': return 'from-green-500 to-green-600';
      case 'very-high': return 'from-blue-500 to-blue-600';
    }
  };

  const getEnergyDescription = (level: EnergyDataPoint['energyLevel']) => {
    switch (level) {
      case 'very-low': return 'Exhausted - Consider resting';
      case 'low': return 'Low energy - Light tasks only';
      case 'medium': return 'Moderate energy - Normal tasks';
      case 'high': return 'High energy - Great for challenging work';
      case 'very-high': return 'Peak energy - Perfect for difficult tasks';
    }
  };

  // Quick energy tracker (always visible)
  const QuickTracker = () => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getEnergyIcon(energyProfile.currentEnergyLevel)}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Energy Level
          </span>
        </div>
        <button
          onClick={() => setShowFullTracker(!showFullTracker)}
          className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
        >
          {showFullTracker ? 'Quick' : 'Detailed'}
        </button>
      </div>

      {/* Energy level buttons */}
      <div className="grid grid-cols-5 gap-1 mb-3">
        {(['very-low', 'low', 'medium', 'high', 'very-high'] as const).map((level) => (
          <button
            key={level}
            onClick={() => handleEnergyUpdate(level)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              energyProfile.currentEnergyLevel === level
                ? `bg-gradient-to-r ${getEnergyColor(level)} text-white shadow-lg scale-105`
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
            }`}
            title={getEnergyDescription(level)}
          >
            {getEnergyIcon(level)}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {getEnergyDescription(energyProfile.currentEnergyLevel)}
      </p>
    </div>
  );

  // Smart suggestions panel
  const SuggestionsPanel = () => (
    showSuggestions && suggestions.length > 0 && (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            <Brain className="mr-2" size={16} />
            Smart Suggestions
          </h4>
          <button
            onClick={() => setShowSuggestions(false)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Hide
          </button>
        </div>
        
        {suggestions.slice(0, 2).map((suggestion) => (
          <div
            key={suggestion.id}
            className={`p-3 rounded-lg border-l-4 ${
              suggestion.priority === 'high' ? 'border-red-400 bg-red-50 dark:bg-red-900/20' :
              suggestion.priority === 'medium' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' :
              'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{suggestion.icon}</span>
                  <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {suggestion.title}
                  </h5>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {suggestion.description}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      suggestion.onAccept();
                      if (onSuggestionAccept) onSuggestionAccept(suggestion);
                    }}
                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    {suggestion.actionText}
                  </button>
                  <button
                    onClick={suggestion.onDismiss}
                    className="text-xs px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  );

  // Full tracker with context inputs
  const FullTracker = () => (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Sleep Quality */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sleep Quality
          </label>
          <select
            value={contextData.sleepQuality}
            onChange={(e) => setContextData(prev => ({ 
              ...prev, 
              sleepQuality: e.target.value as any 
            }))}
            className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="poor">Poor</option>
            <option value="fair">Fair</option>
            <option value="good">Good</option>
            <option value="excellent">Excellent</option>
          </select>
        </div>

        {/* Meals */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Current Hunger
          </label>
          <select
            value={contextData.meals}
            onChange={(e) => setContextData(prev => ({ 
              ...prev, 
              meals: e.target.value as any 
            }))}
            className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="empty">Hungry</option>
            <option value="light">Satisfied</option>
            <option value="full">Full</option>
          </select>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="grid grid-cols-3 gap-4">
        <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={contextData.caffeine}
            onChange={(e) => setContextData(prev => ({ 
              ...prev, 
              caffeine: e.target.checked 
            }))}
            className="rounded"
          />
          <span>Had Caffeine</span>
        </label>

        <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={contextData.exercise}
            onChange={(e) => setContextData(prev => ({ 
              ...prev, 
              exercise: e.target.checked 
            }))}
            className="rounded"
          />
          <span>Exercised</span>
        </label>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stress Level
          </label>
          <select
            value={contextData.stress}
            onChange={(e) => setContextData(prev => ({ 
              ...prev, 
              stress: e.target.value as any 
            }))}
            className="w-full text-xs p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Energy patterns summary */}
      {energyProfile.energyPatterns.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp size={16} className="text-blue-500" />
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Your Energy Patterns
            </h5>
          </div>
          
          {userExperience.userPersona.type !== 'inconsistent' && (
            <div className="mb-2">
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                {userExperience.userPersona.type === 'early-bird' ? '🌅 Early Bird' :
                 userExperience.userPersona.type === 'night-owl' ? '🦉 Night Owl' :
                 '⚖️ Flexible'}
              </span>
            </div>
          )}

          {energyProfile.optimalStudyTimes.length > 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Best study times: {energyProfile.optimalStudyTimes.slice(0, 3).map(slot => 
                `${slot.startHour}:00-${slot.endHour}:00`
              ).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <QuickTracker />
      {showFullTracker && <FullTracker />}
      <SuggestionsPanel />
    </div>
  );
};

export default EnergyTracker;