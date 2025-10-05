import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects, TimeEntry, DriveEntry, Material } from "@/hooks/useProjects";
import { OnlineUsersIndicator, usePresenceTracking } from "@/components/OnlineUsersIndicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AddMaterialDialog } from "@/components/AddMaterialDialog";
import { DriveDialog } from "@/components/DriveDialog";
import {
  ArrowLeft,
  Clock,
  Car,
  Package,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
} from "lucide-react";
import { formatTime } from "@/lib/timeUtils";

const ProjectDetails = () => {
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { trackPresence } = usePresenceTracking();
  const {
    projects,
    timeEntries,
    driveEntries,
    materials,
    toggleProject,
    toggleDriving,
    addMaterial,
  } = useProjects(user?.id);

  const [statsView, setStatsView] = useState<"my" | "total">("my");
  const [liveTime, setLiveTime] = useState(0);

  // Find project early to use in all logic
  const project = projects.find((p) => p.id === id);

  // Calculate data regardless of loading state to keep hooks consistent
  const projectTimeEntries = project
    ? timeEntries.filter((entry) => entry.project_id === project.id)
    : [];
  const projectDriveEntries = project
    ? driveEntries.filter((entry) => entry.project_id === project.id)
    : [];
  const projectMaterials = project
    ? materials.filter((material) => material.project_id === project.id)
    : [];

  const myTimeEntries = user
    ? projectTimeEntries.filter((entry) => entry.user_id === user.id)
    : [];
  const myDriveEntries = user
    ? projectDriveEntries.filter((entry) => entry.user_id === user.id)
    : [];
  const myMaterials = user
    ? projectMaterials.filter((material) => material.user_id === user.id)
    : [];

  const activeEntry = myTimeEntries.find((entry) => !entry.end_time);
  const activeDrive = myDriveEntries.find((entry) => !entry.end_time);

  const myTotalTime = myTimeEntries
    .filter((entry) => entry.end_time)
    .reduce((acc, entry) => acc + entry.duration_seconds, 0);

  const myTotalKm = myDriveEntries.reduce(
    (acc, entry) => acc + (entry.kilometers || 0),
    0
  );

  const myTotalMaterialCost = myMaterials.reduce(
    (acc, material) => acc + material.total_price,
    0
  );

  const totalTime = projectTimeEntries
    .filter((entry) => entry.end_time)
    .reduce((acc, entry) => acc + entry.duration_seconds, 0);

  const totalKm = projectDriveEntries.reduce(
    (acc, entry) => acc + (entry.kilometers || 0),
    0
  );

  const totalMaterialCost = projectMaterials.reduce(
    (acc, material) => acc + material.total_price,
    0
  );

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
      const elapsed = Math.floor(
        (Date.now() - new Date(activeEntry.start_time).getTime()) / 1000
      );
      setLiveTime(myTotalTime + elapsed);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeEntry, myTotalTime]);

  // NOW we can do conditional returns after all hooks
  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Laster...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Prosjekt ikke funnet</h2>
          <Button onClick={() => navigate("/")}>Tilbake til oversikt</Button>
        </div>
      </div>
    );
  }

  // These are already calculated at the top, remove duplicates

  const handleToggleProject = () => {
    const isActive = !!activeEntry;
    toggleProject(
      { projectId: project.id, userName: profile.name },
      {
        onSuccess: () => {
          trackPresence(!isActive, false);
        },
      }
    );
  };

  const handleToggleDriving = (kilometers?: number) => {
    const isDriving = !!activeDrive;
    toggleDriving(
      { projectId: project.id, userName: profile.name, kilometers },
      {
        onSuccess: () => {
          trackPresence(false, !isDriving);
        },
      }
    );
  };

  type Activity = 
    | { type: "time"; data: TimeEntry }
    | { type: "drive"; data: DriveEntry }
    | { type: "material"; data: Material };

  const allActivities: Activity[] = [
    ...projectTimeEntries.map((entry) => ({ type: "time" as const, data: entry })),
    ...projectDriveEntries.map((entry) => ({ type: "drive" as const, data: entry })),
    ...projectMaterials.map((material) => ({ type: "material" as const, data: material })),
  ].sort((a, b) => {
    const dateA =
      a.type === "material"
        ? new Date(a.data.created_at)
        : new Date(a.data.start_time);
    const dateB =
      b.type === "material"
        ? new Date(b.data.created_at)
        : new Date(b.data.start_time);
    return dateB.getTime() - dateA.getTime();
  });

  const myActivities = allActivities.filter((activity) => {
    return activity.data.user_id === user.id;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              {project.customer_name}
            </p>
          </div>
          <OnlineUsersIndicator
            userId={user.id}
            userName={profile.name}
            projectId={project.id}
          />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Kundeinformasjon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Kundenavn</p>
                <p className="font-medium">{project.customer_name}</p>
              </div>
            </div>
            {project.customer_address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium">{project.customer_address}</p>
                </div>
              </div>
            )}
            {project.customer_phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefon</p>
                  <p className="font-medium">{project.customer_phone}</p>
                </div>
              </div>
            )}
            {project.customer_email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">E-post</p>
                  <p className="font-medium">{project.customer_email}</p>
                </div>
              </div>
            )}
            {project.contract_number && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Avtalenummer</p>
                  <p className="font-medium">{project.contract_number}</p>
                </div>
              </div>
            )}
            {project.description && (
              <div className="flex items-start gap-3 md:col-span-2">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Beskrivelse</p>
                  <p className="font-medium">{project.description}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <Tabs
            value={statsView}
            onValueChange={(v) => setStatsView(v as "my" | "total")}
          >
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
                      {activeEntry && (
                        <p className="text-xs text-primary">● Kjører nå</p>
                      )}
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

        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleToggleProject}
            variant={activeEntry ? "destructive" : "default"}
            className="flex-1 min-w-[150px]"
          >
            <Clock className="mr-2 h-5 w-5" />
            {activeEntry ? "Stopp tid" : "Start tid"}
          </Button>

          <DriveDialog isDriving={!!activeDrive} onToggleDriving={handleToggleDriving} />

          <AddMaterialDialog
            onAddMaterial={(name, quantity, unitPrice) =>
              addMaterial({
                projectId: project.id,
                userName: profile.name,
                name,
                quantity,
                unitPrice,
              })
            }
          />
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Aktivitetslogg</h2>

          {myActivities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Ingen aktiviteter funnet
            </p>
          ) : (
            <div className="space-y-3">
              {myActivities.map((activity, index) => {
                if (activity.type === "time") {
                  const entry = activity.data;
                  return (
                    <div
                      key={`time-${entry.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg bg-primary/10"
                    >
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Tidsregistrering</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(entry.start_time).toLocaleString("no-NO")}
                          {entry.end_time &&
                            ` - ${new Date(entry.end_time).toLocaleString(
                              "no-NO"
                            )}`}
                        </p>
                        {entry.end_time && (
                          <p className="text-sm font-semibold text-primary">
                            Varighet: {formatTime(entry.duration_seconds)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                } else if (activity.type === "drive") {
                  const entry = activity.data;
                  return (
                    <div
                      key={`drive-${entry.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg bg-accent/10"
                    >
                      <Car className="h-5 w-5 text-accent mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Kjøring</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(entry.start_time).toLocaleString("no-NO")}
                          {entry.end_time &&
                            ` - ${new Date(entry.end_time).toLocaleString(
                              "no-NO"
                            )}`}
                        </p>
                        {entry.kilometers !== null && (
                          <p className="text-sm font-semibold text-accent">
                            {entry.kilometers} km
                          </p>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  const material = activity.data;
                  return (
                    <div
                      key={`material-${material.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary"
                    >
                      <Package className="h-5 w-5 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{material.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(material.created_at).toLocaleString("no-NO")}
                        </p>
                        <p className="text-sm font-semibold">
                          {material.quantity} stk × {material.unit_price} kr ={" "}
                          {material.total_price} kr
                        </p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProjectDetails;
