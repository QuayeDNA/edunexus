import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import { Providers } from '@/components/layouts/providers';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import './globals.css';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GH" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
