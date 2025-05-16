import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Cryptic Collective",
  description: "Share and solve cryptic crosswords with your friends",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 text-gray-900`}>
        <header className="border-b border-gray-300 bg-white py-4">
          <div className="max-w-3xl mx-auto px-4 flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              <Link href="/" className="text-purple-700 hover:underline">
                Cryptic Collective
              </Link>
            </h1>
            <nav className="flex gap-6 text-sm sm:text-base text-gray-600">
              <Link href="/" className="hover:text-purple-700 transition">Home</Link>
              <Link href="#" className="hover:text-purple-700 transition">Guide</Link>
              <Link href="#" className="hover:text-purple-700 transition">Stats</Link>
            </nav>
          </div>
        </header>

        <main className="min-h-[calc(100vh-160px)] px-4 py-10 sm:py-14">
          <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-lg p-6 sm:p-8">
            {children}
          </div>
        </main>

        <footer className="border-t border-gray-300 py-6 text-sm text-gray-500">
          <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
            <p>© 2025 Thomas Bale. All rights reserved.</p>
            <div className="flex gap-4 mt-2 sm:mt-0">
              <Link href="#" className="hover:underline">Privacy</Link>
              <Link href="#" className="hover:underline">Contact</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
