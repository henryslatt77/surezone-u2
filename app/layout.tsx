import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SUREZONE - Sistema de Detecção de Arbitragem",
  description:
    "Detecte oportunidades de arbitragem em tempo real. Nossa tecnologia de radar avançada identifica as melhores combinações para garantir lucros consistentes no mercado de apostas.",
  keywords: ["arbitragem", "apostas", "surezone", "calculadora", "odds", "lucro garantido"],
  authors: [{ name: "SUREZONE Team" }],
  creator: "SUREZONE",
  publisher: "SUREZONE",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://surezone.vercel.app",
    title: "SUREZONE - Sistema de Detecção de Arbitragem",
    description: "Detecte oportunidades de arbitragem em tempo real com nossa tecnologia de radar avançada.",
    siteName: "SUREZONE",
    images: [
      {
        url: "/surezone-logo.png",
        width: 1200,
        height: 630,
        alt: "SUREZONE - Sistema de Detecção de Arbitragem",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SUREZONE - Sistema de Detecção de Arbitragem",
    description: "Detecte oportunidades de arbitragem em tempo real com nossa tecnologia de radar avançada.",
    images: ["/surezone-logo.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: "#22ff88",
  manifest: "/manifest.json",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#22ff88" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
