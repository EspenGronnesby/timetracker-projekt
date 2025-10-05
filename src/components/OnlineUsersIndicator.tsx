import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";

interface PresenceState {
  [key: string]: {
    userId: string;
    userName: string;
    projectId?: string;
    isActive: boolean;
    isDriving: boolean;
    online_at: string;
  }[];
}

interface OnlineUsersIndicatorProps {
  userId: string;
  userName: string;
  projectId?: string;
}

export const OnlineUsersIndicator = ({
  userId,
  userName,
  projectId,
}: OnlineUsersIndicatorProps) => {
  const [onlineUsers, setOnlineUsers] = useState<
    Array<{
      userName: string;
      isActive: boolean;
      isDriving: boolean;
    }>
  >([]);
  const [channel, setChannel] = useState<ReturnType<
    typeof supabase.channel
  > | null>(null);

  useEffect(() => {
    const channelName = projectId
      ? `project-${projectId}-presence`
      : "online-users";
    const presenceChannel = supabase.channel(channelName);

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState() as PresenceState;
        const users = Object.values(state)
          .flat()
          .filter((presence) => {
            if (projectId) {
              return presence.projectId === projectId;
            }
            return true;
          })
          .map((presence) => ({
            userName: presence.userName,
            isActive: presence.isActive,
            isDriving: presence.isDriving,
          }));

        const uniqueUsers = Array.from(
          new Map(users.map((user) => [user.userName, user])).values()
        );

        setOnlineUsers(uniqueUsers);
      })
      .subscribe();

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [projectId, userId, userName]);

  const trackPresence = async (isActive: boolean, isDriving: boolean) => {
    if (!channel) return;

    if (isActive || isDriving) {
      await channel.track({
        userId,
        userName,
        projectId: projectId || null,
        isActive,
        isDriving,
        online_at: new Date().toISOString(),
      });
    } else {
      await channel.untrack();
    }
  };

  useEffect(() => {
    (window as any).trackPresence = trackPresence;
    return () => {
      delete (window as any).trackPresence;
    };
  }, [channel]);

  const onlineCount = onlineUsers.length;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Users className="h-4 w-4" />
            {onlineCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 h-2 w-2 rounded-full border border-background" />
            )}
          </div>
          <span className="font-medium">{onlineCount}</span>
          <span className="hidden sm:inline">aktive</span>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">
            {projectId ? "Aktive på prosjekt" : "Aktive nå"}
          </h4>
          {onlineUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen aktive</p>
          ) : (
            <ul className="space-y-1">
              {onlineUsers.map((user, index) => (
                <li key={index} className="text-sm flex items-center gap-2">
                  <span className="h-2 w-2 bg-green-500 rounded-full" />
                  {user.userName === userName ? "Du" : user.userName}
                  {user.isActive && " (Timer)"}
                  {user.isDriving && " (Kjøring)"}
                </li>
              ))}
            </ul>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export const usePresenceTracking = () => {
  const trackPresence = (isActive: boolean, isDriving: boolean) => {
    if ((window as any).trackPresence) {
      (window as any).trackPresence(isActive, isDriving);
    }
  };

  return { trackPresence };
};
