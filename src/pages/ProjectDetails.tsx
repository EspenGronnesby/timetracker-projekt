import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Car, Package, User, Phone, Mail, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProjects } from "@/hooks/useProjects";
import { useActiveUser } from "@/hooks/useActiveUser";
import { formatDuration } from "@/lib/timeUtils";
import { AddMaterialDialog } from "@/components/AddMaterialDialog";
import { DriveDialog } from "@/components/DriveDialog";
import { Separator } from "@/components/ui/separator";

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeUser } = useActiveUser();
  const { projects, toggleProject, toggleDriving, addMaterial } = useProjects(activeUser.id, activeUser.name);
  
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-primary/10">
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
          </Card>

          <Card className="p-4 bg-accent/10">
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
          </Card>

          <Card className="p-4 bg-secondary">
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
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => toggleProject(project.id)}
            variant={project.isActive ? "destructive" : "default"}
            className="flex-1 min-w-[150px]"
          >
            <Clock className="mr-2 h-5 w-5" />
            {project.isActive ? "Stopp tid" : "Start tid"}
          </Button>

          <DriveDialog
            projectId={project.id}
            isDriving={project.isDriving}
            onToggleDriving={toggleDriving}
          />

          <AddMaterialDialog projectId={project.id} onAdd={addMaterial} />
        </div>

        {/* Activity Log */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Aktivitetslogg</h2>
          {allActivities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Ingen aktiviteter registrert ennå
            </p>
          ) : (
            <div className="space-y-3">
              {allActivities.map((activity, index) => (
                <div key={activity.id}>
                  {activity.type === "time" && (
                    <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Tidsregistrering</p>
                          <p className="text-sm text-muted-foreground">{activity.userName}</p>
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
                    <div className="flex items-start gap-3 p-3 bg-accent/5 rounded-lg">
                      <Car className="h-5 w-5 text-accent mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Kjøring</p>
                          <p className="text-sm text-muted-foreground">{activity.userName}</p>
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
                    <div className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                      <Package className="h-5 w-5 text-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{activity.name}</p>
                          <p className="text-sm text-muted-foreground">{activity.userName}</p>
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

                  {index < allActivities.length - 1 && <Separator className="my-2" />}
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
