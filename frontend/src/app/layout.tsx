import './globals.css';
export const metadata = {
  title: 'NOVA MISSION COMMAND',
  description: 'NASA Space Apps Challenge 2026',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
