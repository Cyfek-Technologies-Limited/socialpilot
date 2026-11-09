import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Soville — Make room for your next big idea',description:'Soville helps you create captions, design graphics, and schedule social media content from one workspace.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;}
