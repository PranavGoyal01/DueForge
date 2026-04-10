import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Sora } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
	variable: "--font-plus-jakarta",
	weight: ["400", "500", "600", "700"],
	subsets: ["latin"],
});

const sora = Sora({
	variable: "--font-sora",
	weight: ["400", "500", "600", "700"],
	subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "DueForge",
	description: "Execution-focused accountability augmenter",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<body className={`${plusJakarta.variable} ${sora.variable} ${jetBrainsMono.variable} antialiased`}>{children}</body>
			<SpeedInsights />
			<Analytics />
		</html>
	);
}
