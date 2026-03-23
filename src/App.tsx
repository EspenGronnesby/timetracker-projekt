import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import { AppShell } from "./components/AppShell";
import { ProjectCardSkeleton } from "./components/ProjectCardSkeleton";
import "./App.css";

// Lazy load less critical routes
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const JoinProject = lazy(() => import("./pages/JoinProject"));
const Settings = lazy(() => import("./pages/Settings"));
const Goals = lazy(() => import("./pages/Goals"));
const More = lazy(() => import("./pages/More"));
const SimpleTimer = lazy(() => import("./pages/SimpleTimer"));
const SimpleHistory = lazy(() => import("./pages/SimpleHistory"));
const WageSettings = lazy(() => import("./pages/WageSettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster position="top-right" expand={true} richColors />
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="min-h-screen bg-background p-8">
                <ProjectCardSkeleton />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />

              {/* Authenticated routes wrapped in AppShell */}
              <Route element={<AppShell />}>
                <Route path="/app" element={<Index />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/more" element={<More />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/simple" element={<SimpleTimer />} />
                <Route path="/simple/history" element={<SimpleHistory />} />
                <Route path="/simple/wage" element={<WageSettings />} />
              </Route>

              <Route path="/project/:id" element={<ProjectDetails />} />
              <Route path="/join/:inviteCode" element={<JoinProject />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
