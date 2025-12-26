import { useEffect } from "react";
import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Warning, ArrowsClockwise, Copy } from "@phosphor-icons/react";
import { addBugReport, formatBugForChat, copyToClipboard, getBugReports } from "./lib/bugTracker";
import { toast } from "sonner";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  componentStack?: string;
}

export const ErrorFallback = ({ error, resetErrorBoundary, componentStack }: ErrorFallbackProps) => {
  // Log to bug tracker on mount
  useEffect(() => {
    addBugReport('error', error.message, {
      stack: error.stack,
      componentStack: componentStack,
      context: { type: 'react-error-boundary' },
    });
  }, [error, componentStack]);

  // When encountering an error in the development mode, rethrow it and don't display the boundary.
  // The parent UI will take care of showing a more helpful dialog.
  if (import.meta.env.DEV) throw error;

  const handleCopyError = async () => {
    const reports = getBugReports();
    const latestReport = reports[reports.length - 1];
    if (latestReport) {
      const formatted = formatBugForChat(latestReport);
      const success = await copyToClipboard(formatted);
      if (success) {
        toast.success('Error copied to clipboard! Ready to paste in chat.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="mb-6">
          <Warning className="h-4 w-4" />
          <AlertTitle>This spark has encountered a runtime error</AlertTitle>
          <AlertDescription>
            Something unexpected happened while running the application. The error details are shown below. Contact the spark author and let them know about this issue.
          </AlertDescription>
        </Alert>
        
        <div className="bg-card border rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">Error Details:</h3>
          <pre className="text-xs text-destructive bg-muted/50 p-3 rounded border overflow-auto max-h-32">
            {error.message}
          </pre>
          {error.stack && (
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer">Stack trace</summary>
              <pre className="text-xs bg-muted/50 p-3 rounded border overflow-auto max-h-32 mt-2">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleCopyError} 
            className="flex-1 gap-2"
            variant="outline"
          >
            <Copy className="h-4 w-4" />
            Copy for Chat
          </Button>
          <Button 
            onClick={resetErrorBoundary} 
            className="flex-1 gap-2"
            variant="default"
          >
            <ArrowsClockwise className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
