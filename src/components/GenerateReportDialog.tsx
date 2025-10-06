import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateReportDialogProps {
  projectId: string;
  projectName: string;
  canAccess: boolean;
}

export const GenerateReportDialog = ({ projectId, projectName, canAccess }: GenerateReportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string>("");
  
  const [includeCustomerInfo, setIncludeCustomerInfo] = useState(canAccess);
  const [includeTimeStats, setIncludeTimeStats] = useState(true);
  const [includeDriveStats, setIncludeDriveStats] = useState(true);
  const [includeMaterialCosts, setIncludeMaterialCosts] = useState(true);
  const [includeAiAnalysis, setIncludeAiAnalysis] = useState(true);

  const generateReport = async () => {
    setLoading(true);
    setReport("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-project-report', {
        body: {
          projectId,
          includeCustomerInfo,
          includeTimeStats,
          includeDriveStats,
          includeMaterialCosts,
          includeAiAnalysis,
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setReport(data.report);
      toast.success("Rapport generert!");
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast.error(error.message || "Kunne ikke generere rapport");
    } finally {
      setLoading(false);
    }
  };

  const downloadAsText = () => {
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-rapport-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport lastet ned!");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report);
    toast.success("Rapport kopiert til utklippstavlen!");
  };

  const printReport = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${projectName} - Rapport</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              h1, h2, h3 { color: #333; }
              pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
            </style>
          </head>
          <body>
            ${report.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="icon">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Generer Prosjektrapport</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!report && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Velg hva som skal inkluderes i rapporten:
              </p>

              <div className="space-y-2">
                {canAccess && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="customer" 
                      checked={includeCustomerInfo}
                      onCheckedChange={(checked) => setIncludeCustomerInfo(checked as boolean)}
                    />
                    <Label htmlFor="customer" className="cursor-pointer">
                      Kundeinformasjon (kun tilgjengelig for admin/eier)
                    </Label>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="time" 
                    checked={includeTimeStats}
                    onCheckedChange={(checked) => setIncludeTimeStats(checked as boolean)}
                  />
                  <Label htmlFor="time" className="cursor-pointer">
                    Tidsstatistikk per person
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="drive" 
                    checked={includeDriveStats}
                    onCheckedChange={(checked) => setIncludeDriveStats(checked as boolean)}
                  />
                  <Label htmlFor="drive" className="cursor-pointer">
                    Kjørestatistikk
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="materials" 
                    checked={includeMaterialCosts}
                    onCheckedChange={(checked) => setIncludeMaterialCosts(checked as boolean)}
                  />
                  <Label htmlFor="materials" className="cursor-pointer">
                    Materialkostnader
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="ai" 
                    checked={includeAiAnalysis}
                    onCheckedChange={(checked) => setIncludeAiAnalysis(checked as boolean)}
                  />
                  <Label htmlFor="ai" className="cursor-pointer">
                    AI-analyse og anbefalinger
                  </Label>
                </div>
              </div>

              <Button 
                onClick={generateReport} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Genererer rapport...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generer Rapport
                  </>
                )}
              </Button>
            </div>
          )}

          {report && (
            <div className="space-y-4">
              <ScrollArea className="h-[400px] w-full border rounded-md p-4">
                <div className="prose prose-sm max-w-none">
                  {report.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 whitespace-pre-wrap">
                      {line}
                    </p>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Button onClick={printReport} variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Skriv ut / PDF
                </Button>
                <Button onClick={downloadAsText} variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Last ned TXT
                </Button>
                <Button onClick={copyToClipboard} variant="outline" className="flex-1 gap-2">
                  <Copy className="h-4 w-4" />
                  Kopier
                </Button>
              </div>

              <Button 
                onClick={() => {
                  setReport("");
                  setOpen(false);
                }} 
                variant="ghost" 
                className="w-full"
              >
                Lukk
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
