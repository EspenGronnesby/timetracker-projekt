import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Car, Package, User, Phone, Mail, MapPin, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProjects } from "@/hooks/useProjects";
import { useActiveUser } from "@/hooks/useActiveUser";
import { formatDuration } from "@/lib/timeUtils";
import { AddMaterialDialog } from "@/components/AddMaterialDialog";
import { DriveDialog } from "@/components/DriveDialog";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeUser } = useActiveUser();
  const { projects, toggleProject, toggleDriving, addMaterial } = useProjects(activeUser.id, activeUser.name);
  
  const [statsView, setStatsView] = useState<"my" | "total">("my");
  const [liveTime, setLiveTime] = useState(0);
  
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Prosjekt ikke funnet</h2>
          <Button onClick={() => navigate("/")}>Tilbake til oversikt</Button>
        </div>
      </div>
    );
  }

  const userState = project.activeUsers[activeUser.id] || { isActive: false, isDriving: false };
  const currentEntry = project.currentEntries[activeUser.id];

  // Calculate user-specific stats
  const userEntries = project.entries.filter(e => e.userId === activeUser.id);
  const userDrives = project.driveEntries.filter(d => d.userId === activeUser.id);
  const userMaterials = project.materials.filter(m => m.userId === activeUser.id);
  
  const userTotalTime = userEntries.reduce((sum, e) => sum + e.duration, 0);
  const userTotalKm = userDrives.reduce((sum, d) => sum + (d.kilometers || 0), 0);
  const userTotalMaterialCost = userMaterials.reduce((sum, m) => sum + m.totalPrice, 0);

  // Live time tracking
  useEffect(() => {
    if (!userState.isActive || !currentEntry) {
      setLiveTime(userTotalTime);
      return;
    }

    const updateTime = () => {
      const elapsed = Math.floor((Date.now() - currentEntry.startTime.getTime()) / 1000);
      setLiveTime(userTotalTime + elapsed);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [userState.isActive, userTotalTime, currentEntry]);

  // Active users count
  const activeUsers = Object.entries(project.activeUsers)
    .filter(([_, state]) => state.isActive)
    .map(([userId]) => userId);

  // Get user color for activity log
  const getUserColor = (userId: string) => {
    const colors: Record<string, string> = {
      espen: "bg-blue-500/10 border-l-4 border-blue-500",
      benjamin: "bg-green-500/10 border-l-4 border-green-500",
      lukas: "bg-purple-500/10 border-l-4 border-purple-500",
    };
    return colors[userId] || "bg-muted";
  };

  const allActivities = [
    ...project.entries.map((e) => ({
      type: "time" as const,
      id: e.id,
      startTime: e.startTime,
      endTime: e.endTime,
      duration: e.duration,
      userId: e.userId,
      userName: e.userName,
    })),
    ...project.driveEntries.map((d) => ({
      type: "drive" as const,
      id: d.id,
      startTime: d.startTime,
      endTime: d.endTime,
      kilometers: d.kilometers,
      userId: d.userId,
      userName: d.userName,
    })),
    ...project.materials.map((m) => ({
      type: "material" as const,
      id: m.id,
      addedAt: m.addedAt,
      name: m.name,
      quantity: m.quantity,
      unitPrice: m.unitPrice,
      totalPrice: m.totalPrice,
      userId: m.userId,
      userName: m.userName,
    })),
  ].sort((a, b) => {
    const dateA = "startTime" in a ? a.startTime : a.addedAt;
    const dateB = "startTime" in b ? b.startTime : b.addedAt;
    return dateB.getTime() - dateA.getTime();
  });

  // Filter activities by user
  const filteredActivities = allActivities.filter(activity => {
    return activity.userId === activeUser.id;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <p className="text-sm text-muted-foreground">{project.customerInfo.name}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Customer Info Card */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Kundeinformasjon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Kundenavn</p>
                <p className="font-medium">{project.customerInfo.name}</p>
              </div>
            </div>
            {project.customerInfo.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium">{project.customerInfo.address}</p>
                </div>
              </div>
            )}
            {project.customerInfo.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefon</p>
                  <p className="font-medium">{project.customerInfo.phone}</p>
                </div>
              </div>
            )}
            {project.customerInfo.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">E-post</p>
                  <p className="font-medium">{project.customerInfo.email}</p>
                </div>
              </div>
            )}
            {project.customerInfo.contractNumber && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Avtalenummer</p>
                  <p className="font-medium">{project.customerInfo.contractNumber}</p>
                </div>
              </div>
            )}
            {project.customerInfo.description && (
              <div className="flex items-start gap-3 md:col-span-2">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Beskrivelse</p>
                  <p className="font-medium">{project.customerInfo.description}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Active Users Indicator */}
        {activeUsers.length > 0 && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {activeUsers.length} {activeUsers.length === 1 ? "person" : "personer"} jobber nå
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeUsers.map(id => project.currentEntries[id]?.userName).filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Cards with Tabs */}
        <Card className="p-6">
          <Tabs value={statsView} onValueChange={(v) => setStatsView(v as "my" | "total")}>
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
                    <div className="bg-primary/20 p-3 rounded-lg">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Min tid</p>
                      <p className="text-2xl font-bold font-mono text-primary">
                        {formatDuration(userState.isActive ? liveTime : userTotalTime)}
                      </p>
                      {userState.isActive && (
                        <p className="text-xs text-primary animate-pulse">● Kjører nå</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/20 p-3 rounded-lg">
                      <Car className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Min kjøring</p>
                      <p className="text-2xl font-bold font-mono text-accent">
                        {userTotalKm} km
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary-foreground/10 p-3 rounded-lg">
                      <Package className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mine materialer</p>
                      <p className="text-2xl font-bold font-mono text-foreground">
                        {userTotalMaterialCost.toFixed(0)} kr
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
                    <div className="bg-primary/20 p-3 rounded-lg">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total tid</p>
                      <p className="text-2xl font-bold font-mono text-primary">
                        {formatDuration(project.totalTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/20 p-3 rounded-lg">
                      <Car className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total kjøring</p>
                      <p className="text-2xl font-bold font-mono text-accent">
                        {project.totalKilometers} km
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary-foreground/10 p-3 rounded-lg">
                      <Package className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Materialkostnad</p>
                      <p className="text-2xl font-bold font-mono text-foreground">
                        {project.totalMaterialCost.toFixed(0)} kr
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => toggleProject(project.id)}
            variant={userState.isActive ? "destructive" : "default"}
            className="flex-1 min-w-[150px]"
          >
            <Clock className="mr-2 h-5 w-5" />
            {userState.isActive ? "Stopp tid" : "Start tid"}
          </Button>

          <DriveDialog
            projectId={project.id}
            isDriving={userState.isDriving}
            onToggleDriving={toggleDriving}
          />

          <AddMaterialDialog projectId={project.id} onAdd={addMaterial} />
        </div>

        {/* Activity Log */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Aktivitetslogg</h2>

          {filteredActivities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Ingen aktiviteter funnet med valgt filter
            </p>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity, index) => (
                <div key={activity.id}>
                  {activity.type === "time" && (
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${getUserColor(activity.userId)}`}>
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Tidsregistrering</p>
                          <p className="text-sm font-medium">{activity.userName}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {activity.startTime.toLocaleString("no-NO")} 
                          {activity.endTime && ` - ${activity.endTime.toLocaleString("no-NO")}`}
                        </p>
                        {activity.endTime && (
                          <p className="text-sm font-semibold text-primary">
                            Varighet: {formatDuration(activity.duration)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {activity.type === "drive" && (
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${getUserColor(activity.userId)}`}>
                      <Car className="h-5 w-5 text-accent mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Kjøring</p>
                          <p className="text-sm font-medium">{activity.userName}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {activity.startTime.toLocaleString("no-NO")}
                          {activity.endTime && ` - ${activity.endTime.toLocaleString("no-NO")}`}
                        </p>
                        {activity.kilometers !== undefined && (
                          <p className="text-sm font-semibold text-accent">
                            {activity.kilometers} km
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {activity.type === "material" && (
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${getUserColor(activity.userId)}`}>
                      <Package className="h-5 w-5 text-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{activity.name}</p>
                          <p className="text-sm font-medium">{activity.userName}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {activity.addedAt.toLocaleString("no-NO")}
                        </p>
                        <p className="text-sm font-semibold">
                          {activity.quantity} stk × {activity.unitPrice} kr = {activity.totalPrice} kr
                        </p>
                      </div>
                    </div>
                  )}

                  {index < filteredActivities.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProjectDetails;
