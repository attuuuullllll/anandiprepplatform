import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Your platform to help you crack Anandi-NEAT exam • Leo AI',
  description: 'Practice questions, mocks, and AI-powered prep for the Anandi-NEAT exam on November 29, 2026.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Plus Jakarta Sans (Primary UI) + Newsreader (Editorial Serif) + JetBrains Mono (Numbers) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* KaTeX Math Styling */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-emerald-500 selection:text-white min-h-screen relative overflow-x-hidden">
        {/* Anandi Emerald Ambient Depth (Subtle mint light pool at top) */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-emerald-100/70 via-emerald-50/30 to-transparent blur-[120px] pointer-events-none -z-10" />
        {children}
      </body>
    </html>
  );
}
