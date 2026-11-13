'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, Timestamp, where, writeBatch } from 'firebase/firestore';
import { useRadarSession } from '@/lib/firebase/session';
import { getFirebaseClient } from '@/lib/firebase/client';
import { ProtectedArea } from '@/components/protected-area';

type Entry={id:string;name?:string;displayName?:string;visibility?:string;moderationStatus?:string;status?:string;accountStatus?:string;category?:string;title?:string;companyId?:string;ownerUid?:string};
type Subscription={id:string;scope:'individual'|'company';accountId:string;planId:string;status:'active'|'suspended'|'expired';grantType:'manual'|'trial'|'courtesy';startsAt?:Timestamp|null;expiresAt?:Timestamp|null;reason?:string;version:number};
type HistoryItem={id:string;eventType?:string;previousPlanId?:string|null;newPlanId?:string;reason?:string;occurredAt?:Timestamp;startsAt?:Timestamp|null;expiresAt?:Timestamp|null;actorUid?:string};
function saoPauloMidnight(date:string){
 const [year,month,day]=date.split('-').map(Number);let utc=Date.UTC(year,month-1,day);
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){
  const parts=Object.fromEntries(formatter.formatToParts(new Date(utc)).map(part=>[part.type,Number(part.value)]));
  const represented=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second);
  utc+=Date.UTC(year,month-1,day)-represented;
 }
 return new Date(utc);
}
function addCalendarDays(date:string,days:number){
 const [year,month,day]=date.split('-').map(Number);const next=new Date(Date.UTC(year,month-1,day+days));
 return [next.getUTCFullYear(),String(next.getUTCMonth()+1).padStart(2,'0'),String(next.getUTCDate()).padStart(2,'0')].join('-');
}
function expiryForLastDay(date:string){return Timestamp.fromDate(saoPauloMidnight(addCalendarDays(date,1)));}
function subscriptionState(value:Subscription|null){
 if(!value)return 'Básico · sem concessão temporária';
 if(value.status==='suspended')return 'Acesso suspenso';
 if(value.startsAt&&value.startsAt.toMillis()>Date.now())return 'Agendado';
 if(value.expiresAt&&value.expiresAt.toMillis()<=Date.now())return 'Vencido · Básico efetivo';
 if(value.expiresAt&&value.expiresAt.toMillis()-Date.now()<=30*86400000)return 'Ativo · vence em até 30 dias';
 return 'Ativo';
}
function AdminContent(){
 const {user}=useRadarSession();const [admin,setAdmin]=useState(false);const [loading,setLoading]=useState(true);
 const [accessCheck,setAccessCheck]=useState<{status:'checking'|'allowed'|'denied'|'error';projectId:string;uid:string;documentExists?:boolean;enabled?:boolean;code?:string}>({status:'checking',projectId:'',uid:''});
 const [profiles,setProfiles]=useState<Entry[]>([]);const [companies,setCompanies]=useState<Entry[]>([]);const [calls,setCalls]=useState<Entry[]>([]);const [planDefaults,setPlanDefaults]=useState<Record<string,boolean>>({});
 const [target,setTarget]=useState('');const [scope,setScope]=useState<'individual'|'company'>('individual');
 const [accountSearch,setAccountSearch]=useState('');
 const [planId,setPlanId]=useState('professional_pro_individual');const [days,setDays]=useState('30');const [reason,setReason]=useState('');
 const [grantType,setGrantType]=useState<'manual'|'trial'|'courtesy'>('manual');const [startDate,setStartDate]=useState('');const [lastDay,setLastDay]=useState('');const [customExpiry,setCustomExpiry]=useState(false);
 const [subscription,setSubscription]=useState<Subscription|null>(null);const [history,setHistory]=useState<HistoryItem[]>([]);
 const [message,setMessage]=useState('');
 const load=useCallback(async()=>{
  if(!user){setLoading(false);return;}setLoading(true);setMessage('');
  try{
   const {db,app}=getFirebaseClient();
   const adminDoc=await getDoc(doc(db,'adminPermissions',user.uid));
   const enabled=adminDoc.exists()&&adminDoc.data().enabled===true;
   setAdmin(enabled);
   setAccessCheck({status:enabled?'allowed':'denied',projectId:app.options.projectId||'desconhecido',uid:user.uid,documentExists:adminDoc.exists(),enabled:adminDoc.exists()?adminDoc.data().enabled===true:false});
   if(!enabled)return;
   const [p,c,op,planDocs]=await Promise.all([
    getDocs(query(collection(db,'professionalProfiles'),limit(100))),
    getDocs(query(collection(db,'companyProfiles'),limit(100))),
    getDocs(query(collection(db,'serviceCalls'),where('moderationStatus','==','pending'),limit(100))),
    getDocs(query(collection(db,'plans'),limit(100)))
   ]);
   setProfiles(p.docs.map(d=>({id:d.id,...d.data()} as Entry)));setCompanies(c.docs.map(d=>({id:d.id,...d.data()} as Entry)));setCalls(op.docs.map(d=>({id:d.id,...d.data()} as Entry)));setPlanDefaults(Object.fromEntries(planDocs.docs.map(d=>[d.id,d.data().isDefault===true])));
  }catch(error){
   const code=typeof error==='object'&&error&&'code'in error?String(error.code):'erro-desconhecido';
   let projectId='desconhecido';try{projectId=getFirebaseClient().app.options.projectId||projectId;}catch{}
   setAdmin(false);setAccessCheck({status:'error',projectId,uid:user.uid,code});
   setMessage(`Não foi possível consultar sua permissão administrativa no Firestore (${code}). O documento não foi tratado como ausente: confira se esta versão está conectada ao projeto esperado e se a leitura de adminPermissions/{UID} está permitida.`);
  }
  finally{setLoading(false);}
 },[user]);
 useEffect(()=>{
  const timer=window.setTimeout(()=>{void load();},0);
  return()=>window.clearTimeout(timer);
 },[load]);
 async function moderate(collectionName:'professionalProfiles'|'companyProfiles'|'serviceCalls',id:string,status:'approved'|'rejected'|'pending'){
  if(!user)return;
  try{
   const {db}=getFirebaseClient();const batch=writeBatch(db);
   batch.update(doc(db,collectionName,id),{moderationStatus:status});
   batch.set(doc(collection(db,'adminAuditLogs')),{actorUid:user.uid,targetId:id,action:'moderation_'+status,targetCollection:collectionName,createdAt:serverTimestamp()});
   await batch.commit();setMessage('Moderação atualizada.');await load();
  }catch{setMessage('Não foi possível atualizar a moderação.');}
 }
 async function setProfessionalAccountStatus(uid:string,status:'active'|'suspended'|'blocked'){
  if(!user)return;
  try{
   const {db}=getFirebaseClient();const batch=writeBatch(db);
   batch.update(doc(db,'users',uid),{accountStatus:status,updatedAt:serverTimestamp()});
   batch.update(doc(db,'professionalProfiles',uid),{accountStatus:status,accountStatusUpdatedAt:serverTimestamp()});
   batch.set(doc(db,'adminAuditLogs'),{actorUid:user.uid,targetId:uid,action:'account_'+status,createdAt:serverTimestamp()});
   batch.set(doc(db,'notifications',uid,'items','account_'+status+'_'+Date.now()),{title:'Atualização da conta',body:status==='active'?'Sua conta está ativa novamente.':'O status da sua conta foi alterado. Entre em contato com a administração para obter detalhes.',createdAt:serverTimestamp(),readAt:null});
   await batch.commit();setMessage('Status da conta atualizado.');await load();
  }catch{setMessage('Não foi possível alterar o status da conta.');}
 }
 async function setCompanyStatus(companyId:string,status:'active'|'suspended'|'blocked'){
  if(!user)return;
  try{
   const {db}=getFirebaseClient();const callsResult=await getDocs(query(collection(db,'serviceCalls'),where('companyId','==',companyId)));
   const [company,privateDoc]=await Promise.all([getDoc(doc(db,'companyProfiles',companyId)),getDoc(doc(db,'companyPrivate',companyId))]);const ownerUid=privateDoc.exists()?String(privateDoc.data().ownerUid||''):'';
   if(!company.exists())throw new Error('Empresa inexistente');
   if(callsResult.size>497)throw new Error('A empresa excede o tamanho de uma operação atômica');
   const batch=writeBatch(db);
   batch.update(doc(db,'companyProfiles',companyId),{status,updatedAt:serverTimestamp()});
   callsResult.docs.forEach(item=>batch.update(item.ref,{companyStatus:status,updatedAt:serverTimestamp()}));
   if(ownerUid)batch.set(doc(db,'notifications',ownerUid,'items','company_'+status+'_'+Date.now()),{title:'Atualização da empresa',body:'O status do ambiente empresarial foi alterado. Consulte a administração para obter detalhes.',createdAt:serverTimestamp(),readAt:null});
   batch.set(doc(collection(db,'adminAuditLogs')),{actorUid:user.uid,targetId:companyId,action:'company_'+status,createdAt:serverTimestamp()});
   await batch.commit();
   setMessage('Status da empresa e dos chamados atualizado.');await load();
  }catch{setMessage('Não foi possível alterar o status da empresa.');}
 }
 async function grantPlan(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!user||!target.trim()||!startDate)return;setMessage('');
  try{
   const {db}=getFirebaseClient();const id=scope+'_'+target.trim();const ref=doc(db,'accountSubscriptions',id);const old=await getDoc(ref);
   const account=await getDoc(doc(db,scope==='individual'?'users':'companyProfiles',target.trim()));if(!account.exists())throw new Error('Conta inexistente');
   const selectedPlanId=planId.trim();const plan=await getDoc(doc(db,'plans',selectedPlanId));
   if(!plan.exists()||plan.data().enabled!==true||plan.data().scope!==scope)throw new Error('Plano indisponível ou escopo divergente');
   const isBasic=plan.data().isDefault===true;
   const startsAt=Timestamp.fromDate(saoPauloMidnight(startDate));
   const startMillis=startsAt.toMillis();
   let expiresAt:Timestamp|null=null;
   if(!isBasic){
    if(customExpiry){if(!lastDay)throw new Error('Informe o último dia');expiresAt=expiryForLastDay(lastDay);}
    else {const duration=Number(days);if(!Number.isInteger(duration)||![30,90,180,365].includes(duration))throw new Error('Duração inválida');expiresAt=Timestamp.fromDate(saoPauloMidnight(addCalendarDays(startDate,duration)));}
    if(expiresAt.toMillis()<=startMillis)throw new Error('Vencimento deve ser posterior ao início');
   }
   const version=(Number(old.data()?.version)||0)+1;const batch=writeBatch(db);
   const data={scope,accountId:target.trim(),planId:selectedPlanId,status:'active',grantType,startsAt,expiresAt,version,reason:reason.trim(),updatedAt:serverTimestamp(),updatedBy:user.uid};
   batch.set(ref,{...data,createdAt:old.exists()?old.data()?.createdAt:serverTimestamp(),createdBy:old.data()?.createdBy||user.uid});
   const oldPlanId=old.data()?.planId||null;
   const eventType=!old.exists()?'assigned':oldPlanId===selectedPlanId?'renewed':'changed';
   batch.set(doc(collection(db,'planChangeHistory')),{subscriptionId:id,scope,accountId:target.trim(),eventType,previousPlanId:oldPlanId,newPlanId:selectedPlanId,previousStatus:old.data()?.status||null,previousExpiresAt:old.data()?.expiresAt||null,startsAt,expiresAt,reason:reason.trim(),grantType,subscriptionVersion:version,occurredAt:serverTimestamp(),actorUid:user.uid});
   batch.set(doc(collection(db,'adminAuditLogs')),{actorUid:user.uid,targetId:id,action:'plan_'+(old.exists()?'changed':'granted'),reason:reason.trim(),createdAt:serverTimestamp()});
   await batch.commit();setMessage('Plano registrado manualmente. Nenhum pagamento foi processado.');await lookupSubscription();setReason('');
  }catch{setMessage('Não foi possível registrar o plano. Revise o ID da conta, o motivo e as regras.');}
 }
 async function lookupSubscription(){
  if(!user||!target.trim())return;
  try{
   const {db}=getFirebaseClient();const id=scope+'_'+target.trim();const [current,events]=await Promise.all([
    getDoc(doc(db,'accountSubscriptions',id)),getDocs(query(collection(db,'planChangeHistory'),where('subscriptionId','==',id),limit(100)))
   ]);
   setSubscription(current.exists()?({id,...current.data()} as Subscription):null);
   setHistory(events.docs.map(d=>({id:d.id,...d.data()} as HistoryItem)).sort((a,b)=>(b.occurredAt?.toMillis()||0)-(a.occurredAt?.toMillis()||0)));
   setMessage(current.exists()?'Concessão atual e histórico carregados.':'Sem concessão temporária; o acesso efetivo usa o plano Básico.');
  }catch{setMessage('Não foi possível consultar a concessão. Confira o escopo e o ID da conta.');}
 }
 async function changeSubscriptionStatus(status:'active'|'suspended'){
  if(!user||!subscription)return;
  if(status==='active'&&subscription.expiresAt&&subscription.expiresAt.toMillis()<=Date.now()){
   setMessage('Este plano venceu. Registre uma renovação para definir um novo vencimento.');return;
  }
  try{
   const {db}=getFirebaseClient();const batch=writeBatch(db);const nextVersion=(subscription.version||0)+1;
   batch.update(doc(db,'accountSubscriptions',subscription.id),{status,version:nextVersion,updatedAt:serverTimestamp(),updatedBy:user.uid});
   batch.set(doc(collection(db,'planChangeHistory')),{subscriptionId:subscription.id,scope:subscription.scope,accountId:subscription.accountId,eventType:status==='suspended'?'suspended':'reactivated',previousPlanId:subscription.planId,newPlanId:subscription.planId,previousStatus:subscription.status,startsAt:subscription.startsAt||null,expiresAt:subscription.expiresAt||null,reason:reason.trim()||'Alteração administrativa de acesso',grantType:subscription.grantType,subscriptionVersion:nextVersion,occurredAt:serverTimestamp(),actorUid:user.uid});
   batch.set(doc(collection(db,'adminAuditLogs')),{actorUid:user.uid,targetId:subscription.id,action:'plan_'+status,reason:reason.trim(),createdAt:serverTimestamp()});
   await batch.commit();setMessage(status==='suspended'?'Acesso do plano suspenso.':'Acesso do plano reativado.');await lookupSubscription();
  }catch{setMessage('Não foi possível atualizar o acesso do plano.');}
 }
 if(loading)return <main className="page-wrap"><div className="notice-card">Carregando administração…</div></main>;
 if(!admin)return <main className="page-wrap"><div className="notice-card"><h1>{accessCheck.status==='error'?'Não foi possível verificar o acesso':'Área administrativa restrita'}</h1>
  {accessCheck.status==='error'?<><p>{message}</p><p>UID autenticado: <code>{accessCheck.uid||user?.uid}</code><br/>Projeto Firebase conectado: <code>{accessCheck.projectId}</code></p><button className="button button-secondary" onClick={()=>void load()}>Verificar novamente</button></>:<><p>O Firestore respondeu que a permissão desta conta não está ativa.</p><p>UID autenticado: <code>{accessCheck.uid||user?.uid}</code><br/>Projeto Firebase conectado: <code>{accessCheck.projectId}</code><br/>Documento encontrado: <code>{String(accessCheck.documentExists===true)}</code><br/>Campo enabled: <code>{String(accessCheck.enabled===true)}</code></p><p>O acesso exige <code>adminPermissions/{user?.uid}</code> com <code>enabled: true</code>. O app não concede essa permissão.</p><button className="button button-secondary" onClick={()=>void load()}>Verificar novamente</button></>}
 </div></main>;
 const accountOptions=(scope==='individual'?profiles:companies).filter(item=>((item.displayName||item.name||'')+' '+item.id).toLocaleLowerCase('pt-BR').includes(accountSearch.toLocaleLowerCase('pt-BR')));
 return <main className="page-wrap"><div className="page-heading"><div><p className="eyebrow">GESTÃO DA PLATAFORMA</p><h1>Administração</h1><p>Modere cadastros, gerencie contas e conceda planos manualmente.</p></div><div className="form-actions"><a className="button button-secondary" href="/admin/planos">Configurar planos</a><a className="button button-secondary" href="/admin/distribuicao">Abrir fila de distribuição</a><a className="button button-secondary" href="/admin/denuncias">Abrir denúncias</a></div></div>
  {message&&<p className="form-message" role="status">{message}</p>}
  <section className="panel-card form-stack"><p className="eyebrow">PLANOS E PERMISSÕES</p><h2>Consultar ou alterar plano</h2><p>Use o UID de uma pessoa ou o ID de uma empresa. A concessão muda permissões, não processa cobrança.</p>
   <div className="invite-row"><label>Escopo da conta<select value={scope} onChange={e=>{setScope(e.target.value as 'individual'|'company');setSubscription(null);setHistory([]);setAccountSearch('');}}><option value="individual">Conta individual</option><option value="company">Empresa</option></select></label>
   <label>Pesquisar contas carregadas<input value={accountSearch} onChange={e=>setAccountSearch(e.target.value)} placeholder="Nome ou UID / ID"/></label>
   <label>Selecionar conta<select value={target} onChange={e=>{setTarget(e.target.value);setSubscription(null);setHistory([]);}}><option value="">Selecione ou informe o ID</option>{accountOptions.map(item=><option key={item.id} value={item.id}>{item.displayName||item.name||'Sem nome'} · {item.id}</option>)}</select></label>
   <label>UID ou ID (entrada direta)<input value={target} onChange={e=>{setTarget(e.target.value.trim());setSubscription(null);setHistory([]);}}/></label><button type="button" className="button button-secondary" onClick={()=>void lookupSubscription()}>Consultar conta</button></div>
   <small className="muted">A busca inclui até 100 perfis/empresas carregados no painel. Para contas fora da lista, informe o UID ou ID diretamente.</small>
   <div className="notice-card"><strong>{subscription?.planId||'basic_'+scope}</strong><p>{subscriptionState(subscription)}{subscription?.expiresAt?` · vence ${subscription.expiresAt.toDate().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}`:''}</p>
   {subscription&&<div className="form-actions">{subscription.status==='suspended'?<button type="button" className="button button-secondary" onClick={()=>void changeSubscriptionStatus('active')}>Reativar acesso</button>:<button type="button" className="button button-secondary" onClick={()=>void changeSubscriptionStatus('suspended')}>Suspender acesso</button>}</div>}
   </div>
   <h3>Conceder, renovar ou alterar</h3>
   <form className="form-stack" onSubmit={e=>void grantPlan(e)}>
    <label>ID do plano cadastrado<input required list="plan-identifiers" value={planId} onChange={e=>setPlanId(e.target.value)}/><datalist id="plan-identifiers"><option value="basic_individual"/><option value="basic_company"/><option value="professional_pro_individual"/><option value="business_company"/><option value="enterprise_custom_company"/></datalist></label>
    <label>Tipo da concessão<select value={grantType} onChange={e=>setGrantType(e.target.value as 'manual'|'trial'|'courtesy')}><option value="manual">Manual</option><option value="trial">Experimental</option><option value="courtesy">Cortesia</option></select></label>
    <label>Data inicial (fuso de Brasília)<input type="date" required value={startDate} onChange={e=>setStartDate(e.target.value)}/><small>O plano começa à meia-noite local nessa data.</small></label>
    {!planDefaults[planId.trim()]&&<><label className="check-label"><input type="checkbox" checked={customExpiry} onChange={e=>setCustomExpiry(e.target.checked)}/>Definir data de vencimento personalizada</label>{customExpiry?<label>Último dia de acesso<input type="date" required value={lastDay} onChange={e=>setLastDay(e.target.value)}/><small>O dia escolhido é inclusivo no fuso America/Sao_Paulo.</small></label>:<label>Duração<select value={days} onChange={e=>setDays(e.target.value)}><option value="30">30 dias</option><option value="90">90 dias</option><option value="180">180 dias</option><option value="365">365 dias</option></select></label>}</>}
    <label>Motivo administrativo<input required maxLength={300} value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="button button-primary">Salvar concessão</button>
   </form>
   {history.length>0&&<div><h3>Histórico de alterações</h3><div className="admin-list">{history.map(event=><article className="admin-row" key={event.id}><div><strong>{event.eventType||'Alteração'} · {event.newPlanId||'—'}</strong><small>{event.occurredAt?.toDate().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})||'Registrando…'} · responsável {event.actorUid||'—'}<br/>Anterior: {event.previousPlanId||'Básico'} · motivo: {event.reason||'—'}</small></div></article>)}</div></div>}
  </section>
  <Moderation title="Perfis profissionais" items={profiles} label={x=>x.displayName||'Sem nome'} onApprove={id=>void moderate('professionalProfiles',id,'approved')} onReject={id=>void moderate('professionalProfiles',id,'rejected')} statusLabel={x=>x.accountStatus||'active'} onSuspend={id=>void setProfessionalAccountStatus(id,'suspended')} onBlock={id=>void setProfessionalAccountStatus(id,'blocked')} onActivate={id=>void setProfessionalAccountStatus(id,'active')}/>
  <Moderation title="Empresas" items={companies} label={x=>x.name||'Sem nome'} onApprove={id=>void moderate('companyProfiles',id,'approved')} onReject={id=>void moderate('companyProfiles',id,'rejected')} statusLabel={x=>x.status||'active'} onSuspend={id=>void setCompanyStatus(id,'suspended')} onBlock={id=>void setCompanyStatus(id,'blocked')} onActivate={id=>void setCompanyStatus(id,'active')}/>
  <Moderation title="Oportunidades" items={calls} label={x=>x.title||'Sem título'} onApprove={id=>void moderate('serviceCalls',id,'approved')} onReject={id=>void moderate('serviceCalls',id,'rejected')}/>
 </main>;
}
function Moderation({title,items,label,onApprove,onReject,statusLabel,onSuspend,onBlock,onActivate}:{title:string;items:Entry[];label:(entry:Entry)=>string;onApprove:(id:string)=>void;onReject:(id:string)=>void;statusLabel?:(entry:Entry)=>string;onSuspend?:(id:string)=>void;onBlock?:(id:string)=>void;onActivate?:(id:string)=>void}){
 return <section className="panel-card"><p className="eyebrow">ADMINISTRAÇÃO</p><h2>{title}</h2>{items.length===0?<p className="muted">Nenhum item disponível.</p>:<div className="admin-list">{items.map(item=><article className="admin-row" key={item.id}><div><strong>{label(item)}</strong><small>{item.id} · revisão: {item.moderationStatus||'pendente'}{statusLabel?' · status: '+statusLabel(item):''}</small></div><div className="row-actions"><button onClick={()=>onApprove(item.id)}>Aprovar</button><button onClick={()=>onReject(item.id)}>Rejeitar</button>{onSuspend&&statusLabel?.(item)==='active'&&<button onClick={()=>onSuspend(item.id)}>Suspender</button>}{onBlock&&statusLabel?.(item)!=='blocked'&&<button onClick={()=>onBlock(item.id)}>Bloquear</button>}{onActivate&&statusLabel?.(item)!=='active'&&<button onClick={()=>onActivate(item.id)}>Reativar</button>}</div></article>)}</div>}</section>;
}
export function AdminConsole(){return <ProtectedArea><AdminContent/></ProtectedArea>}








