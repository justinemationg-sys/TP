import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { RealTimeContext, SmartSuggestion, PersonalizedInsight } from '../types-user-experience';
import { getCurrentContext } from '../utils/energy-management';

interface RealTimeContextState {
  context: RealTimeContext;
  isUserActive: boolean;
  idleTime: number;
  sessionDuration: number;
  suggestions: SmartSuggestion[];
  insights: PersonalizedInsight[];
  
  // Actions
  recordActivity: () => void;
  startSession: () => void;
  endSession: () => void;
  addSuggestion: (suggestion: SmartSuggestion) => void;
  dismissSuggestion: (id: string) => void;
}

const RealTimeContextContext = createContext<RealTimeContextState | null>(null);

export const useRealTimeContext = () => {
  const context = useContext(RealTimeContextContext);
  if (!context) {
    throw new Error('useRealTimeContext must be used within RealTimeContextProvider');
  }
  return context;
};

interface RealTimeContextProviderProps {
  children: React.ReactNode;
  onContextChange?: (context: RealTimeContext) => void;
  onSuggestion?: (suggestion: SmartSuggestion) => void;
}

export const RealTimeContextProvider: React.FC<RealTimeContextProviderProps> = ({
  children,
  onContextChange,
  onSuggestion
}) => {
  const [context, setContext] = useState<RealTimeContext>(getCurrentContext());
  const [isUserActive, setIsUserActive] = useState(true);
  const [idleTime, setIdleTime] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isInSession, setIsInSession] = useState(false);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [insights, setInsights] = useState<PersonalizedInsight[]>([]);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Activity tracking
  const recordActivity = useCallback(() => {
    setLastActivity(Date.now());
    setIsUserActive(true);
    setIdleTime(0);
  }, []);

  // Session management
  const startSession = useCallback(() => {
    setIsInSession(true);
    setSessionDuration(0);
    recordActivity();
  }, [recordActivity]);

  const endSession = useCallback(() => {
    setIsInSession(false);
    setSessionDuration(0);
  }, []);

  // Suggestion management
  const addSuggestion = useCallback((suggestion: SmartSuggestion) => {
    setSuggestions(prev => {
      // Avoid duplicates
      if (prev.some(s => s.id === suggestion.id)) return prev;
      
      // Add new suggestion and sort by priority
      const newSuggestions = [...prev, suggestion].sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      // Keep only top 5 suggestions
      return newSuggestions.slice(0, 5);
    });
    
    if (onSuggestion) {
      onSuggestion(suggestion);
    }
  }, [onSuggestion]);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }, []);

  // Real-time monitoring effects
  useEffect(() => {
    // Update context every minute
    const contextInterval = setInterval(() => {
      const newContext = getCurrentContext();
      setContext(newContext);
      if (onContextChange) {
        onContextChange(newContext);
      }
    }, 60000); // 1 minute

    return () => clearInterval(contextInterval);
  }, [onContextChange]);

  useEffect(() => {
    // Activity monitoring
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      recordActivity();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [recordActivity]);

  useEffect(() => {
    // Idle time tracking
    const idleInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      const idleMinutes = Math.floor(timeSinceActivity / 60000);
      
      setIdleTime(idleMinutes);
      
      // Update user presence based on idle time
      if (idleMinutes > 5) {
        setIsUserActive(false);
        setContext(prev => ({ ...prev, userPresence: 'idle' }));
      } else if (idleMinutes > 15) {
        setContext(prev => ({ ...prev, userPresence: 'away' }));
      } else {
        setContext(prev => ({ ...prev, userPresence: 'active' }));
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(idleInterval);
  }, [lastActivity]);

  useEffect(() => {
    // Session duration tracking
    let sessionInterval: NodeJS.Timeout;
    
    if (isInSession) {
      sessionInterval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 60000); // Update every minute
    }

    return () => {
      if (sessionInterval) clearInterval(sessionInterval);
    };
  }, [isInSession]);

  // Smart suggestions based on context
  useEffect(() => {
    // Generate contextual suggestions
    if (isUserActive && !isInSession) {
      // Suggest starting a session if idle but active
      if (idleTime >= 2 && idleTime < 5) {
        addSuggestion({
          id: `idle-suggest-${Date.now()}`,
          type: 'context-based',
          priority: 'low',
          title: 'Ready to start studying?',
          description: 'You\'ve been active but not studying. Perfect time to begin a session!',
          actionText: 'Start Session',
          onAccept: () => {
            startSession();
            dismissSuggestion(`idle-suggest-${Date.now()}`);
          },
          onDismiss: () => dismissSuggestion(`idle-suggest-${Date.now()}`),
          icon: '📚',
          category: 'session',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        });
      }
    }

    // Suggest breaks during long sessions
    if (isInSession && sessionDuration >= 45) {
      addSuggestion({
        id: `break-suggest-${Date.now()}`,
        type: 'context-based',
        priority: 'medium',
        title: 'Time for a break?',
        description: `You've been studying for ${sessionDuration} minutes. Consider taking a short break.`,
        actionText: 'Take Break',
        onAccept: () => {
          endSession();
          dismissSuggestion(`break-suggest-${Date.now()}`);
        },
        onDismiss: () => dismissSuggestion(`break-suggest-${Date.now()}`),
        icon: '☕',
        category: 'break'
      });
    }

    // Suggest ending session if user becomes idle during session
    if (isInSession && !isUserActive) {
      addSuggestion({
        id: `idle-end-${Date.now()}`,
        type: 'context-based',
        priority: 'high',
        title: 'Still studying?',
        description: 'You seem to be away. Would you like to end this session?',
        actionText: 'End Session',
        onAccept: () => {
          endSession();
          dismissSuggestion(`idle-end-${Date.now()}`);
        },
        onDismiss: () => dismissSuggestion(`idle-end-${Date.now()}`),
        icon: '💤',
        category: 'session'
      });
    }
  }, [isUserActive, isInSession, idleTime, sessionDuration, addSuggestion, dismissSuggestion, startSession, endSession]);

  // Clean up expired suggestions
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      setSuggestions(prev => 
        prev.filter(s => !s.expiresAt || new Date(s.expiresAt) > now)
      );
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  // Device-specific adaptations
  useEffect(() => {
    // Battery monitoring for mobile devices
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryInfo = () => {
          setContext(prev => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100)
          }));

          // Suggest power-saving mode on low battery
          if (battery.level < 0.2) {
            addSuggestion({
              id: `battery-low-${Date.now()}`,
              type: 'context-based',
              priority: 'high',
              title: 'Low Battery Detected',
              description: 'Your device battery is low. Consider shorter sessions or finding a charger.',
              actionText: 'Got it',
              onAccept: () => dismissSuggestion(`battery-low-${Date.now()}`),
              onDismiss: () => dismissSuggestion(`battery-low-${Date.now()}`),
              icon: '🔋',
              category: 'session'
            });
          }
        };

        battery.addEventListener('levelchange', updateBatteryInfo);
        updateBatteryInfo();
      });
    }

    // Network status monitoring
    const updateOnlineStatus = () => {
      setContext(prev => ({
        ...prev,
        networkStatus: navigator.onLine ? 'online' : 'offline'
      }));

      if (!navigator.onLine) {
        addSuggestion({
          id: `offline-${Date.now()}`,
          type: 'context-based',
          priority: 'medium',
          title: 'You\'re offline',
          description: 'No internet connection. Focus on offline tasks or review materials.',
          actionText: 'Continue offline',
          onAccept: () => dismissSuggestion(`offline-${Date.now()}`),
          onDismiss: () => dismissSuggestion(`offline-${Date.now()}`),
          icon: '📡',
          category: 'session'
        });
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [addSuggestion, dismissSuggestion]);

  // Time-based suggestions
  useEffect(() => {
    const timeBasedInterval = setInterval(() => {
      const currentHour = new Date().getHours();
      
      // Late night warning
      if (currentHour >= 23 || currentHour <= 5) {
        addSuggestion({
          id: `late-night-${Date.now()}`,
          type: 'context-based',
          priority: 'medium',
          title: 'It\'s getting late',
          description: 'Consider wrapping up for better sleep and tomorrow\'s productivity.',
          actionText: 'Finish up',
          onAccept: () => {
            endSession();
            dismissSuggestion(`late-night-${Date.now()}`);
          },
          onDismiss: () => dismissSuggestion(`late-night-${Date.now()}`),
          icon: '🌙',
          category: 'session'
        });
      }

      // Meal time reminders
      if ([12, 18].includes(currentHour)) {
        addSuggestion({
          id: `meal-time-${Date.now()}`,
          type: 'context-based',
          priority: 'low',
          title: 'Meal time!',
          description: 'Don\'t forget to eat. Proper nutrition helps maintain energy levels.',
          actionText: 'Take break',
          onAccept: () => dismissSuggestion(`meal-time-${Date.now()}`),
          onDismiss: () => dismissSuggestion(`meal-time-${Date.now()}`),
          icon: '🍽️',
          category: 'break'
        });
      }
    }, 30 * 60 * 1000); // Check every 30 minutes

    return () => clearInterval(timeBasedInterval);
  }, [addSuggestion, dismissSuggestion, endSession]);

  const value: RealTimeContextState = {
    context,
    isUserActive,
    idleTime,
    sessionDuration,
    suggestions,
    insights,
    recordActivity,
    startSession,
    endSession,
    addSuggestion,
    dismissSuggestion
  };

  return (
    <RealTimeContextContext.Provider value={value}>
      {children}
    </RealTimeContextContext.Provider>
  );
};

// Hook for accessing specific parts of the context
export const useActivityMonitoring = () => {
  const { isUserActive, idleTime, recordActivity } = useRealTimeContext();
  return { isUserActive, idleTime, recordActivity };
};

export const useSessionTracking = () => {
  const { sessionDuration, startSession, endSession } = useRealTimeContext();
  return { sessionDuration, startSession, endSession };
};

export const useSuggestions = () => {
  const { suggestions, addSuggestion, dismissSuggestion } = useRealTimeContext();
  return { suggestions, addSuggestion, dismissSuggestion };
};