import { User } from "@/types/project";
import { Button } from "@/components/ui/button";
import { UserCircle, LogOut } from "lucide-react";

interface UserSelectorProps {
  users: User[];
  activeUser: User;
  onUserChange: (user: User) => void;
  onLogout?: () => void;
}

export const UserSelector = ({ users, activeUser, onUserChange, onLogout }: UserSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      <UserCircle className="h-5 w-5 text-muted-foreground" />
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
        {users.map((user) => (
          <Button
            key={user.id}
            variant={activeUser.id === user.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onUserChange(user)}
            className={`transition-all ${
              activeUser.id === user.id 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "hover:bg-secondary"
            }`}
          >
            {user.name}
          </Button>
        ))}
      </div>
      {onLogout && (
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Bytt bruker
        </Button>
      )}
    </div>
  );
};
