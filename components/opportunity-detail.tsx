'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useRadarSession } from '@/lib/firebase/session';
import { getFirebaseClient } from '@/lib/firebase/client';

type Call={title?:string;description?:string;category?:string;stateCode?:string;cityCode?:string;providerType?:string;status?:string;deadline?:{toDate:()=>Date};executionDate?:{toDate:()=>Date}|null;specialties?:string[];requiredCertifications?:string[];technicalRequirements?:string;experienceYears?:number;professionalCount?:number;compensationDescription?:string;travelAssistance?:boolean;companyId?:string};
type Membership={companyId:string;role:string;name?:string};
export function OpportunityDetail({callId}:{callId:string}){
 const {user}=useRadarSession();const [item,setItem]=useState<Call|null>(null);const [companies,setCompanies]=useState<Membership[]>([]);
 const [kind,setKind]=useState<'professional'|'company'>('professional');const [companyId,setCompanyId]=useState('');const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{
  const {db}=getFirebaseClient();getDoc(doc(db,'serviceCalls',callId)).then(s=>{if(s.exists())setItem(s.data() as Call);}).catch(()=>setError('Não foi possível carregar a oportunidade.'));
 },[callId]);
 useEffect(()=>{
  if(!user)return;const {db}=getFirebaseClient();
  getDocs(query(collection(db,'companyMembers'),where('uid','==',user.uid),where('status','==','active')))
   .then(async s=>{
    const list=s.docs.map(d=>d.data() as Membership);
    const profiles=await Promise.all(list.map(m=>getDoc(doc(db,'companyProfiles',m.companyId))));
    setCompanies(list.map((m,i)=>({...m,name:profiles[i].exists()?String(profiles[i].data().name):'Empresa'})));
   }).catch(()=>setCompanies([]));
 },[user]);
 async function apply(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!user||!item)return;
  if(kind==='company'&&!companyId){setError('Escolha uma empresa para candidatar.');return;}
  const applicantId=kind==='professional'?user.uid:companyId;
  const applicationId=callId+'_'+kind+'_'+applicantId;
  setBusy(true);setError('');
  try{
   const {db}=getFirebaseClient();
   await setDoc(doc(db,'callApplications',applicationId),{
    applicationId,serviceCallId:callId,companyId:item.companyId,applicantType:kind,applicantId,applicantUid:user.uid,
    message:message.trim(),status:'submitted',createdAt:serverTimestamp(),updatedAt:serverTimestamp()
   });
   setError('Candidatura enviada. A empresa poderá atualizar o andamento no seu ambiente.');
  }catch{setError('Não foi possível enviar. Confira se o chamado aceita esse tipo de fornecedor, se o prazo está aberto e se seu perfil está completo.');}
  finally{setBusy(false);}
 }
 const expired=Boolean(item?.deadline&&item.deadline.toDate().getTime()<=Date.now());
 const accepts=!expired&&['published','acceptingApplications'].includes(item?.status||'')&&(kind==='professional'?item?.providerType!=='company':item?.providerType!=='professional');
 return <main className="page-wrap"><Link className="back-link" href="/oportunidades">← Todas as oportunidades</Link>
  {!item?<div className="notice-card"><h1>Oportunidade não encontrada</h1><p>{error}</p></div>:<article className="opportunity-detail panel-card">
   <p className="eyebrow">OPORTUNIDADE · {item.providerType==='both'?'PROFISSIONAL OU EMPRESA':item.providerType==='company'?'EMPRESA':'PROFISSIONAL'}</p>
   <h1>{item.title}</h1><p>{item.category} · {item.stateCode} · Município IBGE {item.cityCode}</p><div className="opportunity-description">{item.description}</div>
   <p><strong>Especialidades:</strong> {item.specialties?.join(' · ')||'A combinar'}</p>
   {item.technicalRequirements&&<p><strong>Requisitos técnicos:</strong> {item.technicalRequirements}</p>}
   {item.requiredCertifications?.length? <p><strong>Certificações exigidas:</strong> {item.requiredCertifications.join(' · ')}</p>:null}
   <p><strong>Experiência mínima:</strong> {item.experienceYears||0} anos · <strong>Vagas:</strong> {item.professionalCount||1}</p>
   <p><strong>Remuneração:</strong> {item.compensationDescription||'A combinar'} · <strong>Deslocamento:</strong> {item.travelAssistance?'há ajuda de custo':'por conta do fornecedor'}</p>
   {item.executionDate&&<p><strong>Data prevista:</strong> {item.executionDate.toDate().toLocaleDateString('pt-BR')}</p>}
   {item.deadline&&<p><strong>Prazo para candidatura:</strong> {item.deadline.toDate().toLocaleString('pt-BR')}</p>}
   {expired&&<p className="form-message">O prazo deste chamado encerrou. O conteúdo permanece disponível, mas não aceita novas candidaturas.</p>}
   {item.status&&!['published','acceptingApplications'].includes(item.status)&&<p className="status-chip">Status do chamado: {item.status}</p>}
   <p><Link className="report-link" href={'/denunciar?targetType=serviceCall&targetId='+encodeURIComponent(callId)}>Denunciar oportunidade</Link></p>
   <form className="form-stack" onSubmit={e=>void apply(e)}><h2>Tenho interesse</h2>
    {!user&&<p><Link href="/entrar">Entre</Link> para se candidatar.</p>}
    {user&&<><label>Candidatar como<select value={kind} onChange={e=>setKind(e.target.value as 'professional'|'company')}><option value="professional">Profissional</option><option value="company" disabled={!companies.length}>Empresa</option></select></label>
     {kind==='company'&&<label>Empresa<select required value={companyId} onChange={e=>setCompanyId(e.target.value)}><option value="">Selecione</option>{companies.map(c=><option key={c.companyId} value={c.companyId}>{c.name}</option>)}</select></label>}
     <label>Mensagem para a empresa<textarea rows={4} maxLength={1200} value={message} onChange={e=>setMessage(e.target.value)}/></label>
     {!accepts&&<p className="form-message">Este chamado não aceita novas candidaturas para este tipo de fornecedor ou já foi encerrado pela empresa.</p>}
     <button className="button button-primary" disabled={busy||!accepts}>{busy?'Enviando…':'Enviar candidatura'}</button>
    </>}
    {error&&<p className="form-message" role="status">{error}</p>}
   </form>
  </article>}
 </main>;
}


