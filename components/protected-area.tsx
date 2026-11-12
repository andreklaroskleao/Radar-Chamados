'use client';
import Link from 'next/link';
import { useRadarSession } from '@/lib/firebase/session';
export function ProtectedArea({children}:{children:React.ReactNode}){
 const {user,loading,configurationError}=useRadarSession();
 if(loading)return <main className="page-wrap"><div className="notice-card">Carregando sua sessão…</div></main>;
 if(configurationError)return <main className="page-wrap"><div className="notice-card"><h1>Firebase precisa de configuração</h1><p>{configurationError}</p><p>Defina as variáveis públicas NEXT_PUBLIC_FIREBASE_* neste ambiente.</p></div></main>;
 if(!user)return <main className="page-wrap"><div className="notice-card"><h1>Entre para continuar</h1><p>Esta área usa sua conta do Radar.</p><Link className="button button-primary" href="/entrar">Entrar na plataforma</Link></div></main>;
 return <>{children}</>;
}

