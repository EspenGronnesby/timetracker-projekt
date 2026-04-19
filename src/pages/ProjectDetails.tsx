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
import { EditEntryDialog } from "@/components/EditEntryDialog";
import { ProjectCostCalculator } from "@/components/ProjectCostCalculator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Clock, Car, Package, User, Phone, Mail, MapPin, FileText, Lock, Share2, Copy, Check, Users, Trash2, CheckCircle2, Download, Pencil } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
    addMaterial,
    updateTimeEntry,
    updateDriveEntry,
    updateMaterial,
    deleteTimeEntry,
    deleteDriveEntry,
    deleteMaterial,
  } = useProjects(user?.id);

  const handleDeleteEntry = (type: "time" | "drive" | "material", entryId: string) => {
    if (type === "time") deleteTimeEntry(entryId);
    else if (type === "drive") deleteDriveEntry(entryId);
    else if (type === "material") deleteMaterial(entryId);
  };
  const [statsView, setStatsView] = useState<"my" | "total">("my");
  const [liveTime, setLiveTime] = useState(0);
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"all" | "time" | "drive" | "material">("all");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<{ type: "time" | "drive" | "material"; data: any } | null>(null);
  const {
    toast
  } = useToast();

  // Find project early to use in all logic
  const project = projects.find(p => p.id === id);

  // Check if user is admin or project creator
  const isAdmin = useIsAdmin(user?.id);
  const isProjectCreator = project?.created_by === user?.id;

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
  const isProjectMember = teamMembers?.some(m => m.user_id === user?.id);
  const canViewSensitiveData = isAdmin || isProjectOwner || !project?.hide_customer_info;

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
          <Button onClick={() => navigate("/app")}>Tilbake til oversikt</Button>
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
  const handleToggleDriving = (kilometers?: number, startLocation?: any, endLocation?: any, routeData?: any) => {
    const isDriving = !!activeDrive;
    toggleDriving({
      projectId: project.id,
      userName: profile.name,
      kilometers,
      startLocation,
      endLocation,
      routeData,
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
        title: "Invitasjon generert!",
        description: "Del lenken nedenfor med teamet ditt."
      });
    } catch (err: any) {
      console.error('Error generating invite:', err);
      toast({
        variant: "destructive",
        title: "Kunne ikke generere invitasjon",
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
      title: "Kopiert!",
      description: "Invitasjonslenke kopiert til utklippstavlen"
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
  const handleDeleteProject = async (downloadData: boolean) => {
    if (!project || !user) return;
    try {
      if (downloadData) {
        downloadAllDataAsExcel();
      }
      
      const {
        error
      } = await supabase.from('projects').delete().eq('id', project.id);
      if (error) throw error;
      toast({
        title: "Prosjekt slettet",
        description: downloadData ? "Data lastet ned og prosjekt slettet" : "Prosjektet er permanent slettet"
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
  const downloadPersonalDataAsPDF = () => {
    if (!project || !user || !teamMembers) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Sluttattest', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Prosjekt: ${project.name}`, 20, 40);
    doc.text(`Kunde: ${project.customer_name}`, 20, 50);
    doc.text(`Medarbeider: ${profile?.name || 'Ukjent'}`, 20, 60);
    
    // Find join date
    const memberInfo = teamMembers.find(m => m.user_id === user.id);
    const joinDate = memberInfo ? new Date(memberInfo.joined_at).toLocaleDateString('no-NO') : 'Ukjent';
    const leaveDate = new Date().toLocaleDateString('no-NO');
    
    doc.text(`Periode: ${joinDate} - ${leaveDate}`, 20, 70);
    
    // Summary section
    doc.setFontSize(14);
    doc.text('Oppsummering', 20, 90);
    
    doc.setFontSize(11);
    doc.text(`Total arbeidstid: ${formatTime(myTotalTime)}`, 30, 100);
    doc.text(`Total kjøring: ${myTotalKm.toFixed(1)} km`, 30, 110);
    doc.text(`Total materialkostnad: ${myTotalMaterialCost.toFixed(2)} kr`, 30, 120);
    
    // Time entries table
    if (myTimeEntries.length > 0) {
      doc.setFontSize(14);
      doc.text('Tidsregistreringer', 20, 140);
      
      const timeData = myTimeEntries
        .filter(e => e.end_time)
        .map(entry => [
          new Date(entry.start_time).toLocaleDateString('no-NO'),
          new Date(entry.start_time).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
          entry.end_time ? new Date(entry.end_time).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }) : '-',
          formatTime(entry.duration_seconds)
        ]);
      
      autoTable(doc, {
        startY: 145,
        head: [['Dato', 'Start', 'Slutt', 'Varighet']],
        body: timeData,
        theme: 'striped',
        styles: { fontSize: 9 }
      });
    }
    
    // Drive entries table
    if (myDriveEntries.length > 0 && myTotalKm > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 145;
      doc.setFontSize(14);
      doc.text('Kjøring', 20, finalY + 15);
      
      const driveData = myDriveEntries
        .filter(e => e.kilometers)
        .map(entry => [
          new Date(entry.start_time).toLocaleDateString('no-NO'),
          `${entry.kilometers} km`
        ]);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Dato', 'Kilometer']],
        body: driveData,
        theme: 'striped',
        styles: { fontSize: 9 }
      });
    }
    
    doc.save(`${project.name}-sluttattest.pdf`);
  };

  const downloadAllDataAsExcel = () => {
    if (!project) return;

    const wb = XLSX.utils.book_new();
    
    // Project info sheet
    const projectInfo = [
      ['Prosjektnavn', project.name],
      ['Kunde', project.customer_name],
      ['Adresse', project.customer_address || ''],
      ['Telefon', project.customer_phone || ''],
      ['E-post', project.customer_email || ''],
      ['Avtalenummer', project.contract_number || ''],
      ['Beskrivelse', project.description || ''],
      ['Opprettet', new Date(project.created_at).toLocaleDateString('no-NO')],
      [''],
      ['Total arbeidstid', formatTime(totalTime)],
      ['Total kjøring', `${totalKm.toFixed(1)} km`],
      ['Total materialkostnad', `${totalMaterialCost.toFixed(2)} kr`]
    ];
    const wsProject = XLSX.utils.aoa_to_sheet(projectInfo);
    XLSX.utils.book_append_sheet(wb, wsProject, 'Prosjektinfo');
    
    // Team members sheet
    if (teamMembers && teamMembers.length > 0) {
      const membersData = teamMembers.map((m: any) => ({
        'Navn': m.profiles?.name || 'Ukjent',
        'Rolle': m.role === 'owner' ? 'Eier' : 'Medlem',
        'Ble med': new Date(m.joined_at).toLocaleDateString('no-NO')
      }));
      const wsMembers = XLSX.utils.json_to_sheet(membersData);
      XLSX.utils.book_append_sheet(wb, wsMembers, 'Teammedlemmer');
    }
    
    // Time entries sheet
    if (projectTimeEntries.length > 0) {
      const timeData = projectTimeEntries
        .filter(e => e.end_time)
        .map(entry => ({
          'Medarbeider': entry.user_name,
          'Dato': new Date(entry.start_time).toLocaleDateString('no-NO'),
          'Starttid': new Date(entry.start_time).toLocaleTimeString('no-NO'),
          'Sluttid': entry.end_time ? new Date(entry.end_time).toLocaleTimeString('no-NO') : '',
          'Varighet': formatTime(entry.duration_seconds),
          'Kommentar': entry.comment || ''
        }));
      const wsTime = XLSX.utils.json_to_sheet(timeData);
      XLSX.utils.book_append_sheet(wb, wsTime, 'Tidsregistrering');
    }
    
    // Drive entries sheet
    if (projectDriveEntries.length > 0) {
      const driveData = projectDriveEntries
        .filter(e => e.kilometers)
        .map(entry => ({
          'Medarbeider': entry.user_name,
          'Dato': new Date(entry.start_time).toLocaleDateString('no-NO'),
          'Kilometer': entry.kilometers
        }));
      const wsDrive = XLSX.utils.json_to_sheet(driveData);
      XLSX.utils.book_append_sheet(wb, wsDrive, 'Kjøring');
    }
    
    // Materials sheet
    if (projectMaterials.length > 0) {
      const materialsData = projectMaterials.map(material => ({
        'Medarbeider': material.user_name,
        'Dato': new Date(material.created_at).toLocaleDateString('no-NO'),
        'Navn': material.name,
        'Antall': material.quantity,
        'Enhetspris': `${material.unit_price} kr`,
        'Totalpris': `${material.total_price} kr`
      }));
      const wsMaterials = XLSX.utils.json_to_sheet(materialsData);
      XLSX.utils.book_append_sheet(wb, wsMaterials, 'Materialer');
    }
    
    XLSX.writeFile(wb, `${project.name}-fullstendig-rapport.xlsx`);
  };
  const handleLeaveProject = async (downloadData: boolean) => {
    if (!project || !user) return;
    try {
      if (downloadData) {
        downloadPersonalDataAsPDF();
      }
      const {
        error
      } = await supabase.from('project_members').delete().eq('project_id', project.id).eq('user_id', user.id);
      if (error) throw error;
      toast({
        title: "Forlatt prosjekt",
        description: downloadData ? "Sluttattest lastet ned som PDF" : "Du har forlatt prosjektet"
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
  return <div className="min-h-screen bg-background animate-fade-in">
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")} aria-label="Tilbake" className="shrink-0 h-11 w-11 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate tracking-tight">{project.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate leading-snug">
              {project.customer_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile?.show_cost_calculator && (
              <ProjectCostCalculator projectId={project.id} userId={user.id} />
            )}
            <OnlineUsersIndicator userId={user.id} userName={profile.name} projectId={project.id} />
          </div>
        </div>
      </header>

      {/* Action Icons Bar */}
      {profile?.show_project_actions && (
        <div className="border-b border-border bg-card/50 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-1.5">
            <TooltipProvider>
              {/* Generate Report Button */}
              {canViewSensitiveData && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <GenerateReportDialog projectId={project.id} projectName={project.name} canAccess={canViewSensitiveData} iconOnly={true} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Generer rapport</TooltipContent>
                </Tooltip>
              )}

              {/* Generate Invite Button */}
              {(isProjectOwner || isProjectCreator) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleGenerateInvite}
                      disabled={generating}
                      variant="ghost"
                      size="icon"
                      aria-label="Generer invitasjon"
                      className="h-11 w-11 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Generer invitasjon</TooltipContent>
                </Tooltip>
              )}

              {/* Delete Project Button */}
              {(isProjectOwner || isProjectCreator) && (
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Slett prosjekt"
                            className="h-11 w-11 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Slett prosjekt</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Slett prosjekt</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dette vil permanent slette prosjektet og alle tilhørende data (timer, kjøring, materialer).
                        Denne handlingen kan ikke angres.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Vil du laste ned all prosjektdata som Excel-fil før sletting?
                      </p>
                    </div>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction onClick={(e) => {
                        e.preventDefault();
                        handleDeleteProject(false);
                      }} className="bg-destructive hover:bg-destructive/90">
                        Slett uten nedlasting
                      </AlertDialogAction>
                      <AlertDialogAction onClick={(e) => {
                        e.preventDefault();
                        handleDeleteProject(true);
                      }} className="bg-primary hover:bg-primary/90">
                        Last ned Excel og slett
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Leave Project Button */}
              {!isProjectOwner && !isProjectCreator && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => handleLeaveProject(true)}
                      variant="ghost"
                      size="icon"
                      aria-label="Forlat prosjekt"
                      className="h-11 w-11 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Forlat og last ned data</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <Card className="p-4 sm:p-6 rounded-2xl">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 tracking-tight">Kundeinformasjon</h2>
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

        <Card className="p-4 sm:p-6 rounded-2xl">
          <Tabs value={statsView} onValueChange={v => setStatsView(v as "my" | "total")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight">Statistikk</h2>
              <TabsList className="w-full sm:w-auto grid grid-cols-2">
                <TabsTrigger value="my" className="text-xs sm:text-sm">Min statistikk</TabsTrigger>
                <TabsTrigger value="total" className="text-xs sm:text-sm">Total statistikk</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="my" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-primary/10 rounded-xl">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-11 w-11 flex items-center justify-center rounded-lg bg-primary/20 flex-shrink-0">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-snug">Min tid</p>
                      <p className="text-xl sm:text-2xl font-bold truncate tabular-nums">
                        {formatTime(activeEntry ? liveTime : myTotalTime)}
                      </p>
                      {activeEntry && <p className="text-xs text-primary leading-snug">● Kjører nå</p>}
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-accent/10 rounded-xl">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-11 w-11 flex items-center justify-center rounded-lg bg-accent/20 flex-shrink-0">
                      <Car className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
                        Min kjøring
                      </p>
                      <p className="text-xl sm:text-2xl font-bold truncate tabular-nums">{myTotalKm.toFixed(1)} km</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-secondary rounded-xl">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-11 w-11 flex items-center justify-center rounded-lg bg-secondary/80 flex-shrink-0">
                      <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
                        Mine materialer
                      </p>
                      <p className="text-xl sm:text-2xl font-bold truncate tabular-nums">
                        {myTotalMaterialCost.toFixed(0)} kr
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="total" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-primary/10 rounded-xl">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-11 w-11 flex items-center justify-center rounded-lg bg-primary/20 flex-shrink-0">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-snug">Total tid</p>
                      <p className="text-xl sm:text-2xl font-bold truncate tabular-nums">{formatTime(totalTime)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-accent/10 rounded-xl">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-11 w-11 flex items-center justify-center rounded-lg bg-accent/20 flex-shrink-0">
                      <Car className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
                        Total kjøring
                      </p>
                      <p className="text-xl sm:text-2xl font-bold truncate tabular-nums">{totalKm.toFixed(1)} km</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-secondary rounded-xl">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-11 w-11 flex items-center justify-center rounded-lg bg-secondary/80 flex-shrink-0">
                      <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
                        Materialkostnad
                      </p>
                      <p className="text-xl sm:text-2xl font-bold truncate tabular-nums">
                        {totalMaterialCost.toFixed(0)} kr
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>


        {profile?.show_team_invite && (isAdmin || isProjectCreator) && <Card id="invites" className="p-3 sm:p-4 rounded-2xl">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5 tracking-tight">
              <div className="h-11 w-11 flex items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              Team og invitasjoner
            </h2>
            
            <div className="space-y-2.5">
              {/* Team Members */}
              <div>
                <h3 className="text-xs font-medium mb-1.5">Teammedlemmer ({teamMembers?.length || 0})</h3>
                <div className="space-y-1.5">
                  {teamMembers && teamMembers.length > 0 ? teamMembers.map((member: any) => <div key={member.user_id} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{member.profiles?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {member.role === 'owner' ? '👑 Eier' : '👤 Medlem'} • {new Date(member.joined_at).toLocaleDateString('no-NO')}
                          </p>
                        </div>
                      </div>) : <p className="text-xs text-muted-foreground text-center py-2">Ingen teammedlemmer ennå</p>}
                </div>
              </div>
              
              {/* Invite Section */}
              <div className="pt-2 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1.5">
                  <h3 className="text-xs font-medium">Prosjektinvitasjoner</h3>
                  <Button onClick={handleGenerateInvite} disabled={generating} size="sm" className="w-full sm:w-auto text-xs h-11 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl">
                    <Share2 className="h-3 w-3 mr-1.5" />
                    {generating ? "Genererer..." : "Generer ny invitasjon"}
                  </Button>
                </div>
                
                {inviteUrl && <div className="mb-2 p-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <p className="text-[10px] text-muted-foreground mb-1 leading-snug">Ny invitasjonslenke:</p>
                    <div className="flex gap-1.5">
                      <input type="text" value={inviteUrl} readOnly className="flex-1 px-2 py-1 text-xs border rounded-lg bg-background min-w-0" />
                      <Button onClick={() => handleCopyInvite(inviteUrl)} size="icon" variant="outline" aria-label="Kopier invitasjonslenke" className="flex-shrink-0 h-11 w-11 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg">
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>}
                
                {activeInvites && activeInvites.length > 0 && <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground mb-1">Aktive invitasjoner:</p>
                    {activeInvites.map((invite: any) => <div key={invite.id} className="flex items-center gap-1.5 p-1.5 bg-muted/30 rounded text-xs">
                        <div className="flex-1 min-w-0">
                          <code className="text-[10px] bg-background px-1.5 py-0.5 rounded block truncate">
                            {window.location.origin}/join/{invite.invite_code}
                          </code>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Brukt {invite.use_count} ganger
                            {invite.max_uses && ` • ${invite.max_uses - invite.use_count} gjenstår`}
                            {invite.expires_at && ` • Utløper ${new Date(invite.expires_at).toLocaleDateString('no-NO')}`}
                          </p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => handleCopyInvite(`${window.location.origin}/join/${invite.invite_code}`)} aria-label="Kopier invitasjonslenke" className="flex-shrink-0 h-11 w-11 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>)}
                  </div>}
              </div>
            </div>
          </Card>}

        {profile?.show_activity_log && (
          <Card id="activity-log" className="p-4 sm:p-6 rounded-2xl">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight">Aktivitetslogg</h2>
              <div className="flex gap-2 flex-wrap">
                <ManualTimeDialog type="start" onSubmit={handleManualStartTime} disabled={!activeEntry} />
                <ManualTimeDialog type="end" onSubmit={handleManualEndTime} disabled={!activeEntry} />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={activityFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActivityFilter("all")}
                className="h-11 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
              >
                Alle aktiviteter
              </Button>
              <Button variant={activityFilter === "time" ? "default" : "outline"} size="icon" onClick={() => setActivityFilter("time")} aria-label="Vis tidsregistreringer" aria-pressed={activityFilter === "time"} className="h-11 w-11 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button variant={activityFilter === "drive" ? "default" : "outline"} size="icon" onClick={() => setActivityFilter("drive")} aria-label="Vis kjøring" aria-pressed={activityFilter === "drive"} className="h-11 w-11 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg">
                <Car className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button variant={activityFilter === "material" ? "default" : "outline"} size="icon" onClick={() => setActivityFilter("material")} aria-label="Vis materialer" aria-pressed={activityFilter === "material"} className="h-11 w-11 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>

          {myActivities.length === 0 ? <p className="text-muted-foreground text-center py-6 sm:py-8 text-xs sm:text-sm">
              Ingen aktiviteter funnet
            </p> : <div className="space-y-2 sm:space-y-3">
              {myActivities.map((activity, index) => {
            const handleEdit = (type: "time" | "drive" | "material", data: any) => {
              setEditEntry({ type, data });
              setEditDialogOpen(true);
            };

            if (activity.type === "time") {
              const entry = activity.data;
              return <div key={`time-${entry.id}`} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-primary/10 group/entry">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">Tidsregistrering</p>
                        <p className="text-xs sm:text-sm text-muted-foreground break-words leading-snug tabular-nums">
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
                        {entry.end_time && <p className="text-xs sm:text-sm font-semibold text-primary leading-snug tabular-nums">
                            {formatTime(entry.duration_seconds)}
                          </p>}
                      </div>
                      {entry.end_time && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Rediger tidsregistrering"
                          className="h-11 w-11 opacity-0 group-hover/entry:opacity-100 transition-opacity flex-shrink-0 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
                          onClick={() => handleEdit("time", entry)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>;
            } else if (activity.type === "drive") {
              const entry = activity.data;
              return <div key={`drive-${entry.id}`} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-accent/10 group/entry">
                      <Car className="h-4 w-4 sm:h-5 sm:w-5 text-accent mt-0.5 flex-shrink-0" />
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">Kjøring</p>
                        <p className="text-xs sm:text-sm text-muted-foreground break-words leading-snug tabular-nums">
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
                        {entry.kilometers !== null && <p className="text-xs sm:text-sm font-semibold text-accent leading-snug tabular-nums">
                            {entry.kilometers} km
                          </p>}
                      </div>
                      {entry.end_time && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Rediger kjøring"
                          className="h-11 w-11 opacity-0 group-hover/entry:opacity-100 transition-opacity flex-shrink-0 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
                          onClick={() => handleEdit("drive", entry)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>;
            } else {
              const material = activity.data;
              return <div key={`material-${material.id}`} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-secondary group/entry">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-snug">{material.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-snug tabular-nums">
                          {new Date(material.created_at).toLocaleString("no-NO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                        </p>
                        <p className="text-sm font-semibold break-words leading-snug tabular-nums">
                          {material.quantity} stk × {material.unit_price} kr ={" "}
                          {material.total_price} kr
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Rediger materiale"
                        className="h-11 w-11 opacity-0 group-hover/entry:opacity-100 transition-opacity flex-shrink-0 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
                        onClick={() => handleEdit("material", material)}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>;
            }
          })}
            </div>}

        {editEntry && (
          <EditEntryDialog
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open);
              if (!open) setEditEntry(null);
            }}
            type={editEntry.type}
            entry={editEntry.data}
            requireComment={false}
            onUpdateTimeEntry={updateTimeEntry}
            onUpdateDriveEntry={updateDriveEntry}
            onUpdateMaterial={updateMaterial}
            onDelete={handleDeleteEntry}
          />
        )}
        </Card>
        )}
      </div>
    </div>;
};
export default ProjectDetails;