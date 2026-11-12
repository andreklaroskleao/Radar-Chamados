'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, writeBatch, where } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useRadarSession } from '@/lib/firebase/session';
import { ProtectedArea } from '@/components/protected-area';

type Plan={id:string;name:string;scope:'individual'|'company';enabled:boolean;isDefault:boolean;sortOrder:number};
type Feature={id:string;planId:string;featureKey:string;enabled:boolean;limit:number|null;unit:string};
const defaults:Omit<Plan,'id'>[]=[
 {name:'Básico individual',scope:'individual',enabled:true,isDefault:true,sortOrder:0},
 {name:'Básico empresa',scope:'company',enabled:true,isDefault:true,sortOrder:0},
 {name:'Profissional Pro',scope:'individual',enabled:true,isDefault:false,sortOrder:1},
 {name:'Empresarial',scope:'company',enabled:true,isDefault:false,sortOrder:1},
 {name:'Personalizado / Enterprise',scope:'company',enabled:true,isDefault:false,sortOrder:2}
];
function CatalogContent(){
 const {user}=useRadarSession();const [allowed,setAllowed]=useState(false);const [loading,setLoading]=useState(true);
 const [plans,setPlans]=useState<Plan[]>([]);const [selected,setSelected]=useState('');
 const [name,setName]=useState('');const [planId,setPlanId]=useState('');const [scope,setScope]=useState<'individual'|'company'>('individual');
 const [featureKey,setFeatureKey]=useState('');const [featureEnabled,setFeatureEnabled]=useState(true);const [featureLimit,setFeatureLimit]=useState('');const [unit,setUnit]=useState('');
 const [features,setFeatures]=useState<Feature[]>([]);const [message,setMessage]=useState('');
 async function load(){
  if(!user)return;setLoading(true);
  try{
   const {db}=getFirebaseClient();const admin=await getDoc(doc(db,'adminPermissions',user.uid));
   const ok=admin.exists()&&admin.data().enabled===true;setAllowed(ok);
   if(!ok){setLoading(false);return;}
   const results=await getDocs(query(collection(db,'plans'),limit(100)));
   const values=results.docs.map(d=>({id:d.id,...d.data()} as Plan));setPlans(values);
   if(!selected&&values[0])setSelected(values[0].id);
  }catch{setMessage('Não foi possível abrir o catálogo de planos.');}finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[user]);
 useEffect(()=>{
  if(!selected||!allowed)return;
  const {db}=getFirebaseClient();
  getDocs(query(collection(db,'planFeatures'),where('planId','==',selected),limit(100)))
   .then(r=>setFeatures(r.docs.map(d=>({id:d.id,...d.data()} as Feature))))
   .catch(()=>setFeatures([]));
 },[selected,allowed]);
 async function seed(){
  if(!user)return;
  try{
   const {db}=getFirebaseClient();const batch=writeBatch(db);
   defaults.forEach((plan,index)=>{
    const id=['basic_individual','basic_company','professional_pro_individual','business_company','enterprise_custom_company'][index];
    batch.set(doc(db,'plans',id),{...plan,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:user.uid},{merge:true});
   });
   await batch.commit();setMessage('Catálogo inicial salvo. Edite nomes, estados e funcionalidades conforme a política comercial.');await load();
  }catch{setMessage('Não foi possível criar os planos iniciais.');}
 }
 async function savePlan(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!user||!planId.trim()||!name.trim())return;
  try{
   const {db}=getFirebaseClient();const id=planId.trim().toLowerCase().replace(/[^a-z0-9_-]/g,'_');
   if(id==='basic_'+scope&&!isDefault)throw new Error('O plano Básico não pode perder o estado padrão');
   if(isDefault){
    if(id!=='basic_'+scope)throw new Error('O ID do plano Básico é estável por escopo');
    const batch=writeBatch(db);
    plans.filter(p=>p.scope===scope&&p.id!==id&&p.isDefault).forEach(p=>batch.update(doc(db,'plans',p.id),{isDefault:false,updatedAt:serverTimestamp(),updatedBy:user.uid}));
    batch.set(doc(db,'plans',id),{name:name.trim(),scope,enabled:true,isDefault:true,sortOrder:0,updatedAt:serverTimestamp(),updatedBy:user.uid},{merge:true});
    await batch.commit();
   }else await setDoc(doc(db,'plans',id),{name:name.trim(),scope,enabled:true,isDefault:false,sortOrder:plans.length,updatedAt:serverTimestamp(),updatedBy:user.uid},{merge:true});
   setMessage('Plano salvo.');setPlanId('');setName('');await load();
  }catch{setMessage('Não foi possível salvar o plano.');}
 }
 const [isDefault,setIsDefault]=useState(false);
 async function saveFeature(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!user||!selected||!featureKey.trim())return;
  try{
   const {db}=getFirebaseClient();const normalizedFeatureKey=featureKey.trim().replace(/[^a-zA-Z0-9_-]/g,'_');const id=selected+'_'+normalizedFeatureKey;
   const numeric=featureLimit.trim()===''?null:Number(featureLimit);
   if(numeric!==null&&(!Number.isFinite(numeric)||numeric<0))throw new Error('Limite inválido');
   await setDoc(doc(db,'planFeatures',id),{planId:selected,featureKey:normalizedFeatureKey,enabled:featureEnabled,limit:numeric,unit:unit.trim()||'',updatedAt:serverTimestamp(),updatedBy:user.uid},{merge:true});
   setMessage('Funcionalidade do plano salva.');setFeatureKey('');setFeatureLimit('');setUnit('');
   const result=await getDocs(query(collection(db,'planFeatures'),where('planId','==',selected),limit(100)));setFeatures(result.docs.map(d=>({id:d.id,...d.data()} as Feature)));
  }catch{setMessage('Não foi possível salvar a funcionalidade.')}
 }
 async function togglePlan(plan:Plan){
  if(plan.isDefault&&plan.enabled){setMessage('O plano Básico precisa permanecer ativo.');return;}
  try{await setDoc(doc(getFirebaseClient().db,'plans',plan.id),{enabled:!plan.enabled,updatedAt:serverTimestamp(),updatedBy:user?.uid},{merge:true});await load();}
  catch{setMessage('Não foi possível alterar o estado do plano.')}
 }
 if(loading)return <main className="page-wrap"><div className="notice-card">Carregando catálogo…</div></main>;
 if(!allowed)return <main className="page-wrap"><div className="notice-card"><h1>Área administrativa restrita</h1><p>É necessária uma permissão administrativa ativa.</p></div></main>;
 return <main className="page-wrap"><div className="page-heading"><div><p className="eyebrow">CONFIGURAÇÃO COMERCIAL</p><h1>Planos e funcionalidades</h1><p>Planos controlam permissões e limites. A plataforma não processa pagamentos.</p></div><Link className="button button-secondary" href="/admin">Voltar à administração</Link></div>
 {message&&<p className="success-message" role="status">{message}</p>}
 {plans.length===0&&<section className="panel-card"><h2>Começar catálogo</h2><p>Cria somente os planos iniciais editáveis, sem preço ou cobrança.</p><button className="button button-primary" onClick={()=>void seed()}>Criar catálogo inicial</button></section>}
 <section className="panel-card"><p className="eyebrow">PLANOS</p><h2>Novo plano ou edição</h2>
  <form className="form-stack" onSubmit={e=>void savePlan(e)}><label>ID estável<input required maxLength={80} placeholder="professional_pro_individual" value={planId} onChange={e=>setPlanId(e.target.value)}/></label><label>Nome apresentado<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><label>Escopo<select value={scope} onChange={e=>setScope(e.target.value as 'individual'|'company')}><option value="individual">Individual</option><option value="company">Empresa</option></select></label><label className="check-label"><input type="checkbox" checked={isDefault} onChange={e=>setIsDefault(e.target.checked)}/>Usar como padrão Básico deste escopo</label><button className="button button-primary">Salvar plano</button></form>
 </section>
 <section className="panel-card"><p className="eyebrow">CATÁLOGO ATUAL</p><h2>Planos cadastrados</h2>{plans.length===0?<p className="muted">Ainda não há planos.</p>:<div className="admin-list">{plans.map(plan=><article className="admin-row" key={plan.id}><div><strong>{plan.name}</strong><small>{plan.id} · {plan.scope} · {plan.isDefault?'Básico padrão':'adicional'} · {plan.enabled?'ativo':'desativado'}</small></div><div className="row-actions"><button onClick={()=>{setSelected(plan.id);setPlanId(plan.id);setName(plan.name);setScope(plan.scope);setIsDefault(plan.isDefault);}}>Editar</button><button onClick={()=>void togglePlan(plan)}>{plan.enabled?'Desativar':'Ativar'}</button></div></article>)}</div>}</section>
  <section className="panel-card"><p className="eyebrow">FUNCIONALIDADES E LIMITES</p><h2>Configurar um plano</h2><label>Plano<select value={selected} onChange={e=>setSelected(e.target.value)}>{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  {selected&&<form className="form-stack feature-form" onSubmit={e=>void saveFeature(e)}><label>Chave da funcionalidade<input required value={featureKey} onChange={e=>setFeatureKey(e.target.value)} placeholder="serviceCities, specialties, advancedIndicators"/></label><label>Unidade do limite<input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="cidades, membros, consultas"/></label><label>Limite<input type="number" min={0} value={featureLimit} onChange={e=>setFeatureLimit(e.target.value)} placeholder="Em branco = sem limite"/></label><label className="check-label"><input type="checkbox" checked={featureEnabled} onChange={e=>setFeatureEnabled(e.target.checked)}/>Habilitada neste plano</label><small className="muted">As regras aplicam `serviceCities` e `specialties` a perfis profissionais e empresas. Outras chaves aguardam integração com o módulo correspondente.</small><button className="button button-primary">Salvar funcionalidade</button></form>}
  <div className="admin-list">{features.map(f=><article className="admin-row" key={f.id}><div><strong>{f.featureKey}</strong><small>{f.enabled?'habilitada':'desabilitada'} · {f.limit===null?'sem limite':f.limit+' '+f.unit}</small></div></article>)}</div>
 </section>
 </main>;
}
export function PlanCatalog(){return <ProtectedArea><CatalogContent/></ProtectedArea>}

