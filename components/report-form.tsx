'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useRadarSession } from '@/lib/firebase/session';
type TargetType='professional'|'company'|'serviceCall'|'user';
export function ReportForm({targetType,targetId}:{targetType?:string;targetId?:string}){
 const {user}=useRadarSession();const [type,setType]=useState<TargetType>((['professional','company','serviceCall','user'].includes(targetType||'')?targetType:'professional') as TargetType);
 const [id,setId]=useState(targetId||'');const [reason,setReason]=useState('');const [description,setDescription]=useState('');
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!user)return;setBusy(true);setMessage('');
  try{
   const {db}=getFirebaseClient();const ref=doc(collection(db,'reports'));
   await setDoc(ref,{reportId:ref.id,reporterUid:user.uid,targetType:type,targetId:id.trim(),reason,description:description.trim(),status:'open',createdAt:serverTimestamp()});
   setMessage('Denúncia registrada. A equipe de administração poderá revisá-la.');
   setReason('');setDescription('');
  }catch{setMessage('Não foi possível registrar a denúncia. Tente novamente.');}
  finally{setBusy(false);}
 }
 return <main className="page-wrap"><Link className="back-link" href="/">← Início</Link><form className="panel-card form-stack" onSubmit={e=>void submit(e)}><p className="eyebrow">SEGURANÇA E MODERAÇÃO</p><h1>Registrar uma denúncia</h1><p className="muted">Descreva o conteúdo e o motivo. A denúncia fica visível apenas para você e a equipe autorizada.</p>
  <label>Tipo de cadastro<select value={type} onChange={e=>setType(e.target.value as TargetType)}><option value="professional">Perfil profissional</option><option value="company">Empresa</option><option value="serviceCall">Oportunidade</option><option value="user">Conta de usuário</option></select></label>
  <label>ID do cadastro denunciado<input required value={id} onChange={e=>setId(e.target.value)}/></label>
  <label>Motivo<select required value={reason} onChange={e=>setReason(e.target.value)}><option value="">Selecione</option><option value="inaccurate">Informação enganosa</option><option value="inappropriate">Conteúdo inadequado</option><option value="fraud">Suspeita de fraude</option><option value="privacy">Privacidade ou uso indevido de dados</option><option value="other">Outro</option></select></label>
  <label>Detalhes<textarea required maxLength={1500} rows={5} value={description} onChange={e=>setDescription(e.target.value)}/></label>
  {message&&<p className="success-message" role="status">{message}</p>}<button className="button button-primary" disabled={busy}>{busy?'Enviando…':'Enviar denúncia'}</button>
 </form></main>;
}

