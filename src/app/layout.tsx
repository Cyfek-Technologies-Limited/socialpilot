import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'SocialPilot AI — Make room for your next big idea',description:'A considered workspace for your social content. Plan, create, review, and publish with control.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;}
