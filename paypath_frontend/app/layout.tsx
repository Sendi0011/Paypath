import type { Metadata } from 'next';
import '../src/index.css';
import Providers from '../src/components/Providers';
import Navbar from '../src/components/Navbar';
import NetworkBanner from '../src/components/NetworkBanner';
import ToastContainer from '../src/components/Toast';

export const metadata: Metadata = {
  title: 'PayPath — The financial layer gig workers never had',
  description: 'AI-automated USDC payroll. Verifiable onchain income history. Instant DeFi credit.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <Navbar />
          <NetworkBanner />
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
