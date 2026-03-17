import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Car,
  Package,
  Users,
  FileText,
  ListTodo,
  ArrowRight,
  Hammer,
} from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Tidsregistrering",
    description: "Start og stopp timer per prosjekt med ett trykk. Se hvem som jobber i sanntid.",
  },
  {
    icon: Car,
    title: "Kjøredistanse",
    description: "Automatisk GPS-basert distanseberegning mellom start- og sluttsted.",
  },
  {
    icon: Package,
    title: "Materialkostnader",
    description: "Logg materialer med antall og pris. Automatisk totalberegning per prosjekt.",
  },
  {
    icon: Users,
    title: "Teamfunksjon",
    description: "Inviter medarbeidere via lenke. Se hvem som jobber på hva.",
  },
  {
    icon: FileText,
    title: "Rapporter",
    description: "Generer prosjektrapporter som PDF eller Excel. Klar for kunden.",
  },
  {
    icon: ListTodo,
    title: "Mål og oppgaver",
    description: "Sett daglige mål og hold oversikt over hva som gjenstår.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Hammer className="h-5 w-5 text-primary" />
            <span className="text-base font-semibold tracking-tight">TimeTracker</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm font-medium">
            Logg inn
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-20 sm:pt-36 sm:pb-28 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-8 animate-fade-in">
          <p className="text-sm font-medium text-primary tracking-wide uppercase">
            For håndverkere og entreprenører
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight">
            Spar tid.{" "}
            <span className="text-muted-foreground">Fakturer enkelt.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Tidsregistrering og prosjektstyring bygget for deg som jobber ute — ikke bak et skrivebord.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 text-sm font-medium px-8 h-12 rounded-xl"
              onClick={() => navigate("/auth")}
            >
              Kom i gang gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-sm font-medium px-8 h-12 rounded-xl"
              onClick={() => navigate("/auth")}
            >
              Logg inn
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Alt du trenger på ett sted
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Fra første time på jobben til ferdig rapport til kunden.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 stagger-children">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="space-y-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-[15px] tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border/50">
        <div className="max-w-md mx-auto text-center space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Klar til å spare tid?</h2>
          <p className="text-sm text-muted-foreground">
            Gratis å komme i gang. Ingen kredittkort.
          </p>
          <Button
            size="lg"
            className="gap-2 px-8 h-12 rounded-xl text-sm font-medium"
            onClick={() => navigate("/auth")}
          >
            Opprett konto
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Hammer className="h-4 w-4" />
            <span className="font-medium text-foreground">TimeTracker</span>
          </div>
          <p>Bygget for norske håndverkere</p>
        </div>
      </footer>
    </div>
  );
}
