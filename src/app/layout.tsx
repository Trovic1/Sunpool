import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Geist, JetBrains_Mono } from "next/font/google"
import { NuqsAdapter } from "nuqs/adapters/next/app"

import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
})

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Sunpool · Neighborhood solar trading",
  description:
    "Households with rooftop solar sell surplus kWh to neighbors, settled in dollar stablecoins on Celo. Every verified kWh mints a certificate that can only be claimed once.",
}

export const viewport: Viewport = {
  themeColor: "#f7f7f4",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${geist.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <NuqsAdapter>
            <TooltipProvider>{children}</TooltipProvider>
          </NuqsAdapter>
        </Providers>
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
