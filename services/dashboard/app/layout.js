import SideNav from "@/app/ui/sidenav";
import en from "./lib/locales/en";
import zh from "./lib/locales/zh";
import "./globals.css";

export const metadata = {
  title: "Automation Dashboard",
  description: "Pipeline monitoring dashboard",
};

export default function RootLayout({ children }) {
  const lang = process.env.NEXT_PUBLIC_LANG || "en";
  const dict = lang === "en" ? en : zh;

  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-row" style={{backgroundColor: '#0A0A0A', color: '#EDEDED'}}>
        <SideNav dict={dict} />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
