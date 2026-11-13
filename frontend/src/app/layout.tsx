import './globals.css';
import { Barlow, Exo_2 } from 'next/font/google';

const display = Exo_2({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-display', display: 'swap' });
const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'NOVA MISSION COMMAND',
  description: 'Planifier • Simuler • Explorer • Réussir — NASA Space Apps Challenge 2026',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body className="bg-nova-bg text-slate-100 font-sans antialiased">{children}</body>
    </html>
  );
}
