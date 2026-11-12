'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';

type Call={id:string;title?:string;description?:string;category?:string;stateCode?:string;cityCode?:string;providerType?:string;deadline?:{toDate:()=>Date};specialties?:string[];compensationDescription?:string};
export function OpportunityList(){
 const [items,setItems]=useState<Call[]>([]);const [term,setTerm]=useState('');const [busy,setBusy]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{
  const {db}=getFirebaseClient();
  getDocs(query(collection(db,'serviceCalls'),where('status','in',['published','acceptingApplications']),where('companyStatus','==','active'),where('moderationStatus','==','approved'),limit(100)))
   .then(result=>setItems(result.docs.map(d=>({id:d.id,...d.data()} as Call)).filter(item=>!item.deadline||item.deadline.toDate().getTime()>Date.now())))
   .catch(()=>setError('As oportunidades ainda não estão disponíveis ou as regras do Firestore precisam ser publicadas.'))
   .finally(()=>setBusy(false));
 },[]);
 const filtered=useMemo(()=>items.filter(item=>[item.title,item.description,item.category,item.stateCode,item.cityCode,item.compensationDescription,...(item.specialties||[])].join(' ').toLocaleLowerCase('pt-BR').includes(term.toLocaleLowerCase('pt-BR'))),[items,term]);
 return <main className="page-wrap"><div className="page-heading"><div><p className="eyebrow">CHAMADOS REGIONAIS</p><h1>Oportunidades</h1><p>Chamados publicados e aprovados por empresas cadastradas.</p></div><Link className="button button-secondary" href="/painel">Área da empresa</Link></div>
  <div className="search-tools"><label>Pesquisar oportunidades<input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Serviço, cidade ou especialidade"/></label><span className="directory-note">As cidades atendidas precisam ser declaradas pelo candidato.</span></div>
  {busy?<div className="notice-card">Carregando oportunidades…</div>:error?<div className="notice-card">{error}</div>:filtered.length===0?<div className="empty-state"><span>↗</span><h2>Nenhuma oportunidade publicada</h2><p>As novas oportunidades aparecerão aqui após revisão.</p></div>:<div className="directory-grid">{filtered.map(item=><article className="directory-card opportunity-card" key={item.id}><div className="avatar-mark">↗</div><div><p className="eyebrow">{item.category||'SERVIÇO'} · {item.providerType==='both'?'PROFISSIONAL OU EMPRESA':item.providerType==='company'?'FORNECEDOR EMPRESARIAL':'PROFISSIONAL'}</p><h2>{item.title}</h2><p>{item.description}</p><small>{item.stateCode} · IBGE {item.cityCode} · {item.compensationDescription||'A combinar'} {item.deadline? '· até '+item.deadline.toDate().toLocaleDateString('pt-BR'):''}</small><Link className="text-link" href={'/oportunidades/'+item.id}>Ver oportunidade →</Link></div></article>)}</div>}
 </main>;
}


