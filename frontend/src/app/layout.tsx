import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video Frames Editor",
  description: "Create videos from AI-generated images",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
        {children}
      </body>
    </html>
  );
}
