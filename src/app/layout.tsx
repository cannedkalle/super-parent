import type { Metadata } from 'next';
import type { Viewport } from 'next';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import './global.css';

export const metadata: Metadata = {
  title: 'Super Parent Toolkit',
  description: 'A practical toolkit of planning apps for family logistics',
  applicationName: 'Super Parent Toolkit',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Parent Toolkit',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#5C788A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
