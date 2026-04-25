import { cookies } from "next/headers";
import SideNav from "@/app/ui/sidenav";
import { getDict } from "./lib/dict";
import "./globals.css";

export const metadata = {
  title: "Automation Dashboard",
  description: "Pipeline monitoring dashboard",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || process.env.NEXT_PUBLIC_LANG || "en";
  const dict = await getDict();

  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-row" style={{backgroundColor: '#0A0A0A', color: '#EDEDED'}}>
        <SideNav dict={dict} lang={lang} />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
