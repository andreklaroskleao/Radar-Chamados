'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { useRadarSession } from '@/lib/firebase/session';
import { getFirebaseClient } from '@/lib/firebase/client';
import { MunicipalityPicker } from '@/components/municipality-picker';

type Company={name?:string;category?:string;description?:string;stateCode?:string;cityCode?:string;serviceCityCodes?:string[];acceptsTravel?:boolean;visibility?:string;moderationStatus?:string;status?:string};
type Member={uid:string;role:string;status:string};
type CompanyCall={id:string;title?:string;status:string;moderationStatus?:string;deadline?:{toDate:()=>Date}};
const callTransitions:Record<string,string[]>={
 draft:['draft','published','cancelled'],published:['published','acceptingApplications','underReview','negotiating','filled','completed','cancelled'],
 acceptingApplications:['acceptingApplications','underReview','negotiating','filled','completed','cancelled'],
 underReview:['underReview','negotiating','filled','completed','cancelled'],negotiating:['negotiating','filled','completed','cancelled'],
 filled:['filled','completed','cancelled'],completed:['completed'],cancelled:['cancelled','published'],expired:['expired']
};
const callStatusLabels:Record<string,string>={draft:'Rascunho',published:'Publicado',acceptingApplications:'Recebendo candidaturas',underReview:'Em análise',negotiating:'Em negociação',filled:'Preenchido',completed:'Concluído',cancelled:'Cancelado',expired:'Expirado'};
export function CompanyWorkspace({companyId}:{companyId:string}){
 const {user}=useRadarSession();const [company,setCompany]=useState<Company>({});const [phone,setPhone]=useState('');const [contactName,setContactName]=useState('');const [contactEmail,setContactEmail]=useState('');const [legalName,setLegalName]=useState('');const [cnpj,setCnpj]=useState('');const [address,setAddress]=useState('');const [whatsappAllowed,setWhatsappAllowed]=useState(false);const [role,setRole]=useState('');
 const [members,setMembers]=useState<Member[]>([]);const [companyCalls,setCompanyCalls]=useState<CompanyCall[]>([]);const [inviteUid,setInviteUid]=useState('');const [inviteRole,setInviteRole]=useState<'member'|'manager'>('member');
 const [serviceCities,setServiceCities]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function load(){
  if(!user)return;const {db}=getFirebaseClient();
  const [companyDoc,memberDoc,privateDoc,memberDocs]=await Promise.all([
   getDoc(doc(db,'companyProfiles',companyId)),getDoc(doc(db,'companyMembers',companyId+'_'+user.uid)),
   getDoc(doc(db,'companyPrivate',companyId)),getDocs(query(collection(db,'companyMembers'),where('companyId','==',companyId)))
  ]);
  if(!companyDoc.exists()){setMessage('Empresa não encontrada ou sem acesso.');return;}
  const values=companyDoc.data() as Company;setCompany(values);setServiceCities((values.serviceCityCodes||[]).join(','));
  const activeRole=memberDoc.exists()&&memberDoc.data().status==='active'?String(memberDoc.data().role):'';
  if(activeRole)setRole(activeRole);else setMessage('Sua conta não tem associação ativa com este ambiente.');
  if(privateDoc.exists()){const details=privateDoc.data();setPhone(String(details.phone||''));setContactName(String(details.contactName||''));setContactEmail(String(details.contactEmail||''));setLegalName(String(details.legalName||''));setCnpj(String(details.cnpj||''));setAddress(String(details.commercialAddress||''));setWhatsappAllowed(details.whatsappAllowed===true);}
  setMembers(memberDocs.docs.map(d=>d.data() as Member));
  if(activeRole==='owner'||activeRole==='manager'){
   const callDocs=await getDocs(query(collection(db,'serviceCalls'),where('companyId','==',companyId)));
   setCompanyCalls(callDocs.docs.map(d=>({id:d.id,...d.data()} as CompanyCall)));
  }else setCompanyCalls([]);
 }
 useEffect(()=>{void load().catch(()=>setMessage('Não foi possível carregar os dados da empresa.'));},[user,companyId]);
 function field<K extends keyof Company>(key:K,value:Company[K]){setCompany(c=>({...c,[key]:value}));}
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!user)return;setBusy(true);setMessage('');
  try{
   const {db}=getFirebaseClient();
   await Promise.all([
    setDoc(doc(db,'companyProfiles',companyId),{name:company.name?.trim()||'',category:company.category?.trim()||'',description:company.description?.trim()||'',
     stateCode:company.stateCode||'RS',cityCode:company.cityCode||'',
     serviceCityCodes:serviceCities.split(',').map(x=>x.trim()).filter(x=>/^\d{7}$/.test(x)).slice(0,50),
     acceptsTravel:Boolean(company.acceptsTravel),visibility:company.visibility==='public'?'public':'private',moderationStatus:'pending',updatedAt:serverTimestamp()},{merge:true}),
    setDoc(doc(db,'companyPrivate',companyId),{phone:phone.replace(/[^+\d]/g,'').slice(0,20),contactName:contactName.trim(),contactEmail:contactEmail.trim().toLowerCase(),legalName:legalName.trim(),cnpj:cnpj.replace(/\D/g,'').slice(0,14),commercialAddress:address.trim(),whatsappAllowed,updatedAt:serverTimestamp()},{merge:true})
   ]);
   setCompany(current=>({...current,moderationStatus:'pending'}));
   setMessage('Dados salvos. A empresa só aparece publicamente após aprovação.');
  }catch{setMessage('Não foi possível salvar. Verifique sua permissão e as regras do Firestore.');}
  finally{setBusy(false);}
 }
 async function invite(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!user||!inviteUid.trim())return;setBusy(true);setMessage('');
  try{const {db}=getFirebaseClient();await setDoc(doc(db,'companyMembers',companyId+'_'+inviteUid.trim()),{companyId,uid:inviteUid.trim(),role:inviteRole,status:'active',createdAt:serverTimestamp()});
   setInviteUid('');setMessage('A associação foi criada. O membro verá a empresa no próximo acesso.');await load();}
  catch{setMessage('Não foi possível adicionar. Confira o UID e seu papel nesta empresa.');}finally{setBusy(false);}
 }
 async function deactivate(uid:string){
  setBusy(true);setMessage('');
  try{await updateDoc(doc(getFirebaseClient().db,'companyMembers',companyId+'_'+uid),{status:'inactive'});setMessage('Acesso removido deste ambiente.');await load();}
  catch{setMessage('Não foi possível remover o acesso.');}finally{setBusy(false);}
 }
 async function changeCallStatus(call:CompanyCall,status:string){
  try{await updateDoc(doc(getFirebaseClient().db,'serviceCalls',call.id),{status,updatedAt:serverTimestamp()});setMessage('Status do chamado atualizado.');await load();}
  catch{setMessage('Não foi possível alterar o status. A revisão, prazo e transição precisam permitir essa mudança.');}
 }
 const canManage=role==='owner'||role==='manager';
 return <main className="page-wrap"><div className="page-heading"><div><p className="eyebrow">AMBIENTE EMPRESARIAL · {role||'membro'}</p><h1>{company.name||'Empresa'}</h1><p>Edite a apresentação e administre membros e oportunidades.</p></div><Link className="button button-secondary" href="/painel">Voltar ao painel</Link></div>
  {message&&<p className="form-message" role="status">{message}</p>}
  {canManage&&<form className="panel-card form-stack" onSubmit={e=>void save(e)}><h2>Perfil da empresa</h2>
   <label>Nome<input required maxLength={120} value={company.name||''} onChange={e=>field('name',e.target.value)}/></label>
   <label>Categoria<input required maxLength={100} value={company.category||''} onChange={e=>field('category',e.target.value)}/></label>
   <label>Apresentação<textarea rows={4} maxLength={1600} value={company.description||''} onChange={e=>field('description',e.target.value)}/></label>
   <MunicipalityPicker stateCode={company.stateCode||'RS'} cityCode={company.cityCode||''} onStateChange={v=>setCompany(c=>({...c,stateCode:v,cityCode:''}))} onCityChange={v=>field('cityCode',v)}/>
   <label>Outras cidades atendidas, códigos IBGE<input placeholder="4301602, 4314407" value={serviceCities} onChange={e=>setServiceCities(e.target.value)}/></label>
   <label className="check-label"><input type="checkbox" checked={Boolean(company.acceptsTravel)} onChange={e=>field('acceptsTravel',e.target.checked)}/>Aceitamos deslocamento</label>
   <label>Razão social privada<input maxLength={160} value={legalName} onChange={e=>setLegalName(e.target.value)}/></label>
   <label>CNPJ privado<input maxLength={18} value={cnpj} onChange={e=>setCnpj(e.target.value)}/></label>
   <label>Endereço comercial privado<input maxLength={250} value={address} onChange={e=>setAddress(e.target.value)}/></label>
   <label>Responsável pelo contato<input maxLength={100} value={contactName} onChange={e=>setContactName(e.target.value)}/></label>
   <label>E-mail empresarial privado<input type="email" maxLength={254} value={contactEmail} onChange={e=>setContactEmail(e.target.value)}/></label>
   <label>Telefone privado<input type="tel" maxLength={24} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
   <label className="check-label"><input type="checkbox" checked={whatsappAllowed} onChange={e=>setWhatsappAllowed(e.target.checked)}/>Autorizo contato assistido sobre oportunidades pelo WhatsApp</label>
   <label>Visibilidade<select value={company.visibility||'private'} onChange={e=>field('visibility',e.target.value)}><option value="private">Privada</option><option value="public">Pública após aprovação</option></select></label>
   <p className="status-chip">Moderação: {company.moderationStatus||'pendente'} · Conta: {company.status||'ativa'}</p><button className="button button-primary" disabled={busy}>{busy?'Salvando…':'Salvar empresa'}</button>
  </form>}
  {canManage&&<section className="panel-card form-stack"><p className="eyebrow">EQUIPE</p><h2>Membros e papéis</h2><p>Adicione pessoas pelo UID da conta Firebase. Cada pessoa verá somente as empresas em que tem associação ativa.</p>
   <form className="invite-row" onSubmit={e=>void invite(e)}><label>UID do membro<input required value={inviteUid} onChange={e=>setInviteUid(e.target.value)}/></label><label>Papel<select value={inviteRole} onChange={e=>setInviteRole(e.target.value as 'member'|'manager')}><option value="member">Membro</option><option value="manager">Gestor</option></select></label><button className="button button-primary" disabled={busy}>Adicionar</button></form>
   <div className="admin-list">{members.map(m=><article className="admin-row" key={m.uid}><div><strong>{m.uid===user?.uid?'Você':m.uid}</strong><small>{m.role} · {m.status}</small></div>{m.status==='active'&&m.uid!==user?.uid&&m.role!=='owner'&&<button className="row-action" onClick={()=>void deactivate(m.uid)}>Remover acesso</button>}</article>)}</div>
  </section>}
  {canManage&&<section className="panel-card"><p className="eyebrow">OPORTUNIDADES</p><h2>Publique um chamado</h2><p>Informe o local, o tipo de fornecedor e o prazo. A plataforma não assume disponibilidade com base apenas na proximidade.</p><div className="form-actions"><Link className="button button-primary" href={'/oportunidades/nova?companyId='+encodeURIComponent(companyId)}>Criar oportunidade</Link><Link className="button button-secondary" href={'/empresas/'+companyId+'/candidaturas'}>Ver candidaturas</Link></div></section>}
  {canManage&&<section className="panel-card"><p className="eyebrow">CHAMADOS</p><h2>Gerenciar oportunidades</h2>{companyCalls.length===0?<p className="muted">Ainda não há chamados nesta empresa.</p>:<div className="admin-list">{companyCalls.map(call=>{const transitions=[...(callTransitions[call.status]||[call.status]),...(call.deadline&&call.deadline.toDate().getTime()<=Date.now()&&call.status!=='expired'?['expired']:[])];return <article className="admin-row" key={call.id}><div><strong>{call.title||'Sem título'}</strong><small>{call.id} · {callStatusLabels[call.status]||call.status} · revisão {call.moderationStatus||'pendente'}{call.deadline?' · prazo '+call.deadline.toDate().toLocaleDateString('pt-BR'):''}</small><Link className="text-link" href={'/oportunidades/'+call.id}>Abrir chamado →</Link></div><select aria-label={'Status de '+(call.title||'chamado')} value={call.status} onChange={e=>void changeCallStatus(call,e.target.value)}>{transitions.map(status=><option key={status} value={status}>{callStatusLabels[status]||status}</option>)}</select></article>})}</div>}</section>}
 </main>;
}


