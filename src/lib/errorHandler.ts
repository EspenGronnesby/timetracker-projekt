import { toast } from "sonner";

export interface ErrorHandlerOptions {
  title?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function handleError(error: Error, options?: ErrorHandlerOptions) {
  console.error("Error:", error);

  const errorMessages: Record<string, string> = {
    "Failed to fetch": "Kunne ikke hente data. Sjekk internettforbindelsen din.",
    "Network error": "Nettverksfeil. Prøv igjen senere.",
    "Unauthorized": "Du har ikke tilgang til denne ressursen.",
    "Not found": "Ressursen ble ikke funnet.",
  };

  const message =
    errorMessages[error.message] || "Noe gikk galt. Prøv igjen senere.";

  toast.error(options?.title || "Feil oppstod", {
    description: message,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  });
}

export function handleSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
  });
}
