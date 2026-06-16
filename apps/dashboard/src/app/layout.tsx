import "./globals.css";

export const metadata = {
  title: "TrustMesh Protocol Dashboard",
  description: "On-chain multi-agent coordination, reputation score calculations, and validation registry explorer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
