import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface TimerNotificationSystemProps {
  onStopTimer: (projectId: string) => void;
}

export const TimerNotificationSystem = ({ onStopTimer }: TimerNotificationSystemProps) => {
  const { user } = useAuth();
  const notifiedTimers = useRef<Set<string>>(new Set());

  const { data: activeTimers = [] } = useQuery({
    queryKey: ['active-timers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, projects:project_id(name)')
        .eq('user_id', user.id)
        .is('end_time', null);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 60000, // Check every minute
  });

  useEffect(() => {
    if (!user) return;

    const checkLongRunningTimers = () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      activeTimers.forEach((timer) => {
        const startTime = new Date(timer.start_time);
        const hasBeenRunningFor3Hours = startTime < threeHoursAgo;
        const alreadyNotified = notifiedTimers.current.has(timer.id);

        if (hasBeenRunningFor3Hours && !alreadyNotified) {
          notifiedTimers.current.add(timer.id);

          // Browser notification
          if (Notification.permission === 'granted') {
            new Notification('Glemt å stoppe timer?', {
              body: `Din timer for "${(timer as any).projects?.name || 'Prosjekt'}" har vært aktiv i over 3 timer`,
              icon: '/favicon.ico',
              tag: `long-timer-${timer.id}`,
            });
          }

          // Toast notification with action
          toast.warning('Timer har vært aktiv i over 3 timer', {
            description: `"${(timer as any).projects?.name || 'Prosjekt'}" - Vil du stoppe den nå?`,
            action: {
              label: 'Stopp timer',
              onClick: () => onStopTimer(timer.project_id),
            },
            duration: 10000,
          });

          // Create database notification
          supabase.from('notifications').insert({
            user_id: user.id,
            type: 'timer_running_too_long',
            title: 'Glemt å stoppe timer?',
            message: `Din timer for "${(timer as any).projects?.name || 'Prosjekt'}" har vært aktiv i over 3 timer`,
            metadata: { timer_id: timer.id, project_id: timer.project_id },
          });
        }
      });
    };

    // Check immediately and then every 5 minutes
    checkLongRunningTimers();
    const interval = setInterval(checkLongRunningTimers, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [activeTimers, user, onStopTimer]);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return null; // This is a background component
};
