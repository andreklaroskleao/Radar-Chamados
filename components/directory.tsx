'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';

type DirectoryEntry={id:string;name?:string;displayName?:string;headline?:string;category?:string;description?:string;stateCode?:string;cityCode?:string;specialties?:string[];courses?:string[];qualifications?:string[];certifications?:string[];available?:boolean};
export function Directory({kind}:{kind:'professional'|'company'}){
 const [items,setItems]=useState<DirectoryEntry[]>([]);const [term,setTerm]=useState('');const [stateCode,setStateCode]=useState('');
 const [busy,setBusy]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{
  const {db}=getFirebaseClient();const path=kind==='professional'?'professionalProfiles':'companyProfiles';
  getDocs(query(collection(db,path),where('visibility','==','public'),where(kind==='professional'?'accountStatus':'status','==','active'),where('moderationStatus','==','approved'),limit(100)))
   .then(result=>setItems(result.docs.map(d=>({id:d.id,...d.data()} as DirectoryEntry))))
   .catch(()=>setError('Não foi possível carregar o diretório. Cadastros privados não são exibidos.'))
   .finally(()=>setBusy(false));
 },[kind]);
 const filtered=useMemo(()=>items.filter(item=>{
  const text=[item.name,item.displayName,item.headline,item.category,item.description,...(item.specialties||[]),...(item.courses||[]),...(item.qualifications||[]),...(item.certifications||[])].join(' ').toLocaleLowerCase('pt-BR');
  return (!term||text.includes(term.toLocaleLowerCase('pt-BR')))&&(!stateCode||item.stateCode===stateCode);
 }),[items,term,stateCode]);
 return <main className="page-wrap"><div className="page-heading"><div><p className="eyebrow">DIRETÓRIO REGIONAL</p><h1>{kind==='professional'?'Profissionais':'Empresas'}</h1><p>Resultados públicos e aprovados, com localidades e especialidades cadastradas.</p></div></div>
  <div className="search-tools"><label>Pesquisar<input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Nome, serviço ou especialidade"/></label><label>Estado<select value={stateCode} onChange={e=>setStateCode(e.target.value)}><option value="">Todos os estados</option><option value="RS">Rio Grande do Sul</option><option value="SC">Santa Catarina</option><option value="PR">Paraná</option><option value="SP">São Paulo</option></select></label></div>
  {busy?<div className="notice-card">Carregando diretório…</div>:error?<div className="notice-card">{error}</div>:filtered.length===0?<div className="empty-state"><span>⌕</span><h2>Nenhum resultado por enquanto</h2><p>Amplie os filtros ou volte mais tarde.</p></div>:<div className="directory-grid">{filtered.map(item=><article className="directory-card" key={item.id}><div className="avatar-mark">{(item.displayName||item.name||'?').slice(0,1).toUpperCase()}</div><div><p className="eyebrow">{item.category||item.headline||'CADASTRO APROVADO'}</p><h2>{item.displayName||item.name}</h2><p>{item.description||item.headline||item.specialties?.join(' · ')||'Perfil profissional'}</p>{kind==='professional'&&(item.courses?.length||item.qualifications?.length||item.certifications?.length)&&<small>Qualificações: {[...(item.courses||[]),...(item.qualifications||[]),...(item.certifications||[])].join(' · ')}</small>}<small>{item.stateCode||'—'} {item.cityCode?'· código IBGE '+item.cityCode:''}</small></div><span className="status-chip">{kind==='professional'?(item.available?'Disponível':'Profissional'):'Empresa'}</span><Link className="report-link" href={'/denunciar?targetType='+kind+'&targetId='+encodeURIComponent(item.id)}>Denunciar</Link></article>)}</div>}
  <p className="directory-note">A lista exibe até 100 resultados. Contatos privados não são compartilhados; a plataforma não presume atendimento por proximidade.</p>
 </main>;
}



