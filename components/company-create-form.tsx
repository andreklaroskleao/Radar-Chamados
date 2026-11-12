'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useRadarSession } from '@/lib/firebase/session';
import { MunicipalityPicker } from '@/components/municipality-picker';

export function CompanyCreateForm(){
 const {user}=useRadarSession();const router=useRouter();
 const [name,setName]=useState('');const [category,setCategory]=useState('');const [description,setDescription]=useState('');
 const [phone,setPhone]=useState('');const [contactName,setContactName]=useState('');const [contactEmail,setContactEmail]=useState('');const [legalName,setLegalName]=useState('');const [cnpj,setCnpj]=useState('');const [address,setAddress]=useState('');const [whatsappAllowed,setWhatsappAllowed]=useState(false);const [stateCode,setStateCode]=useState('RS');const [cityCode,setCityCode]=useState('');
 const [serviceCities,setServiceCities]=useState('');const [acceptsTravel,setAcceptsTravel]=useState(false);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!user)return;setBusy(true);setMessage('');
  try{
   const {db}=getFirebaseClient();const companyRef=doc(collection(db,'companyProfiles'));const memberRef=doc(db,'companyMembers',companyRef.id+'_'+user.uid);
   const batch=writeBatch(db);
   batch.set(companyRef,{companyId:companyRef.id,name:name.trim(),category:category.trim(),description:description.trim(),stateCode,cityCode,
    serviceCityCodes:serviceCities.split(',').map(x=>x.trim()).filter(x=>/^\d{7}$/.test(x)).slice(0,50),acceptsTravel,
    visibility:'private',moderationStatus:'pending',status:'active',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
   batch.set(doc(db,'companyPrivate',companyRef.id),{ownerUid:user.uid,phone:phone.replace(/[^+\d]/g,'').slice(0,20),contactName:contactName.trim(),contactEmail:contactEmail.trim().toLowerCase(),legalName:legalName.trim(),cnpj:cnpj.replace(/\D/g,'').slice(0,14),commercialAddress:address.trim(),whatsappAllowed,updatedAt:serverTimestamp()});
   batch.set(memberRef,{companyId:companyRef.id,uid:user.uid,role:'owner',status:'active',createdAt:serverTimestamp()});
   await batch.commit();router.push('/empresas/'+companyRef.id);
  }catch{setMessage('Não foi possível criar o ambiente. Confira se o Firestore e as regras estão publicados.');}
  finally{setBusy(false);}
 }
 return <form className="panel-card form-stack" onSubmit={e=>void submit(e)}>
  <div><p className="eyebrow">AMBIENTE EMPRESARIAL</p><h1>Criar empresa</h1><p className="muted">Você será o proprietário inicial. Depois poderá convidar membros e administrar oportunidades.</p></div>
  <label>Nome da empresa<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
  <label>Categoria ou tipo de fornecedor<input required maxLength={100} placeholder="Indústria, manutenção, integradora…" value={category} onChange={e=>setCategory(e.target.value)}/></label>
  <label>Apresentação<textarea rows={4} maxLength={1600} value={description} onChange={e=>setDescription(e.target.value)}/></label>
  <MunicipalityPicker stateCode={stateCode} cityCode={cityCode} onStateChange={v=>{setStateCode(v);setCityCode('');}} onCityChange={setCityCode}/>
  <label>Outras cidades atendidas, códigos IBGE<input placeholder="4301602, 4314407" value={serviceCities} onChange={e=>setServiceCities(e.target.value)}/><small>Inclua somente municípios que a empresa atende.</small></label>
  <label className="check-label"><input type="checkbox" checked={acceptsTravel} onChange={e=>setAcceptsTravel(e.target.checked)}/>Aceitamos deslocamento para outros municípios</label>
  <label>Razão social<input maxLength={160} value={legalName} onChange={e=>setLegalName(e.target.value)}/></label>
  <label>CNPJ<input maxLength={18} value={cnpj} onChange={e=>setCnpj(e.target.value)}/><small>Dado privado, acessível apenas à equipe autorizada da empresa.</small></label>
  <label>Endereço comercial privado<input maxLength={250} value={address} onChange={e=>setAddress(e.target.value)}/></label>
  <label>Responsável pelo contato<input maxLength={100} value={contactName} onChange={e=>setContactName(e.target.value)}/></label>
  <label>E-mail empresarial privado<input type="email" maxLength={254} value={contactEmail} onChange={e=>setContactEmail(e.target.value)}/></label>
  <label>Telefone empresarial privado<input type="tel" maxLength={24} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
  <label className="check-label"><input type="checkbox" checked={whatsappAllowed} onChange={e=>setWhatsappAllowed(e.target.checked)}/>Autorizo contato assistido sobre oportunidades pelo WhatsApp</label>
  {message&&<p className="form-message" role="status">{message}</p>}<button className="button button-primary" disabled={busy}>{busy?'Criando…':'Criar ambiente empresarial'}</button>
 </form>;
}

