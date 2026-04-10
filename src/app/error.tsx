'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <Card className="glass glass-highlight max-w-md border-0">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle size={24} className="text-destructive" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-display font-bold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw size={14} />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
