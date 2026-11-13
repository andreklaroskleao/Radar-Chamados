'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useRadarSession } from '@/lib/firebase/session';
import { getFirebaseClient } from '@/lib/firebase/client';
import { ensureUserDocuments } from '@/lib/firebase/auth';

type CompanyLink = { companyId: string; role: string; name?: string };
export function Dashboard() {
  const { user } = useRadarSession();
  const [profileName, setProfileName] = useState('');
  const [accountStatus, setAccountStatus] = useState('active');
  const [companies, setCompanies] = useState<CompanyLink[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let active = true;
    async function loadDashboard() {
      setLoading(true);
      setMessage('');
      setProfileName(currentUser.displayName || '');
      try {
        await ensureUserDocuments(currentUser);
        const { db } = getFirebaseClient();
        const [account, profile, admin, membershipDocs] = await Promise.all([
          getDoc(doc(db, 'users', currentUser.uid)),
          getDoc(doc(db, 'professionalProfiles', currentUser.uid)),
          getDoc(doc(db, 'adminPermissions', currentUser.uid)),
          getDocs(query(collection(db, 'companyMembers'), where('uid', '==', currentUser.uid), where('status', '==', 'active')))
        ]);
        if (!active) return;
        if (profile.exists()) setProfileName(String(profile.data().displayName || currentUser.displayName || ''));
        if (account.exists()) setAccountStatus(String(account.data().accountStatus || 'active'));
        setIsAdmin(admin.exists() && admin.data().enabled === true);
        const memberships = membershipDocs.docs.map((item) => item.data() as CompanyLink);
        const companySnapshots = await Promise.all(memberships.map((membership) => getDoc(doc(db, 'companyProfiles', membership.companyId))));
        if (!active) return;
        setCompanies(memberships.map((membership, index) => ({ ...membership, name: companySnapshots[index].exists() ? String(companySnapshots[index].data().name) : 'Empresa' })));
      } catch (error) {
        if (!active) return;
        const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
        setMessage(code ? `Você entrou, mas o perfil ainda não foi carregado do Firestore (${code}). Tente novamente quando a conexão voltar.` : 'Você entrou, mas não foi possível carregar o perfil agora. Tente novamente.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, [user, retry]);
  return <main className="page-wrap"><div className="page-heading"><div><p className="eyebrow">PAINEL DA CONTA</p><h1>Olá{profileName ? ', ' + profileName.split(' ')[0] : ''}.</h1><p>Escolha um ambiente para continuar.</p></div></div>
    {accountStatus !== 'active' && <div className="form-message"><strong>Conta {accountStatus}.</strong> Novas alterações estão temporariamente bloqueadas. Consulte as notificações ou a administração.</div>}
    {message && <div className="form-message" role="status"><p>{message}</p><button className="button button-secondary" disabled={loading} onClick={() => setRetry((value) => value + 1)}>{loading ? 'Tentando…' : 'Tentar carregar novamente'}</button></div>}
    <div className="environment-grid">
      <article className="environment-card"><span className="card-icon">✦</span><p className="eyebrow">PESSOA PROFISSIONAL</p><h2>Seu perfil e suas oportunidades</h2><p>Apresente experiência, especialidades e cidades que atende.</p><Link className="button button-secondary" href="/perfil">Abrir perfil</Link></article>
      <article className="environment-card"><span className="card-icon">▦</span><p className="eyebrow">EMPRESAS</p><h2>Ambientes empresariais</h2><p>Atue em uma ou mais empresas com permissões próprias.</p><Link className="button button-secondary" href="/empresas/nova">Criar empresa</Link>
        {companies.map((company) => <Link className="company-link" href={'/empresas/' + company.companyId} key={company.companyId}>{company.name}<small>{company.role}</small></Link>)}
      </article>
      <article className="environment-card"><span className="card-icon">⌘</span><p className="eyebrow">ADMINISTRAÇÃO</p><h2>Gestão da plataforma</h2><p>Moderação, contas e configurações comerciais.</p>{isAdmin ? <div className="form-actions"><Link className="button button-secondary" href="/admin">Abrir administração</Link><Link className="button button-secondary" href="/admin/distribuicao">Distribuição</Link><Link className="button button-secondary" href="/admin/denuncias">Denúncias</Link></div> : <span className="status-chip">Acesso restrito</span>}</article>
    </div>
    <div className="quick-links"><Link href="/profissionais">Explorar profissionais <span>→</span></Link><Link href="/empresas">Explorar empresas <span>→</span></Link><Link href="/oportunidades">Ver oportunidades <span>→</span></Link><Link href="/notificacoes">Notificações <span>→</span></Link></div>
  </main>;
}







