import type { Metadata } from 'next';
import './globals.css';
import './product.css';
import { RadarShell } from '@/components/radar-shell';

export const metadata: Metadata = {
  title: 'Radar Comercial Regional',
  description: 'Conecte profissionais, empresas e oportunidades na sua região.'
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR"><body><RadarShell>{children}</RadarShell></body></html>;
}

