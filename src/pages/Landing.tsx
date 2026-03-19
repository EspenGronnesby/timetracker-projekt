import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, animate } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import {
  Clock,
  Car,
  Package,
  Users,
  FileText,
  ListTodo,
  ArrowRight,
  Zap,
  Shield,
  Smartphone,
} from "lucide-react";

/* ─── animation variants ─── */
const ease = [0.25, 0.4, 0.25, 1] as const;
const easeTuple = ease as unknown as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: easeTuple },
  }),
};

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: easeTuple },
  },
};

const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: easeTuple },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, delay: i * 0.08, ease: easeTuple },
  }),
};

/* ─── data ─── */
const features = [
  {
    icon: Clock,
    title: "Tidsregistrering",
    description: "Start og stopp timer per prosjekt med ett trykk. Se hvem som jobber — i sanntid.",
  },
  {
    icon: Car,
    title: "Kjøredistanse",
    description: "Automatisk GPS-basert distanseberegning. Fra dør til dør, uten manuelt arbeid.",
  },
  {
    icon: Package,
    title: "Materialkostnader",
    description: "Logg materialer med antall og pris. Totalberegning skjer automatisk.",
  },
  {
    icon: Users,
    title: "Team-samarbeid",
    description: "Inviter medarbeidere via lenke. Se hvem som jobber på hva, når som helst.",
  },
  {
    icon: FileText,
    title: "Rapporter",
    description: "Generer prosjektrapporter som PDF eller Excel. Klar for kunden på sekunder.",
  },
  {
    icon: ListTodo,
    title: "Mål & oppgaver",
    description: "Sett daglige mål og hold oversikt. Alt du trenger for å holde fremdriften.",
  },
];

const stats = [
  { value: 500, suffix: "+", label: "Håndverkere" },
  { value: 50000, suffix: "+", label: "Timer logget" },
  { value: 1200, suffix: "+", label: "Prosjekter" },
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

/* ─── counter component ─── */
function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.8,
      ease: easeTuple,
      onUpdate: (v) => setDisplay(Math.floor(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref}>
      {display.toLocaleString("nb-NO")}
      {suffix}
    </span>
  );
}

/* ─── divider line ─── */
function GrowingDivider() {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 1, ease: easeTuple }}
      className="h-px bg-border/50 origin-center max-w-md mx-auto"
    />
  );
}

/* ─── phone mockup ─── */
function PhoneMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateY: -8 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 1.2, delay: 0.4, ease: easeTuple }}
      className="relative hidden md:flex items-center justify-center"
    >
      <div className="relative w-[260px] h-[520px] rounded-[40px] border-[6px] border-foreground/20 bg-background shadow-2xl shadow-primary/10 overflow-hidden">
        {/* notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[26px] bg-foreground/20 rounded-b-2xl" />
        {/* screen content */}
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
          <img
            src="/icon-512x512.png"
            alt="TimeTracker"
            className="w-20 h-20 rounded-2xl shadow-lg"
          />
          <span className="text-lg font-bold tracking-tight">TimeTracker</span>
          <span className="text-xs text-muted-foreground text-center">
            Tidsregistrering for håndverkere
          </span>
          <div className="w-full mt-4 space-y-2">
            <div className="h-8 rounded-lg bg-primary/15 animate-pulse" />
            <div className="h-8 rounded-lg bg-primary/10 animate-pulse delay-100" />
            <div className="h-8 rounded-lg bg-primary/5 animate-pulse delay-200" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── main component ─── */
export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  // Sticky mobile CTA — appears after 30% scroll
  const { scrollYProgress: pageProgress } = useScroll();
  const mobileCTAOpacity = useTransform(pageProgress, [0.15, 0.25], [0, 1]);
  const mobileCTAY = useTransform(pageProgress, [0.15, 0.25], [60, 0]);
  const springY = useSpring(mobileCTAY, { stiffness: 300, damping: 30 });
  const springOpacity = useSpring(mobileCTAOpacity, { stiffness: 300, damping: 30 });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: easeTuple }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl backdrop-saturate-150"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon-512x512.png" alt="TimeTracker" className="h-7 w-7 rounded-lg" />
            <span className="text-[15px] font-semibold tracking-tight">TimeTracker</span>
          </div>
          <nav className="hidden sm:flex items-center gap-8 text-[13px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funksjoner</a>
            <a href="#highlights" className="hover:text-foreground transition-colors">Hvorfor oss</a>
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

      {/* ─── Hero ─── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-[85dvh] md:min-h-[100dvh] flex items-center px-4 sm:px-6 pt-14"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[800px] h-[400px] md:h-[600px] rounded-full bg-primary/[0.07] blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          {/* Text side */}
          <motion.div className="space-y-6 md:space-y-8 text-center md:text-left" initial="hidden" animate="visible">
            <motion.div
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-secondary/50 text-[11px] sm:text-[12px] font-medium text-muted-foreground tracking-wide uppercase"
            >
              <img src="/icon-512x512.png" alt="" className="h-4 w-4 rounded" />
              For håndverkere og entreprenører
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-[-0.03em]"
            >
              Spar tid.
              <br />
              <span className="text-muted-foreground">Fakturer enkelt.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-lg mx-auto md:mx-0 leading-relaxed font-light"
            >
              Tidsregistrering og prosjektstyring bygget for deg som jobber ute — ikke bak et skrivebord.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row items-center gap-3 pt-2 md:justify-start justify-center"
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

          {/* Phone mockup side */}
          <PhoneMockup />
        </div>
      </motion.section>

      {/* ─── Social proof strip ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, ease: easeTuple }}
        className="text-center py-6 md:py-8 border-y border-border/30 bg-secondary/20"
      >
        <p className="text-xs sm:text-sm text-muted-foreground font-medium tracking-wide">
          Brukt av <span className="text-foreground font-semibold">500+ norske håndverkere</span> hver dag
        </p>
      </motion.div>

      {/* ─── Stats section ─── */}
      <section className="py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 md:gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={scaleIn}
              custom={i}
              className="text-center space-y-1 md:space-y-2"
            >
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-primary">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <GrowingDivider />

      {/* ─── Features — alternating rows ─── */}
      <section id="features" className="py-16 md:py-32 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-12 md:mb-20 space-y-3 md:space-y-4"
          >
            <motion.p variants={fadeUp} custom={0} className="text-[12px] font-semibold text-primary tracking-widest uppercase">
              Funksjoner
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-[-0.02em]">
              Alt du trenger.
              <br />
              <span className="text-muted-foreground">Ingenting du ikke trenger.</span>
            </motion.h2>
          </motion.div>

          <div className="space-y-12 md:space-y-24">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={feature.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  variants={isEven ? slideInLeft : slideInRight}
                  className={`flex flex-col md:flex-row items-center gap-6 md:gap-12 ${
                    !isEven ? "md:flex-row-reverse" : ""
                  }`}
                >
                  {/* Icon block */}
                  <div className="flex-shrink-0 h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-secondary/80 border border-border/50 flex items-center justify-center">
                    <Icon className="h-7 w-7 md:h-9 md:w-9 text-primary" />
                  </div>
                  {/* Text */}
                  <div className={`text-center md:text-left space-y-2 md:space-y-3 ${!isEven ? "md:text-right" : ""}`}>
                    <h3 className="text-lg md:text-xl font-semibold tracking-tight">{feature.title}</h3>
                    <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-md">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <GrowingDivider />

      {/* ─── Highlights ─── */}
      <section id="highlights" className="py-16 md:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-12 md:mb-20 space-y-3 md:space-y-4"
          >
            <motion.p variants={fadeUp} custom={0} className="text-[12px] font-semibold text-primary tracking-widest uppercase">
              Hvorfor TimeTracker
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-[-0.02em]">
              Bygget for hverdagen din.
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
            {highlights.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  variants={scaleIn}
                  custom={i}
                  className="text-center space-y-4 p-6 rounded-2xl border border-border/40 bg-secondary/20 hover:bg-secondary/40 transition-colors duration-300"
                >
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-background border border-border/50 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-[16px] font-semibold tracking-tight">{item.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 md:py-32 px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-2xl mx-auto text-center space-y-6 md:space-y-8"
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-[-0.02em]">
            Klar til å spare tid?
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-sm md:text-[15px] font-light">
            Gratis å komme i gang. Ingen kredittkort. Ingen binding.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 px-10 h-12 sm:h-13 rounded-full text-[14px] font-medium bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
              onClick={() => navigate("/auth")}
            >
              Opprett konto
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/30 py-8 md:py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/icon-512x512.png" alt="TimeTracker" className="h-5 w-5 rounded" />
            <span className="font-semibold text-foreground">TimeTracker</span>
          </div>
          <p className="font-light">Bygget for norske håndverkere</p>
        </div>
      </footer>

      {/* ─── Sticky mobile CTA bar ─── */}
      <motion.div
        style={{ opacity: springOpacity, y: springY }}
        className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-background/90 backdrop-blur-lg border-t border-border/40 md:hidden"
      >
        <Button
          className="w-full h-12 rounded-full text-[14px] font-medium bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2"
          onClick={() => navigate("/auth")}
        >
          Kom i gang gratis
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}
