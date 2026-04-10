import Link from 'next/link';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <Bot size={48} strokeWidth={1.5} className="text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-display font-bold">Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The agent or page you're looking for doesn't exist.
          </p>
        </div>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/" />}>
          Back to Catalog
        </Button>
      </div>
    </div>
  );
}
