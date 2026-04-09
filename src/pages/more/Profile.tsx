import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { User } from "lucide-react";

const Profile = () => {
  const { user, profile, loading } = useAuth();

  if (loading || !user || !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Laster...</p>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profil</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-snug">
          Dine profildetaljer og brukerinformasjon
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-muted/60">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">Navn</p>
            <p className="text-base font-semibold tracking-tight">{profile.name}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">E-post</p>
            <p className="text-base font-semibold tracking-tight break-all">{user.email}</p>
          </div>

          {profile.organization_name && (
            <div className="pt-3 border-t border-border/30">
              <p className="text-sm text-muted-foreground mb-1">Organisasjon</p>
              <p className="text-base font-semibold tracking-tight">{profile.organization_name}</p>
            </div>
          )}

          {profile.organization_number && (
            <div className="pt-3 border-t border-border/30">
              <p className="text-sm text-muted-foreground mb-1">Organisasjonsnummer</p>
              <p className="text-base font-semibold tracking-tight font-mono">{profile.organization_number}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Profile;
