import SideNav from "@/app/ui/sidenav";
import "./globals.css";

export const metadata = {
  title: "Automation Dashboard",
  description: "Pipeline monitoring dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-row bg-bg text-text-primary">
        <SideNav />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
