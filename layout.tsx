export const metadata = {
  title: 'Customer Comparison Profile',
  description: 'Baseline vs. M&A target brand audience comparison',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
