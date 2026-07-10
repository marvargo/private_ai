import './globals.css'; import type { Metadata } from 'next';
export const metadata: Metadata = { title:'WyndMe Private AI', description:'Private Llama and Qwen Coder AI factory control panel' };
export default function RootLayout({children}:{children:React.ReactNode}){ return <html lang="en"><body>{children}</body></html>; }
