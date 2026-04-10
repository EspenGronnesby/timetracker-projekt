import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Copy, Loader2, FileSpreadsheet, Printer } from "lucide-react";
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

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  const printReport = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      const escapedName = escapeHtml(projectName);
      const escapedReport = escapeHtml(report)
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      printWindow.document.write(`
        <html>
          <head>
            <title>${escapedName} - Rapport</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              h1, h2, h3 { color: #333; }
              pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
            </style>
          </head>
          <body>
            ${escapedReport}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadAsExcel = () => {
    // Convert report to CSV format
    const lines = report.split('\n');
    let csvContent = '';
    
    // Simple CSV conversion - each line becomes a row
    lines.forEach(line => {
      // Escape quotes and wrap in quotes if contains comma
      const escaped = line.replace(/"/g, '""');
      csvContent += `"${escaped}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-rapport-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport lastet ned som CSV!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Generer rapport
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
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
              <p className="text-sm text-muted-foreground text-center">
                Rapporten er klar! Velg eksportformat:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={printReport} variant="outline" className="h-20 flex flex-col gap-2">
                  <Printer className="h-5 w-5" />
                  <span className="text-xs">PDF</span>
                </Button>
                <Button onClick={downloadAsExcel} variant="outline" className="h-20 flex flex-col gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span className="text-xs">Excel/CSV</span>
                </Button>
                <Button onClick={downloadAsText} variant="outline" className="h-20 flex flex-col gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">TXT</span>
                </Button>
                <Button onClick={copyToClipboard} variant="outline" className="h-20 flex flex-col gap-2">
                  <Copy className="h-5 w-5" />
                  <span className="text-xs">Kopier</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
