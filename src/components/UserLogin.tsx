import { User } from "@/types/project";
import { Button } from "@/components/ui/button";
import { UserCircle, Clock } from "lucide-react";

interface UserLoginProps {
  users: User[];
  onUserSelect: (user: User) => void;
}

export const UserLogin = ({ users, onUserSelect }: UserLoginProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-6 rounded-2xl shadow-lg inline-block mb-6">
            <Clock className="h-16 w-16 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">TimeTracker</h1>
          <p className="text-xl text-muted-foreground">Hvem er det som kobler på?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {users.map((user) => (
            <Button
              key={user.id}
              onClick={() => onUserSelect(user)}
              className="h-auto py-12 flex flex-col gap-4 bg-card hover:bg-accent/10 border-2 border-border hover:border-primary transition-all shadow-lg hover:shadow-xl"
              variant="outline"
            >
              <UserCircle className="h-20 w-20 text-primary" />
              <span className="text-2xl font-bold text-foreground">{user.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
