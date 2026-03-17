import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Settings, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  destructive?: boolean;
}

function MenuItem({ icon, label, description, onClick, destructive }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 w-full p-4 rounded-xl text-left transition-colors",
        "hover:bg-accent/50 active:bg-accent",
        destructive && "text-destructive hover:bg-destructive/10"
      )}
    >
      <div className={cn(
        "flex items-center justify-center h-10 w-10 rounded-lg",
        destructive ? "bg-destructive/10" : "bg-muted"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </button>
  );
}

export default function More() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  return (
    <div className="py-6 px-4 sm:px-6 max-w-lg mx-auto space-y-2">
      <MenuItem
        icon={<Settings className="h-5 w-5" />}
        label="Innstillinger"
        description="Tema, widgeter og visningspreferanser"
        onClick={() => navigate("/settings")}
      />

      {isAdmin && (
        <MenuItem
          icon={<Shield className="h-5 w-5" />}
          label="Admin"
          description="Administrer brukere og roller"
          onClick={() => navigate("/admin")}
        />
      )}

      <div className="border-t border-border/50 my-4" />

      <MenuItem
        icon={<LogOut className="h-5 w-5" />}
        label="Logg ut"
        onClick={signOut}
        destructive
      />
    </div>
  );
}
