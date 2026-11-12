'use client';
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useRadarSession } from '@/lib/firebase/session';
import { ProtectedArea } from '@/components/protected-area';

type Call={id:string;title:string;companyId:string;stateCode:string;cityCode:string;providerType:string;specialties?:string[];requiredCertifications?:string[];experienceYears?:number;compensationDescription?:string;deadline?:{toDate:()=>Date}};
type Candidate={id:string;type:'professional'|'company';name:string;category?:string;cityCode?:string;stateCode?:string;serviceCityCodes?:string[];acceptsTravel?:boolean;available?:boolean;specialties?:string[];courses?:string[];qualifications?:string[];certifications?:string[];experienceYears?:number;phone?:string};
type Match={candidate:Candidate;priority:number;reasons:string[];whatsAppUrl?:string};
const criterionVersion='1.0';
function DistributionContent(){
 const {user}=useRadarSession();const [calls,setCalls]=useState<Call[]>([]);const [selected,setSelected]=useState('');
 const [professionals,setProfessionals]=useState<Candidate[]>([]);const [companies,setCompanies]=useState<Candidate[]>([]);
 const [matches,setMatches]=useState<Match[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [message,setMessage]=useState('');
 useEffect(()=>{
  const {db}=getFirebaseClient();
  Promise.all([
   getDocs(query(collection(db,'serviceCalls'),where('status','in',['published','acceptingApplications']),where('companyStatus','==','active'),where('moderationStatus','==','approved'),limit(100))),
   getDocs(query(collection(db,'professionalProfiles'),where('visibility','==','public'),where('accountStatus','==','active'),where('moderationStatus','==','approved'),where('available','==',true),limit(200))),
   getDocs(query(collection(db,'companyProfiles'),where('visibility','==','public'),where('status','==','active'),where('moderationStatus','==','approved'),limit(100)))
  ]).then(([callDocs,proDocs,coDocs])=>{
   const now=Date.now();const callList=callDocs.docs.map(d=>({id:d.id,...d.data()} as Call)).filter(c=>!c.deadline||c.deadline.toDate().getTime()>now);
   setCalls(callList);setSelected(callList[0]?.id||'');
   setProfessionals(proDocs.docs.map(d=>{const data=d.data();return {id:d.id,type:'professional',name:String(data.displayName||''),...data} as Candidate}));
   setCompanies(coDocs.docs.map(d=>{const data=d.data();return {id:d.id,type:'company',name:String(data.name||''),...data} as Candidate}));
  }).catch(()=>setError('Não foi possível abrir a fila. Verifique a permissão administrativa e os índices solicitados pelo Firestore.'))
   .finally(()=>setLoading(false));
 },[]);
 const activeCall=calls.find(c=>c.id===selected);
 const computed=useMemo(()=>{
  if(!activeCall)return [];
  const pool:Candidate[]=[
   ...(activeCall.providerType==='company'?[]:professionals),
   ...(activeCall.providerType==='professional'?[]:companies)
  ];
  return pool.flatMap(candidate=>{
   const reasons:string[]=[];let priority=99;
   if(candidate.available===false)return [];
   if(candidate.cityCode===activeCall.cityCode){reasons.push('Município principal declarado coincide');priority=1;}
   if(candidate.serviceCityCodes?.includes(activeCall.cityCode)){reasons.push('Município listado na área atendida');priority=Math.min(priority,2);}
   if(candidate.acceptsTravel){reasons.push('Aceita deslocamento');priority=Math.min(priority,3);}
   if(!reasons.length)return [];
   const required=(activeCall.specialties||[]).map(x=>x.trim());
   const owned=(candidate.specialties||[candidate.category||'']).map(x=>x.trim());
   if(required.length&&!required.some(x=>owned.includes(x)))return [];
   if(candidate.type==='professional'&&(candidate.experienceYears||0)<(activeCall.experienceYears||0))return [];
   const requiredCredentials=(activeCall.requiredCertifications||[]).map(x=>x.trim());
   if(requiredCredentials.some(x=>!(candidate.certifications||[]).map(value=>value.trim()).includes(x)))return [];
   if(required.length)reasons.push('Especialidade compatível');
   if(requiredCredentials.length)reasons.push('Cursos/certificações exigidos informados');
   if(candidate.type==='professional'&&(candidate.experienceYears||0)>=(activeCall.experienceYears||0))reasons.push('Experiência mínima atendida');
   return [{candidate,priority,reasons}];
  }).sort((a,b)=>a.priority-b.priority);
 },[activeCall,professionals,companies]);
 useEffect(()=>{setMatches(computed);},[computed]);
 async function saveQueue(){
  if(!activeCall||!user)return;setError('');setMessage('');
  try{
   const {db}=getFirebaseClient();
   for(let start=0;start<matches.length;start+=450){
    const batch=writeBatch(db);
    for(const item of matches.slice(start,start+450)){
     const id=activeCall.id+'_'+item.candidate.type+'_'+item.candidate.id;
     batch.set(doc(db,'distributionQueue',id),{
      serviceCallId:activeCall.id,companyId:activeCall.companyId,candidateType:item.candidate.type,candidateId:item.candidate.id,
      priority:item.priority,matchReasons:item.reasons,criterionVersion,status:'queued',updatedAt:serverTimestamp(),updatedBy:user.uid
     },{merge:true});
    }
    await batch.commit();
   }
   setMessage(matches.length+' correspondências foram salvas com os motivos e a versão do critério.');
  }catch{setError('Não foi possível registrar a fila.')}
 }
 async function prepareWhatsApp(match:Match){
  if(!activeCall)return;setError('');
  try{
   const {db}=getFirebaseClient();const privatePath=match.candidate.type==='professional'?'professionalPrivate':'companyPrivate';
   const contact=await getDoc(doc(db,privatePath,match.candidate.id));
   const phone=contact.exists()?String(contact.data().phone||''):'';
   if(!contact.exists()||contact.data().whatsappAllowed!==true){setError('Este cadastro não autorizou contato pelo WhatsApp.');return;}
   let digits=phone.replace(/\D/g,'');
   if(digits.length===10||digits.length===11)digits='55'+digits;
   if(!/^55\d{10,11}$/.test(digits)){setError('Informe um telefone válido com DDD e código do Brasil para preparar o WhatsApp.');return;}
   const deadline=activeCall.deadline?.toDate().toLocaleDateString('pt-BR')||'a combinar';
   const text=encodeURIComponent('Olá, '+match.candidate.name+'! Identificamos uma oportunidade compatível com sua área de atuação.\n\nServiço: '+activeCall.title+'\nCidade: '+activeCall.stateCode+' · IBGE '+activeCall.cityCode+'\nPrazo: '+deadline+'\nRemuneração: '+(activeCall.compensationDescription||'A combinar')+'\n\nAcesse a plataforma para consultar os detalhes e candidatar-se: '+window.location.origin+'/oportunidades/'+activeCall.id);
   const url='https://wa.me/'+digits+'?text='+text;
   setMatches(current=>current.map(item=>item.candidate.id===match.candidate.id?{...item,whatsAppUrl:url}:item));
   await import('firebase/firestore').then(({addDoc,collection})=>addDoc(collection(db,'outreachEvents'),{serviceCallId:activeCall.id,companyId:activeCall.companyId,candidateType:match.candidate.type,candidateId:match.candidate.id,event:'prepared',criterionVersion,actorUid:user?.uid,createdAt:serverTimestamp()}));
  }catch{setError('Não foi possível preparar o contato assistido.')}
 }
 async function openWhatsApp(match:Match,url:string){
  if(!user||!activeCall)return;setError('');
  const tab=window.open('about:blank','_blank');
  if(!tab){setError('Permita a abertura de uma nova janela para continuar.');return;}
  tab.opener=null;
  try{
   const {db}=getFirebaseClient();const privatePath=match.candidate.type==='professional'?'professionalPrivate':'companyPrivate';
   const contact=await getDoc(doc(db,privatePath,match.candidate.id));
   if(!contact.exists()||contact.data().whatsappAllowed!==true){tab.close();setError('A autorização para WhatsApp foi removida; nenhum contato foi aberto.');return;}
   tab.location.href=url;
   const {addDoc}=await import('firebase/firestore');await addDoc(collection(db,'outreachEvents'),{serviceCallId:activeCall.id,companyId:activeCall.companyId,candidateType:match.candidate.type,candidateId:match.candidate.id,event:'contactInitiated',criterionVersion,actorUid:user.uid,createdAt:serverTimestamp()});
  }catch{tab.close();setError('Não foi possível iniciar ou registrar o contato assistido.')}
 }
 if(loading)return <main className="page-wrap"><div className="notice-card">Calculando a fila…</div></main>;
 return <main className="page-wrap"><div className="page-heading"><div><p className="eyebrow">DISTRIBUIÇÃO ADMINISTRATIVA</p><h1>Compatibilidade explicável</h1><p>Os resultados usam área declarada e consentimento para deslocamento, sem presumir disponibilidade por proximidade.</p></div></div>
  {error&&<p className="form-message">{error}</p>}{message&&<p className="success-message">{message}</p>}
  <section className="panel-card form-stack"><label>Oportunidade<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Selecione</option>{calls.map(c=><option key={c.id} value={c.id}>{c.title} · {c.stateCode} · {c.cityCode}</option>)}</select></label>
   {activeCall&&<p className="muted">Versão do critério: {criterionVersion}. Prioridade: município principal, cidade atendida declarada e deslocamento aceito. Especialidades exigidas são comparadas por nome.</p>}
   <div className="form-actions"><span className="status-chip">{matches.length} candidatos compatíveis</span><button className="button button-primary" disabled={!activeCall||matches.length===0} onClick={()=>void saveQueue()}>Salvar fila de distribuição</button></div>
  </section>
  {matches.length===0?<div className="empty-state"><h2>Nenhuma compatibilidade encontrada</h2><p>Confira se os perfis informaram a cidade atendida e as especialidades necessárias.</p></div>:<div className="admin-list distribution-list">{matches.map((match,index)=><article className="admin-row distribution-row" key={match.candidate.type+match.candidate.id}><div><span className="priority-pill">Prioridade {index+1}</span><strong>{match.candidate.name}</strong><small>{match.candidate.type==='professional'?'Profissional':'Empresa'} · {match.candidate.stateCode} · IBGE {match.candidate.cityCode}<br/>{match.reasons.join(' · ')}</small></div><div className="row-actions">{!match.whatsAppUrl?<button onClick={()=>void prepareWhatsApp(match)}>Preparar WhatsApp</button>:<button className="row-action" onClick={()=>void openWhatsApp(match,match.whatsAppUrl!)}>Abrir WhatsApp</button>}</div></article>)}</div>}
  <p className="directory-note">O administrador escolhe e inicia cada contato. Abrir o link não comprova envio, entrega ou leitura.</p>
 </main>;
}
export function Distribution(){return <ProtectedArea><DistributionContent/></ProtectedArea>}


