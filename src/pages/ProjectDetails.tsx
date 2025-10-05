import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects, TimeEntry, DriveEntry, Material } from "@/hooks/useProjects";
import { useIsAdmin } from "@/hooks/useUserRole";
import { OnlineUsersIndicator, usePresenceTracking } from "@/components/OnlineUsersIndicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AddMaterialDialog } from "@/components/AddMaterialDialog";
import { DriveDialog } from "@/components/DriveDialog";
import { ArrowLeft, Clock, Car, Package, User, Phone, Mail, MapPin, FileText, Lock, Share2, Copy, Check, Users } from "lucide-react";
import { formatTime } from "@/lib/timeUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
const ProjectDetails = () => {
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    user,
    profile,
    loading
  } = useAuth();
  const {
    trackPresence
  } = usePresenceTracking();
  const {
    projects,
    timeEntries,
    driveEntries,
    materials,
    toggleProject,
    toggleDriving,
    addMaterial
  } = useProjects(user?.id);
  const [statsView, setStatsView] = useState<"my" | "total">("my");
  const [liveTime, setLiveTime] = useState(0);
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"all" | "time" | "drive" | "material">("all");
  const {
    toast
  } = useToast();

  // Find project early to use in all logic
  const project = projects.find(p => p.id === id);

  // Check if user is admin or project creator
  const isAdmin = useIsAdmin(user?.id);
  const isProjectCreator = project?.created_by === user?.id;
  const canViewSensitiveData = isAdmin || isProjectCreator;

  // Fetch team members
  const {
    data: teamMembers
  } = useQuery({
    queryKey: ["project-members", id],
    queryFn: async () => {
      if (!id) return [];
      const {
        data,
        error
      } = await supabase.from("project_members").select(`
          user_id,
          role,
          joined_at,
          profiles:user_id (name)
        `).eq("project_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Fetch active invites
  const {
    data: activeInvites
  } = useQuery({
    queryKey: ["project-invites", id],
    queryFn: async () => {
      if (!id) return [];
      const {
        data,
        error
      } = await supabase.from("project_invites").select("*").eq("project_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id && (isAdmin || isProjectCreator)
  });

  // Calculate data regardless of loading state to keep hooks consistent
  const projectTimeEntries = project ? timeEntries.filter(entry => entry.project_id === project.id) : [];
  const projectDriveEntries = project ? driveEntries.filter(entry => entry.project_id === project.id) : [];
  const projectMaterials = project ? materials.filter(material => material.project_id === project.id) : [];
  const myTimeEntries = user ? projectTimeEntries.filter(entry => entry.user_id === user.id) : [];
  const myDriveEntries = user ? projectDriveEntries.filter(entry => entry.user_id === user.id) : [];
  const myMaterials = user ? projectMaterials.filter(material => material.user_id === user.id) : [];
  const activeEntry = myTimeEntries.find(entry => !entry.end_time);
  const activeDrive = myDriveEntries.find(entry => !entry.end_time);
  const myTotalTime = myTimeEntries.filter(entry => entry.end_time).reduce((acc, entry) => acc + entry.duration_seconds, 0);
  const myTotalKm = myDriveEntries.reduce((acc, entry) => acc + (entry.kilometers || 0), 0);
  const myTotalMaterialCost = myMaterials.reduce((acc, material) => acc + material.total_price, 0);
  const totalTime = projectTimeEntries.filter(entry => entry.end_time).reduce((acc, entry) => acc + entry.duration_seconds, 0);
  const totalKm = projectDriveEntries.reduce((acc, entry) => acc + (entry.kilometers || 0), 0);
  const totalMaterialCost = projectMaterials.reduce((acc, material) => acc + material.total_price, 0);

  // ALL useEffects MUST be before any conditional returns
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  useEffect(() => {
    if (!activeEntry) {
      setLiveTime(myTotalTime);
      return;
    }
    const updateTime = () => {
      const elapsed = Math.floor((Date.now() - new Date(activeEntry.start_time).getTime()) / 1000);
      setLiveTime(myTotalTime + elapsed);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeEntry, myTotalTime]);

  // NOW we can do conditional returns after all hooks
  if (loading || !user || !profile) {
    return <div className="min-h-screen flex items-center justify-center">
        <p>Laster...</p>
      </div>;
  }
  if (!project) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Prosjekt ikke funnet</h2>
          <Button onClick={() => navigate("/")}>Tilbake til oversikt</Button>
        </div>
      </div>;
  }

  // These are already calculated at the top, remove duplicates

  const handleToggleProject = () => {
    const isActive = !!activeEntry;
    toggleProject({
      projectId: project.id,
      userName: profile.name
    }, {
      onSuccess: () => {
        trackPresence(!isActive, false);
      }
    });
  };
  const handleToggleDriving = (kilometers?: number) => {
    const isDriving = !!activeDrive;
    toggleDriving({
      projectId: project.id,
      userName: profile.name,
      kilometers
    }, {
      onSuccess: () => {
        trackPresence(false, !isDriving);
      }
    });
  };
  type Activity = {
    type: "time";
    data: TimeEntry;
  } | {
    type: "drive";
    data: DriveEntry;
  } | {
    type: "material";
    data: Material;
  };
  const allActivities: Activity[] = [...projectTimeEntries.map(entry => ({
    type: "time" as const,
    data: entry
  })), ...projectDriveEntries.map(entry => ({
    type: "drive" as const,
    data: entry
  })), ...projectMaterials.map(material => ({
    type: "material" as const,
    data: material
  }))].sort((a, b) => {
    const dateA = a.type === "material" ? new Date(a.data.created_at) : new Date(a.data.start_time);
    const dateB = b.type === "material" ? new Date(b.data.created_at) : new Date(b.data.start_time);
    return dateB.getTime() - dateA.getTime();
  });
  const myActivities = allActivities.filter(activity => {
    if (activity.data.user_id !== user.id) return false;
    if (activityFilter === "all") return true;
    return activity.type === activityFilter;
  });
  const handleGenerateInvite = async () => {
    setGenerating(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-project-invite', {
        body: {
          projectId: id
        }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setInviteUrl(data.inviteUrl);
      toast({
        title: "Invite generated!",
        description: "Share the link below with your team."
      });
    } catch (err: any) {
      console.error('Error generating invite:', err);
      toast({
        variant: "destructive",
        title: "Failed to generate invite",
        description: err.message
      });
    } finally {
      setGenerating(false);
    }
  };
  const handleCopyInvite = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard"
    });
    setTimeout(() => setCopied(false), 2000);
  };
  return <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 sm:gap-4 flex-1">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">{project.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {project.customer_name}
              </p>
            </div>
          </div>
          <OnlineUsersIndicator userId={user.id} userName={profile.name} projectId={project.id} />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Kundeinformasjon</h2>
          {!canViewSensitiveData && <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Kun admin og prosjektskaper kan se full kundeinformasjon
              </p>
            </div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Kundenavn</p>
                <p className="font-medium">
                  {canViewSensitiveData ? project.customer_name : '[Skjult]'}
                </p>
              </div>
            </div>
            {canViewSensitiveData && project.customer_address && <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium">{project.customer_address}</p>
                </div>
              </div>}
            {canViewSensitiveData && project.customer_phone && <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefon</p>
                  <p className="font-medium">{project.customer_phone}</p>
                </div>
              </div>}
            {canViewSensitiveData && project.customer_email && <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">E-post</p>
                  <p className="font-medium">{project.customer_email}</p>
                </div>
              </div>}
            {project.contract_number && <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Avtalenummer</p>
                  <p className="font-medium">{project.contract_number}</p>
                </div>
              </div>}
            {project.description && <div className="flex items-start gap-3 md:col-span-2">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Beskrivelse</p>
                  <p className="font-medium">{project.description}</p>
                </div>
              </div>}
          </div>
        </Card>

        <Card className="p-6">
          <Tabs value={statsView} onValueChange={v => setStatsView(v as "my" | "total")}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Statistikk</h2>
              <TabsList>
                <TabsTrigger value="my">Min statistikk</TabsTrigger>
                <TabsTrigger value="total">Total statistikk</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="my" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Min tid</p>
                      <p className="text-2xl font-bold">
                        {formatTime(activeEntry ? liveTime : myTotalTime)}
                      </p>
                      {activeEntry && <p className="text-xs text-primary">● Kjører nå</p>}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Car className="h-6 w-6 text-accent" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Min kjøring
                      </p>
                      <p className="text-2xl font-bold">{myTotalKm.toFixed(1)} km</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-6 w-6" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Mine materialer
                      </p>
                      <p className="text-2xl font-bold">
                        {myTotalMaterialCost.toFixed(0)} kr
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="total" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total tid</p>
                      <p className="text-2xl font-bold">{formatTime(totalTime)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Car className="h-6 w-6 text-accent" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total kjøring
                      </p>
                      <p className="text-2xl font-bold">{totalKm.toFixed(1)} km</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-6 w-6" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Materialkostnad
                      </p>
                      <p className="text-2xl font-bold">
                        {totalMaterialCost.toFixed(0)} kr
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {(isAdmin || isProjectCreator) && <Card id="invites" className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team & Invites
            </h2>
            
            <div className="space-y-6">
              {/* Team Members */}
              <div>
                <h3 className="text-sm font-medium mb-3">Team Members ({teamMembers?.length || 0})</h3>
                <div className="space-y-2">
                  {teamMembers?.map((member: any) => <div key={member.user_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{member.profiles?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.role === 'owner' ? '👑 Owner' : '👤 Member'} • Joined {new Date(member.joined_at).toLocaleDateString('no-NO')}
                        </p>
                      </div>
                    </div>)}
                </div>
              </div>
              
              {/* Invite Section */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Project Invites</h3>
                  <Button onClick={handleGenerateInvite} disabled={generating} size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    {generating ? "Generating..." : "Generate New Invite"}
                  </Button>
                </div>
                
                {inviteUrl && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">New invite link:</p>
                    <div className="flex gap-2">
                      <input type="text" value={inviteUrl} readOnly className="flex-1 px-3 py-2 text-sm border rounded-md bg-background" />
                      <Button onClick={() => handleCopyInvite(inviteUrl)} size="icon" variant="outline">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>}
                
                {activeInvites && activeInvites.length > 0 && <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">Active Invites:</p>
                    {activeInvites.map((invite: any) => <div key={invite.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                        <div className="flex-1">
                          <code className="text-xs bg-background px-2 py-1 rounded">
                            {window.location.origin}/join/{invite.invite_code}
                          </code>
                          <p className="text-xs text-muted-foreground mt-1">
                            Used {invite.use_count} times
                            {invite.max_uses && ` • ${invite.max_uses - invite.use_count} remaining`}
                            {invite.expires_at && ` • Expires ${new Date(invite.expires_at).toLocaleDateString('no-NO')}`}
                          </p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => handleCopyInvite(`${window.location.origin}/join/${invite.invite_code}`)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>)}
                  </div>}
              </div>
            </div>
          </Card>}

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          

          <div onClick={() => {
          if (!activeDrive) {
            setActivityFilter("drive");
            document.getElementById("activity-log")?.scrollIntoView({
              behavior: "smooth"
            });
          }
        }}>
            <DriveDialog isDriving={!!activeDrive} onToggleDriving={handleToggleDriving} />
          </div>

          <div onClick={() => {
          setActivityFilter("material");
          document.getElementById("activity-log")?.scrollIntoView({
            behavior: "smooth"
          });
        }}>
            <AddMaterialDialog onAddMaterial={(name, quantity, unitPrice) => addMaterial({
            projectId: project.id,
            userName: profile.name,
            name,
            quantity,
            unitPrice
          })} />
          </div>
        </div>

        <Card id="activity-log" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Aktivitetslogg</h2>
            <div className="flex gap-2">
              <Button variant={activityFilter === "all" ? "default" : "outline"} size="icon" onClick={() => setActivityFilter("all")} className="hover:scale-105 transition-transform">
                <FileText className="h-5 w-5" />
              </Button>
              <Button variant={activityFilter === "time" ? "default" : "outline"} size="icon" onClick={() => setActivityFilter("time")} className="hover:scale-105 transition-transform">
                <Clock className="h-5 w-5" />
              </Button>
              <Button variant={activityFilter === "drive" ? "default" : "outline"} size="icon" onClick={() => setActivityFilter("drive")} className="hover:scale-105 transition-transform">
                <Car className="h-5 w-5" />
              </Button>
              <Button variant={activityFilter === "material" ? "default" : "outline"} size="icon" onClick={() => setActivityFilter("material")} className="hover:scale-105 transition-transform">
                <Package className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {myActivities.length === 0 ? <p className="text-muted-foreground text-center py-8">
              Ingen aktiviteter funnet
            </p> : <div className="space-y-3">
              {myActivities.map((activity, index) => {
            if (activity.type === "time") {
              const entry = activity.data;
              return <div key={`time-${entry.id}`} className="flex items-start gap-3 p-3 rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                     <div className="flex-1 min-w-0">
                        <p className="font-medium">Tidsregistrering</p>
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">
                          {new Date(entry.start_time).toLocaleString("no-NO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                          {entry.end_time && ` - ${new Date(entry.end_time).toLocaleString("no-NO", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}`}
                        </p>
                        {entry.end_time && <p className="text-sm font-semibold text-primary">
                            {formatTime(entry.duration_seconds)}
                          </p>}
                      </div>
                    </div>;
            } else if (activity.type === "drive") {
              const entry = activity.data;
              return <div key={`drive-${entry.id}`} className="flex items-start gap-3 p-3 rounded-lg bg-accent/10">
                      <Car className="h-5 w-5 text-accent mt-0.5" />
                     <div className="flex-1 min-w-0">
                        <p className="font-medium">Kjøring</p>
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">
                          {new Date(entry.start_time).toLocaleString("no-NO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                          {entry.end_time && ` - ${new Date(entry.end_time).toLocaleString("no-NO", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}`}
                        </p>
                        {entry.kilometers !== null && <p className="text-sm font-semibold text-accent">
                            {entry.kilometers} km
                          </p>}
                      </div>
                    </div>;
            } else {
              const material = activity.data;
              return <div key={`material-${material.id}`} className="flex items-start gap-3 p-3 rounded-lg bg-secondary">
                      <Package className="h-5 w-5 mt-0.5" />
                     <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{material.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {new Date(material.created_at).toLocaleString("no-NO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                        </p>
                        <p className="text-sm font-semibold break-words">
                          {material.quantity} stk × {material.unit_price} kr ={" "}
                          {material.total_price} kr
                        </p>
                      </div>
                    </div>;
            }
          })}
            </div>}
        </Card>
      </div>
    </div>;
};
export default ProjectDetails;