'use client';
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useRadarSession } from '@/lib/firebase/session';
import { ProtectedArea } from '@/components/protected-area';
type Report={id:string;reporterUid:string;targetType:string;targetId:string;reason:string;description:string;status:string};
function ReportQueueContent(){
 const {user}=useRadarSession();const [allowed,setAllowed]=useState(false);const [items,setItems]=useState<Report[]>([]);
 const [loading,setLoading]=useState(true);const [message,setMessage]=useState('');
 async function load(){
  if(!user)return;setLoading(true);
  try{
   const {db}=getFirebaseClient();const permission=await getDoc(doc(db,'adminPermissions',user.uid));
   const ok=permission.exists()&&permission.data().enabled===true;setAllowed(ok);
   if(!ok){setLoading(false);return;}
   const result=await getDocs(query(collection(db,'reports'),where('status','==','open')));
   setItems(result.docs.map(d=>({id:d.id,...d.data()} as Report)));
  }catch{setMessage('Não foi possível carregar as denúncias.');}finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[user]);
 async function update(report:Report,status:'reviewed'|'resolved'){
  if(!user)return;
  try{
   const {db}=getFirebaseClient();await updateDoc(doc(db,'reports',report.id),{status,reviewedAt:serverTimestamp(),reviewedBy:user.uid,resolution:status==='resolved'?'Revisada pela administração.':''});
   setMessage('Status da denúncia atualizado.');await load();
  }catch{setMessage('Não foi possível atualizar a denúncia.');}
 }
 if(loading)return <main className="page-wrap"><div className="notice-card">Carregando denúncias…</div></main>;
 if(!allowed)return <main className="page-wrap"><div className="notice-card"><h1>Área administrativa restrita</h1><p>É necessária uma permissão administrativa ativa.</p></div></main>;
 return <main className="page-wrap"><div className="page-heading"><div><p className="eyebrow">MODERAÇÃO</p><h1>Denúncias</h1><p>Registros visíveis à equipe autorizada e à pessoa que os enviou.</p></div></div>{message&&<p className="success-message">{message}</p>}
  {items.length===0?<div className="empty-state"><h2>Fila vazia</h2><p>Não há denúncias abertas.</p></div>:<div className="admin-list">{items.map(item=><article className="admin-row" key={item.id}><div><strong>{item.targetType} · {item.targetId}</strong><small>{item.reason} · denunciante {item.reporterUid}<br/>{item.description}</small></div><div className="row-actions"><button onClick={()=>void update(item,'reviewed')}>Marcar revisada</button><button onClick={()=>void update(item,'resolved')}>Resolver</button></div></article>)}</div>}
 </main>;
}
export function AdminReports(){return <ProtectedArea><ReportQueueContent/></ProtectedArea>}

