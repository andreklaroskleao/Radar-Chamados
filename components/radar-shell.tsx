'use client';
import Link from 'next/link';
import { useRadarSession } from '@/lib/firebase/session';
import { logout } from '@/lib/firebase/auth';
export function RadarShell({children}:{children:React.ReactNode}){
 const {user}=useRadarSession();
 return <><header className="site-header"><Link className="site-brand" href="/" aria-label="Radar Comercial Regional, início"><span className="brand-orbit">R</span><span><strong>Radar</strong><small>COMERCIAL REGIONAL</small></span></Link>
  <nav className="site-nav" aria-label="Navegação principal"><Link href="/profissionais">Profissionais</Link><Link href="/empresas">Empresas</Link><Link href="/oportunidades">Oportunidades</Link>{user?<><Link href="/painel">Meu painel</Link><Link href="/notificacoes">Avisos</Link></>:<Link href="/entrar">Entrar</Link>}{user?<button className="nav-button" onClick={()=>void logout()}>Sair</button>:<Link className="nav-cta" href="/cadastro">Criar conta</Link>}</nav>
 </header>{children}<footer className="site-footer"><span>Radar Comercial Regional</span><span>Conexões profissionais com alcance local.</span></footer></>;
}

