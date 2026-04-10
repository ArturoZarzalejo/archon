import type { Metadata } from 'next';
import { Inter, Exo_2, Geist } from 'next/font/google';
import { AuroraBackground } from '@/components/layout/AuroraBackground';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const exo2 = Exo_2({
  subsets: ['latin'],
  variable: '--font-exo2',
});

export const metadata: Metadata = {
  title: 'Archon — Agent Viewer',
  description: 'The Storybook for AI Agents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body className={`${inter.variable} ${exo2.variable} min-h-screen text-text antialiased`}>
        <AuroraBackground />
        <TooltipProvider delay={300}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
