import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  Clock,
  Car,
  Package,
  Users,
  FileText,
  ListTodo,
  ArrowRight,
  Hammer,
  ChevronDown,
  Zap,
  Shield,
  Smartphone,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, delay: i * 0.12, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const features = [
  {
    icon: Clock,
    title: "Tidsregistrering",
    description:
      "Start og stopp timer per prosjekt med ett trykk. Se hvem som jobber — i sanntid.",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Car,
    title: "Kjøredistanse",
    description:
      "Automatisk GPS-basert distanseberegning. Fra dør til dør, uten manuelt arbeid.",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: Package,
    title: "Materialkostnader",
    description:
      "Logg materialer med antall og pris. Totalberegning skjer automatisk.",
    gradient: "from-[hsl(45,93%,58%)]/20 to-[hsl(45,93%,58%)]/5",
  },
  {
    icon: Users,
    title: "Team",
    description:
      "Inviter medarbeidere via lenke. Se hvem som jobber på hva, når som helst.",
    gradient: "from-[hsl(220,90%,56%)]/20 to-[hsl(220,90%,56%)]/5",
  },
  {
    icon: FileText,
    title: "Rapporter",
    description:
      "Generer prosjektrapporter som PDF eller Excel. Klar for kunden på sekunder.",
    gradient: "from-[hsl(280,65%,60%)]/20 to-[hsl(280,65%,60%)]/5",
  },
  {
    icon: ListTodo,
    title: "Mål & oppgaver",
    description:
      "Sett daglige mål og hold oversikt. Alt du trenger for å holde fremdriften.",
    gradient: "from-primary/20 to-accent/5",
  },
];

const highlights = [
  {
    icon: Zap,
    title: "Lynrask",
    description: "Designet for å brukes med én hånd, rett fra byggeplassen.",
  },
  {
    icon: Shield,
    title: "Trygt",
    description: "All data kryptert og lagret sikkert i skyen.",
  },
  {
    icon: Smartphone,
    title: "Mobilvennlig",
    description: "Fungerer perfekt på mobil, nettbrett og desktop.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navbar — Apple-style frosted glass */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl backdrop-saturate-150"
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />
            <span className="text-[15px] font-semibold tracking-tight">
              TimeTracker
            </span>
          </div>
          <nav className="hidden sm:flex items-center gap-8 text-[13px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Funksjoner
            </a>
            <a href="#highlights" className="hover:text-foreground transition-colors">
              Hvorfor oss
            </a>
          </nav>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-[13px] font-medium h-8 px-4 rounded-full"
          >
            Logg inn
          </Button>
        </div>
      </motion.header>

      {/* Hero — Cinematic, Apple-style */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-14"
      >
        {/* Subtle radial glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-primary/[0.07] blur-[120px]" />
        </div>

        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center space-y-8"
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-secondary/50 text-[12px] font-medium text-muted-foreground tracking-wide uppercase"
          >
            <Hammer className="h-3.5 w-3.5 text-primary" />
            For håndverkere og entreprenører
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[1.05] tracking-[-0.03em]"
          >
            Spar tid.
            <br />
            <span className="text-muted-foreground">Fakturer enkelt.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-[clamp(1rem,2.5vw,1.25rem)] text-muted-foreground max-w-lg mx-auto leading-relaxed font-light"
          >
            Tidsregistrering og prosjektstyring bygget for deg som jobber ute
            — ikke bak et skrivebord.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 text-[14px] font-medium px-8 h-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
              onClick={() => navigate("/auth")}
            >
              Kom i gang gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-[14px] font-medium px-8 h-12 rounded-full border-border/60 hover:bg-secondary/50 transition-all duration-300"
              onClick={() => navigate("/auth")}
            >
              Logg inn
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 flex flex-col items-center gap-2 text-muted-foreground/50"
        >
          <span className="text-[11px] tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Features — Large cards with subtle gradients */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-20 space-y-4"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-[12px] font-semibold text-primary tracking-widest uppercase"
            >
              Funksjoner
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-[clamp(1.75rem,4vw,3rem)] font-bold tracking-[-0.02em]"
            >
              Alt du trenger.
              <br />
              <span className="text-muted-foreground">Ingenting du ikke trenger.</span>
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={scaleIn}
                  custom={i}
                  className={`group relative rounded-2xl border border-border/50 bg-gradient-to-br ${feature.gradient} p-7 transition-all duration-500 hover:border-border hover:shadow-lg hover:shadow-primary/5`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="h-10 w-10 rounded-xl bg-background/80 border border-border/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-[15px] font-semibold tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Highlights — Three-column minimal */}
      <section id="highlights" className="py-32 px-6 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-20 space-y-4"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-[12px] font-semibold text-primary tracking-widest uppercase"
            >
              Hvorfor TimeTracker
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-[clamp(1.75rem,4vw,3rem)] font-bold tracking-[-0.02em]"
            >
              Bygget for hverdagen din.
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {highlights.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  custom={i}
                  className="text-center space-y-4"
                >
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-secondary/80 border border-border/50 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-[16px] font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA — Bold, clean */}
      <section className="py-32 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-2xl mx-auto text-center space-y-8"
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="text-[clamp(1.75rem,4vw,3rem)] font-bold tracking-[-0.02em]"
          >
            Klar til å spare tid?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="text-muted-foreground text-[15px] font-light"
          >
            Gratis å komme i gang. Ingen kredittkort. Ingen binding.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <Button
              size="lg"
              className="gap-2 px-10 h-13 rounded-full text-[14px] font-medium bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
              onClick={() => navigate("/auth")}
            >
              Opprett konto
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer — Minimal */}
      <footer className="border-t border-border/30 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Hammer className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">TimeTracker</span>
          </div>
          <p className="font-light">Bygget for norske håndverkere</p>
        </div>
      </footer>
    </div>
  );
}
