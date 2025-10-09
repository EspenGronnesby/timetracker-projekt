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
import { GenerateReportDialog } from "@/components/GenerateReportDialog";
import { ManualTimeDialog } from "@/components/ManualTimeDialog";
import { ArrowLeft, Clock, Car, Package, User, Phone, Mail, MapPin, FileText, Lock, Share2, Copy, Check, Users, Trash2, CheckCircle2, Download } from "lucide-react";
import { formatTime, getTotalSeconds } from "@/lib/timeUtils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
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
  const isProjectOwner = teamMembers?.some(m => m.user_id === user?.id && m.role === 'owner');

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
  const handleManualStartTime = async (datetime: Date, comment: string) => {
    if (!activeEntry || !user) return;
    try {
      const currentTime = new Date();
      const elapsedSeconds = getTotalSeconds(datetime, currentTime);
      const {
        error
      } = await supabase.from('time_entries').update({
        start_time: datetime.toISOString(),
        is_manual: true,
        comment: comment
      }).eq('id', activeEntry.id);
      if (error) throw error;
      toast({
        title: "Starttid oppdatert",
        description: `Timer justert til ${elapsedSeconds > 0 ? formatTime(elapsedSeconds) : '0h 0m'}`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: error.message
      });
    }
  };
  const handleManualEndTime = async (datetime: Date, comment: string) => {
    if (!activeEntry || !user) return;
    try {
      const durationSeconds = getTotalSeconds(new Date(activeEntry.start_time), datetime);
      const {
        error
      } = await supabase.from('time_entries').update({
        end_time: datetime.toISOString(),
        duration_seconds: durationSeconds,
        is_manual: true,
        comment: comment
      }).eq('id', activeEntry.id);
      if (error) throw error;
      trackPresence(false, false);
      toast({
        title: "Sluttid registrert",
        description: `Total tid: ${formatTime(durationSeconds)}`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: error.message
      });
    }
  };
  const handleDeleteProject = async () => {
    if (!project || !user) return;
    try {
      const {
        error
      } = await supabase.from('projects').delete().eq('id', project.id);
      if (error) throw error;
      toast({
        title: "Prosjekt slettet",
        description: "Prosjektet er permanent slettet"
      });
      navigate('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Feil ved sletting",
        description: error.message
      });
    }
  };
  const handleToggleComplete = async () => {
    if (!project) return;
    try {
      const {
        error
      } = await supabase.from('projects').update({
        completed: !project.completed
      }).eq('id', project.id);
      if (error) throw error;
      toast({
        title: project.completed ? "Prosjekt gjenåpnet" : "Prosjekt fullført",
        description: project.completed ? "Prosjektet er aktivt igjen" : "Prosjektet er markert som fullført"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: error.message
      });
    }
  };
  const downloadPersonalData = () => {
    const data = {
      project: project.name,
      timeEntries: myTimeEntries,
      driveEntries: myDriveEntries,
      materials: myMaterials,
      totalTime: myTotalTime,
      totalKilometers: myTotalKm,
      totalMaterialCost: myTotalMaterialCost
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-personal-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleLeaveProject = async (downloadData: boolean) => {
    if (!project || !user) return;
    try {
      if (downloadData) {
        downloadPersonalData();
      }
      const {
        error
      } = await supabase.from('project_members').delete().eq('project_id', project.id).eq('user_id', user.id);
      if (error) throw error;
      toast({
        title: "Forlatt prosjekt",
        description: downloadData ? "Dine data er lastet ned" : "Du har forlatt prosjektet"
      });
      navigate('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: error.message
      });
    }
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
            <div className="flex items-center gap-2">
              {canViewSensitiveData && <GenerateReportDialog projectId={project.id} projectName={project.name} canAccess={canViewSensitiveData} />}
              
              {!inviteUrl && (isAdmin || isProjectCreator) && <Button variant="outline" size="icon" onClick={handleGenerateInvite} disabled={generating}>
                  <Share2 className="h-5 w-5" />
                </Button>}

              {isProjectOwner && <>
                  <Button variant={project.completed ? "outline" : "default"} size="icon" onClick={handleToggleComplete} className={project.completed ? "" : "bg-green-500 hover:bg-green-600"}>
                    <CheckCircle2 className="h-5 w-5" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Slett prosjekt?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Dette vil permanent slette prosjektet og alle tilhørende data.
                          Denne handlingen kan ikke angres.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteProject}>
                          Slett
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>}

              {!isProjectOwner && <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleLeaveProject(false)}>
                    Forlat prosjekt
                  </Button>
                  <Button variant="default" onClick={() => handleLeaveProject(true)} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Forlat og last ned data
                  </Button>
                </div>}
            </div>
          </div>
          <OnlineUsersIndicator userId={user.id} userName={profile.name} projectId={project.id} />
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <Card className="p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Kundeinformasjon</h2>
          {!canViewSensitiveData && <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
              <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                Kun admin og prosjektskaper kan se full kundeinformasjon
              </p>
            </div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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

        <Card className="p-4 sm:p-6">
          <Tabs value={statsView} onValueChange={v => setStatsView(v as "my" | "total")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-base sm:text-lg font-semibold">Statistikk</h2>
              <TabsList className="w-full sm:w-auto grid grid-cols-2">
                <TabsTrigger value="my" className="text-xs sm:text-sm">Min statistikk</TabsTrigger>
                <TabsTrigger value="total" className="text-xs sm:text-sm">Total statistikk</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="my" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">Min tid</p>
                      <p className="text-xl sm:text-2xl font-bold truncate">
                        {formatTime(activeEntry ? liveTime : myTotalTime)}
                      </p>
                      {activeEntry && <p className="text-xs text-primary">● Kjører nå</p>}
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-accent/10 rounded-lg">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Car className="h-5 w-5 sm:h-6 sm:w-6 text-accent flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Min kjøring
                      </p>
                      <p className="text-xl sm:text-2xl font-bold truncate">{myTotalKm.toFixed(1)} km</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Mine materialer
                      </p>
                      <p className="text-xl sm:text-2xl font-bold truncate">
                        {myTotalMaterialCost.toFixed(0)} kr
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            
          </Tabs>
        </Card>

        {(isAdmin || isProjectCreator) && <Card id="invites" className="p-3 sm:p-4">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Team & Invites
            </h2>
            
            <div className="space-y-2.5">
              {/* Team Members */}
              <div>
                <h3 className="text-xs font-medium mb-1.5">Team Members ({teamMembers?.length || 0})</h3>
                <div className="space-y-1.5">
                  {teamMembers && teamMembers.length > 0 ? teamMembers.map((member: any) => <div key={member.user_id} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{member.profiles?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {member.role === 'owner' ? '👑 Owner' : '👤 Member'} • {new Date(member.joined_at).toLocaleDateString('no-NO')}
                          </p>
                        </div>
                      </div>) : <p className="text-xs text-muted-foreground text-center py-2">Ingen teammedlemmer ennå</p>}
                </div>
              </div>
              
              {/* Invite Section */}
              <div className="pt-2 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1.5">
                  <h3 className="text-xs font-medium">Project Invites</h3>
                  <Button onClick={handleGenerateInvite} disabled={generating} size="sm" className="w-full sm:w-auto text-xs h-7">
                    <Share2 className="h-3 w-3 mr-1.5" />
                    {generating ? "Generating..." : "Generate New Invite"}
                  </Button>
                </div>
                
                {inviteUrl && <div className="mb-2 p-1.5 bg-green-500/10 border border-green-500/20 rounded">
                    <p className="text-[10px] text-muted-foreground mb-1">New invite link:</p>
                    <div className="flex gap-1.5">
                      <input type="text" value={inviteUrl} readOnly className="flex-1 px-2 py-1 text-xs border rounded bg-background min-w-0" />
                      <Button onClick={() => handleCopyInvite(inviteUrl)} size="icon" variant="outline" className="flex-shrink-0 h-7 w-7">
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>}
                
                {activeInvites && activeInvites.length > 0 && <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground mb-1">Active Invites:</p>
                    {activeInvites.map((invite: any) => <div key={invite.id} className="flex items-center gap-1.5 p-1.5 bg-muted/30 rounded text-xs">
                        <div className="flex-1 min-w-0">
                          <code className="text-[10px] bg-background px-1.5 py-0.5 rounded block truncate">
                            {window.location.origin}/join/{invite.invite_code}
                          </code>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Used {invite.use_count} times
                            {invite.max_uses && ` • ${invite.max_uses - invite.use_count} remaining`}
                            {invite.expires_at && ` • Expires ${new Date(invite.expires_at).toLocaleDateString('no-NO')}`}
                          </p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => handleCopyInvite(`${window.location.origin}/join/${invite.invite_code}`)} className="flex-shrink-0 h-7 w-7">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>)}
                  </div>}
              </div>
            </div>
          </Card>}

        <Card id="activity-log" className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base sm:text-lg font-semibold">Aktivitetslogg</h2>
              <div className="flex gap-2 flex-wrap">
                <ManualTimeDialog type="start" onSubmit={handleManualStartTime} disabled={!activeEntry} />
                <ManualTimeDialog type="end" onSubmit={handleManualEndTime} disabled={!activeEntry} />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant={activityFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActivityFilter("all")} className="hover:scale-105 transition-transform">
                Alle aktiviteter
              </Button>
              <Button variant={activityFilter === "time" ? "default" : "outline"} size="icon" onClick={() => setActivityFilter("time")} className="hover:scale-105 transition-transform h-9 w-9 sm:h-10 sm:w-10">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button variant={activityFilter === "drive" ? "default" : "outline"} size="icon" onClick={() => setActivityFilter("drive")} className="hover:scale-105 transition-transform h-9 w-9 sm:h-10 sm:w-10">
                <Car className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button variant={activityFilter === "material" ? "default" : "outline"} size="icon" onClick={() => setActivityFilter("material")} className="hover:scale-105 transition-transform h-9 w-9 sm:h-10 sm:w-10">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>

          {myActivities.length === 0 ? <p className="text-muted-foreground text-center py-6 sm:py-8 text-xs sm:text-sm">
              Ingen aktiviteter funnet
            </p> : <div className="space-y-2 sm:space-y-3">
              {myActivities.map((activity, index) => {
            if (activity.type === "time") {
              const entry = activity.data;
              return <div key={`time-${entry.id}`} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-primary/10">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Tidsregistrering</p>
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
                        {entry.end_time && <p className="text-xs sm:text-sm font-semibold text-primary">
                            {formatTime(entry.duration_seconds)}
                          </p>}
                      </div>
                    </div>;
            } else if (activity.type === "drive") {
              const entry = activity.data;
              return <div key={`drive-${entry.id}`} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-accent/10">
                      <Car className="h-4 w-4 sm:h-5 sm:w-5 text-accent mt-0.5 flex-shrink-0" />
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Kjøring</p>
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
                        {entry.kilometers !== null && <p className="text-xs sm:text-sm font-semibold text-accent">
                            {entry.kilometers} km
                          </p>}
                      </div>
                    </div>;
            } else {
              const material = activity.data;
              return <div key={`material-${material.id}`} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-secondary">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{material.name}</p>
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