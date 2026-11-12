import Link from 'next/link';
import { EXPECTED_FIREBASE_PROJECT_ID, type ClientConfigDiagnostic } from '@/lib/firebase/diagnostics';
import { firebaseSetupItems } from '@/lib/firebase/dependencies';

type SetupDashboardProps = { config: ClientConfigDiagnostic; currentHost: string };

export function SetupDashboard({config,currentHost}:SetupDashboardProps){
 return <main className="setup-page"><div className="page-width">
  <nav className="breadcrumbs"><Link href="/">Radar Comercial Regional</Link><span> / </span><span>Diagnóstico Firebase</span></nav>
  <header className="setup-hero"><div className="hero-copy"><p className="eyebrow">ASSISTENTE DE CONFIGURAÇÃO</p><h1>Diagnóstico do Firebase</h1>
   <p className="hero-description">Esta tela verifica somente as variáveis web locais. Ela não acessa nem modifica o Console do Firebase.</p>
   <div className="hero-project"><span>Projeto de destino</span><strong>{EXPECTED_FIREBASE_PROJECT_ID}</strong><a href={`https://console.firebase.google.com/project/${EXPECTED_FIREBASE_PROJECT_ID}/settings/general`} target="_blank" rel="noreferrer noopener">Abrir configurações ↗</a></div>
  </div></header>
  <section className="overview-grid"><article className="overview-card"><p className="card-kicker">CONFIGURAÇÃO LOCAL</p><h2>{config.state==='ready'?'Configuração web encontrada':'Revisão necessária'}</h2>
   <p>{config.state==='ready'?'As variáveis estão presentes e apontam para o projeto esperado.':'Confira as variáveis NEXT_PUBLIC_FIREBASE_* no ambiente local.'}</p>
   {config.missingVariables.length>0&&<p><strong>Ausentes:</strong> {config.missingVariables.join(', ')}</p>}
   {config.state==='wrong-project'&&<p>O projeto configurado não corresponde ao destino esperado.</p>}
   <p className="fine-print">Host observado: <code>{currentHost}</code>. Authentication, Firestore, regras implantadas e domínios exigem conferência manual.</p>
  </article><article className="overview-card"><p className="card-kicker">INTEGRAÇÃO DE CÓDIGO</p><h2>Auth e Firestore conectados no cliente</h2><p>O app já possui fluxos locais. O estado do Console remoto não é presumido.</p><p className="fine-print">Use o projeto existente. Não habilite billing nem crie outro projeto.</p></article></section>
  <section className="dependencies-section"><div className="section-heading"><p className="eyebrow">SERVIÇOS FIREBASE</p><h2>Dependências</h2></div><div className="dependency-list">
   {firebaseSetupItems.map(item=><article className={`dependency-card ${item.state==='not-used'?'dependency-card--muted':''}`} key={item.id}><header className="dependency-heading"><div className="dependency-title"><h3>{item.name}</h3><p>{item.usage}</p></div><span className="status-badge">{item.state==='manual'?'Conferência manual necessária':'Não utilizado'}</span></header><div className="dependency-body"><div className="dependency-detail"><h4>Uso</h4><p>{item.purpose}</p><h4>Funcionalidades</h4><ul>{item.features.map(x=><li key={x}>{x}</li>)}</ul></div><div className="dependency-detail"><h4>Próximos passos</h4><ol>{item.instructions.map(x=><li key={x}>{x}</li>)}</ol></div></div><div className="impact-grid"><div className="impact-card"><span className="impact-label">Custo</span><p>{item.cost}</p></div><div className="impact-card"><span className="impact-label">Segurança</span><p>{item.security}</p></div></div>{item.consoleUrl&&<footer className="dependency-footer"><a className="console-link" href={item.consoleUrl} target="_blank" rel="noreferrer noopener">{item.consoleLabel} ↗</a></footer>}</article>)}
  </div></section>
 </div></main>;
}

