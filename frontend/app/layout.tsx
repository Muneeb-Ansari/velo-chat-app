import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Velo — Real-time Chat',
  description: 'Fast, minimal, real-time messaging',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
