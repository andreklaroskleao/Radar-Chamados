'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useRadarSession } from '@/lib/firebase/session';
import { MunicipalityPicker } from '@/components/municipality-picker';

export function OpportunityForm({companyId}:{companyId:string}){
 const {user}=useRadarSession();const router=useRouter();
 const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [category,setCategory]=useState('');const [providerType,setProviderType]=useState('professional');
 const [technicalRequirements,setTechnicalRequirements]=useState('');const [requiredCertifications,setRequiredCertifications]=useState('');const [experienceYears,setExperienceYears]=useState('0');const [professionalCount,setProfessionalCount]=useState('1');const [compensation,setCompensation]=useState('A combinar');const [travelAssistance,setTravelAssistance]=useState(false);const [executionDate,setExecutionDate]=useState('');
 const [stateCode,setStateCode]=useState('RS');const [cityCode,setCityCode]=useState('');const [specialties,setSpecialties]=useState('');
 const [deadline,setDeadline]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!user)return;setBusy(true);setError('');
  try{
   const {db}=getFirebaseClient();const company=await getDoc(doc(db,'companyProfiles',companyId));
   if(!company.exists())throw new Error('Empresa indisponível');
   const ref=doc(collection(db,'serviceCalls'));
   await setDoc(ref,{
    serviceCallId:ref.id,companyId,companyStatus:'active',title:title.trim(),description:description.trim(),category:category.trim(),providerType,
    stateCode,cityCode,specialties:specialties.split(',').map(x=>x.trim()).filter(Boolean).slice(0,30),
    technicalRequirements:technicalRequirements.trim(),requiredCertifications:requiredCertifications.split(',').map(x=>x.trim()).filter(Boolean).slice(0,30),
    experienceYears:Math.max(0,Math.min(60,Number(experienceYears)||0)),professionalCount:Math.max(1,Math.min(100,Number(professionalCount)||1)),
    compensationDescription:compensation.trim()||'A combinar',travelAssistance,executionDate:executionDate?new Date(executionDate+'T12:00:00'):null,
    status:'published',moderationStatus:'pending',deadline:new Date(deadline),createdAt:serverTimestamp(),updatedAt:serverTimestamp()
   });
   router.push('/empresas/'+companyId);
  }catch{setError('Não foi possível publicar. A conta precisa ter permissão de gestão na empresa e o Firestore precisa estar configurado.');}
  finally{setBusy(false);}
 }
 return <main className="page-wrap"><Link className="back-link" href={'/empresas/'+companyId}>← Voltar à empresa</Link><form className="panel-card form-stack" onSubmit={e=>void submit(e)}>
  <p className="eyebrow">NOVO CHAMADO</p><h1>Publicar oportunidade</h1>
  <label>Título<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>
  <label>Categoria ou tipo de serviço<input required maxLength={100} value={category} onChange={e=>setCategory(e.target.value)}/></label>
  <label>Descrição e requisitos<textarea required rows={6} maxLength={3000} value={description} onChange={e=>setDescription(e.target.value)}/></label>
  <label>Tipo de fornecedor<select value={providerType} onChange={e=>setProviderType(e.target.value)}><option value="professional">Profissional</option><option value="company">Empresa</option><option value="both">Profissional ou empresa</option></select></label>
  <MunicipalityPicker stateCode={stateCode} cityCode={cityCode} onStateChange={v=>{setStateCode(v);setCityCode('');}} onCityChange={setCityCode}/>
  <label>Especialidades, separadas por vírgula<input maxLength={500} value={specialties} onChange={e=>setSpecialties(e.target.value)}/></label>
  <label>Requisitos técnicos<textarea rows={3} maxLength={2000} value={technicalRequirements} onChange={e=>setTechnicalRequirements(e.target.value)}/></label>
  <label>Cursos/certificações exigidos<input maxLength={1000} value={requiredCertifications} onChange={e=>setRequiredCertifications(e.target.value)}/></label>
  <div className="form-grid"><label>Experiência mínima (anos)<input type="number" min={0} max={60} value={experienceYears} onChange={e=>setExperienceYears(e.target.value)}/></label><label>Quantidade de profissionais<input type="number" min={1} max={100} value={professionalCount} onChange={e=>setProfessionalCount(e.target.value)}/></label></div>
  <label>Remuneração<input maxLength={120} placeholder="A combinar" value={compensation} onChange={e=>setCompensation(e.target.value)}/></label>
  <label className="check-label"><input type="checkbox" checked={travelAssistance} onChange={e=>setTravelAssistance(e.target.checked)}/>Há ajuda de custo ou deslocamento</label>
  <label>Data prevista para execução<input type="date" value={executionDate} onChange={e=>setExecutionDate(e.target.value)}/></label>
  <label>Prazo para candidaturas<input required type="datetime-local" min={new Date(Date.now()+3600000).toISOString().slice(0,16)} value={deadline} onChange={e=>setDeadline(e.target.value)}/></label>
  <p className="muted">O chamado ficará público depois da revisão administrativa. Nenhum fornecedor será selecionado automaticamente.</p>
  {error&&<p className="form-message">{error}</p>}<button className="button button-primary" disabled={busy}>{busy?'Publicando…':'Publicar para revisão'}</button>
 </form></main>;
}


