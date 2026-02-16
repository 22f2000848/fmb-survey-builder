import type { Metadata } from "next";
import "react-datepicker/dist/react-datepicker.css";
import "@/app/globals.css";
import "@/legacy/App.css";

export const metadata: Metadata = {
  title: "CG Dump Server",
  description: "Survey dump management platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
