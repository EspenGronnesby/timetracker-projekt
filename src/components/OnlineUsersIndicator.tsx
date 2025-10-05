import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { useActiveUser } from "@/hooks/useActiveUser";

interface PresenceState {
  [key: string]: {
    userId: string;
    userName: string;
    online_at: string;
  }[];
}

export const OnlineUsersIndicator = () => {
  const { activeUser } = useActiveUser();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Create channel for presence tracking
    const presenceChannel = supabase.channel("online-users");

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState() as PresenceState;
        const users = Object.values(state)
          .flat()
          .map((presence) => presence.userName);
        setOnlineUsers([...new Set(users)]); // Remove duplicates
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        console.log("User joined:", newPresences);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        console.log("User left:", leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track this user's presence
          await presenceChannel.track({
            userId: activeUser.id,
            userName: activeUser.name,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(presenceChannel);

    // Cleanup on unmount
    return () => {
      presenceChannel.unsubscribe();
    };
  }, [activeUser.id, activeUser.name]);

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
          <span className="hidden sm:inline">online</span>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Online nå</h4>
          {onlineUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen online</p>
          ) : (
            <ul className="space-y-1">
              {onlineUsers.map((userName, index) => (
                <li
                  key={index}
                  className="text-sm flex items-center gap-2"
                >
                  <span className="h-2 w-2 bg-green-500 rounded-full" />
                  {userName === activeUser.name ? "Du" : userName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
