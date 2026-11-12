'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useRadarSession } from '@/lib/firebase/session';

type Item={id:string;title?:string;body?:string;createdAt?:{toDate:()=>Date};readAt?:unknown;serviceCallId?:string};
export function Notifications(){
 const {user}=useRadarSession();const [items,setItems]=useState<Item[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 useEffect(()=>{
  if(!user){setItems([]);setLoading(false);return;}
  setLoading(true);const {db}=getFirebaseClient();
  return onSnapshot(query(collection(db,'notifications',user.uid,'items'),orderBy('createdAt','desc'),limit(100)),snapshot=>{
   setItems(snapshot.docs.map(d=>({id:d.id,...d.data()} as Item)));setError('');setLoading(false);
  },()=>{setError('Não foi possível acompanhar as notificações.');setLoading(false);});
 },[user]);
 async function markRead(item:Item){
  if(!user||item.readAt)return;
  try{await updateDoc(doc(getFirebaseClient().db,'notifications',user.uid,'items',item.id),{readAt:serverTimestamp()});}
  catch{setError('Não foi possível marcar como lida.');}
 }
 return <main className="page-wrap"><div className="page-heading"><div><p className="eyebrow">CENTRAL DA CONTA</p><h1>Notificações</h1><p>Atualizações sobre sua conta e candidaturas.</p></div><Link className="button button-secondary" href="/painel">Voltar ao painel</Link></div>
  {error&&<p className="form-message">{error}</p>}{loading&&<p className="muted">Conectando à central de notificações…</p>}
  {items.length===0&&!error?<div className="empty-state"><span>◌</span><h2>Você está em dia</h2><p>Notificações importantes aparecerão aqui.</p></div>:<div className="notification-list">{items.map(item=><article className={'notification-card '+(item.readAt?'is-read':'is-unread')} key={item.id}><span className="notification-dot"/><div><h2>{item.title||'Atualização do Radar'}</h2><p>{item.body||'Há uma atualização disponível na sua conta.'}</p><small>{item.createdAt?.toDate().toLocaleString('pt-BR')||'Agora'}</small>{item.serviceCallId&&<p><Link href={'/oportunidades/'+item.serviceCallId}>Ver oportunidade →</Link></p>}</div>{!item.readAt&&<button className="row-action" onClick={()=>void markRead(item)}>Marcar como lida</button>}</article>)}</div>}
 </main>;
}

