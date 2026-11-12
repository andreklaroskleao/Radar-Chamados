'use client';
import { useEffect, useState } from 'react';
import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useRadarSession } from '@/lib/firebase/session';

type Application={id:string;serviceCallId:string;companyId:string;applicantUid:string;applicantId:string;applicantType:string;message:string;status:string};
const transitions:Record<string,string[]>={submitted:['submitted','viewed','rejected'],viewed:['viewed','underReview','selected','negotiating','approved','rejected'],underReview:['underReview','selected','negotiating','approved','rejected'],selected:['selected','negotiating','approved','rejected'],negotiating:['negotiating','approved','rejected'],approved:['approved'],rejected:['rejected'],cancelled:['cancelled']};
const labels:Record<string,string>={submitted:'Recebida',viewed:'Visualizada',underReview:'Em análise',selected:'Selecionada',negotiating:'Em negociação',approved:'Aprovada',rejected:'Recusada',cancelled:'Cancelada'};
export function CompanyApplications({companyId}:{companyId:string}){
 const {user}=useRadarSession();const [items,setItems]=useState<Application[]>([]);const [error,setError]=useState('');
 async function load(){
  if(!user)return;
  try{const {db}=getFirebaseClient();const result=await getDocs(query(collection(db,'callApplications'),where('companyId','==',companyId)));
   setItems(result.docs.map(d=>({id:d.id,...d.data()} as Application)));
  }catch{setError('Não foi possível abrir as candidaturas. Confirme se você tem papel de gestão nesta empresa.');}
 }
 useEffect(()=>{void load();},[companyId,user]);
 async function change(item:Application,status:string){
  if(!user)return;
  try{
   const {db}=getFirebaseClient();const batch=writeBatch(db);
   batch.update(doc(db,'callApplications',item.id),{status,updatedAt:serverTimestamp()});
   const notificationRef=doc(collection(db,'notifications',item.applicantUid,'items'));
   batch.set(notificationRef,{
    title:'Atualização da candidatura',body:'A empresa atualizou sua candidatura para: '+status,
    applicationId:item.id,serviceCallId:item.serviceCallId,companyId,actorUid:user.uid,
    createdAt:serverTimestamp(),readAt:null
   });
   await batch.commit();await load();
  }catch{setError('Não foi possível alterar o status ou criar a notificação.');}
 }
 return <section className="panel-card"><p className="eyebrow">OPORTUNIDADES DA EMPRESA</p><h2>Candidaturas recebidas</h2>{error&&<p className="form-message">{error}</p>}
  {!error&&items.length===0?<p className="muted">Ainda não há candidaturas.</p>:<div className="admin-list">{items.map(item=><article className="admin-row" key={item.id}><div><strong>{item.applicantType==='company'?'Empresa':'Profissional'} · {item.applicantId}</strong><small>Chamado {item.serviceCallId} · {item.status}<br/>{item.message}</small></div><select value={item.status} onChange={e=>void change(item,e.target.value)}>{(transitions[item.status]||[item.status]).map(status=><option key={status} value={status}>{labels[status]||status}</option>)}</select></article>)}</div>}
 </section>;
}




