'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useRadarSession } from '@/lib/firebase/session';
import { ProtectedArea } from '@/components/protected-area';
import { MunicipalityPicker } from '@/components/municipality-picker';

type Profile = { displayName?: string; headline?: string; bio?: string; specialties?: string[]; courses?: string[]; qualifications?: string[]; certifications?: string[]; hasVehicle?: boolean; ownsTools?: boolean; experienceYears?: number; stateCode?: string; cityCode?: string; serviceCityCodes?: string[]; acceptsTravel?: boolean; available?: boolean; visibility?: 'private' | 'public'; moderationStatus?: string };
function Editor() {
  const { user } = useRadarSession();
  const [profile, setProfile] = useState<Profile>({});
  const [phone, setPhone] = useState('');
  const [whatsappAllowed, setWhatsappAllowed] = useState(false);
  const [specialties, setSpecialties] = useState('');
  const [courses, setCourses] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [certifications, setCertifications] = useState('');
  const [serviceCities, setServiceCities] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!user) return;
    const { db } = getFirebaseClient();
    Promise.all([getDoc(doc(db, 'professionalProfiles', user.uid)), getDoc(doc(db, 'professionalPrivate', user.uid))])
      .then(([p, privateDoc]) => {
        if (p.exists()) {
          const value = p.data() as Profile; setProfile(value);
          setSpecialties((value.specialties || []).join(', '));
          setCourses((value.courses || []).join(', '));
          setQualifications((value.qualifications || []).join(', '));
          setCertifications((value.certifications || []).join(', '));
          setServiceCities((value.serviceCityCodes || []).join(', '));
        }
        if (privateDoc.exists()) { setPhone(String(privateDoc.data().phone || '')); setWhatsappAllowed(privateDoc.data().whatsappAllowed === true); }
      }).catch(() => setMessage('Não foi possível carregar o perfil. Tente novamente.'));
  }, [user]);
  function field<K extends keyof Profile>(key: K, value: Profile[K]) { setProfile((current) => ({ ...current, [key]: value })); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return;
    setBusy(true); setMessage('');
    const { db } = getFirebaseClient();
    try {
      await Promise.all([
        setDoc(doc(db, 'professionalProfiles', user.uid), {
          displayName: profile.displayName?.trim() || user.displayName || '',
          headline: profile.headline?.trim() || '',
          bio: profile.bio?.trim() || '',
          specialties: specialties.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 30),
          courses: courses.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 30),
          qualifications: qualifications.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 30),
          certifications: certifications.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 30),
          hasVehicle: Boolean(profile.hasVehicle), ownsTools: Boolean(profile.ownsTools),
          experienceYears: Math.max(0, Math.min(60, Number(profile.experienceYears) || 0)),
          stateCode: profile.stateCode || 'RS', cityCode: profile.cityCode || '',
          serviceCityCodes: serviceCities.split(',').map((item) => item.trim()).filter((item) => /^\d{7}$/.test(item)).slice(0, 50),
          acceptsTravel: Boolean(profile.acceptsTravel), available: Boolean(profile.available),
          visibility: profile.visibility === 'public' ? 'public' : 'private',
          moderationStatus: 'pending',
          updatedAt: serverTimestamp()
        }, { merge: true }),
        setDoc(doc(db, 'professionalPrivate', user.uid), { phone: phone.replace(/[^+\d]/g, '').slice(0, 20), whatsappAllowed, updatedAt: serverTimestamp() }, { merge: true })
      ]);
      setProfile((current) => ({ ...current, moderationStatus: 'pending' }));
      setMessage(profile.visibility === 'public' ? 'Perfil salvo. A publicação ficará visível após aprovação administrativa.' : 'Perfil salvo como privado.');
    } catch {
      setMessage('Não foi possível salvar. Confira as regras do Firestore e tente novamente.');
    } finally { setBusy(false); }
  }
  return <form className="panel-card form-stack" onSubmit={(event) => void save(event)}>
    <div><p className="eyebrow">AMBIENTE PROFISSIONAL</p><h1>Meu perfil</h1><p className="muted">Compartilhe suas competências, disponibilidade e área de atendimento. Fotografia é opcional.</p></div>
    <label>Nome de exibição<input required maxLength={100} value={profile.displayName || ''} onChange={(e) => field('displayName', e.target.value)} /></label>
    <label>Título profissional<input maxLength={120} placeholder="Ex.: Técnico em refrigeração industrial" value={profile.headline || ''} onChange={(e) => field('headline', e.target.value)} /></label>
    <label>Apresentação<textarea rows={5} maxLength={1600} value={profile.bio || ''} onChange={(e) => field('bio', e.target.value)} /></label>
    <label>Especialidades, separadas por vírgula<input maxLength={500} placeholder="Manutenção, elétrica, automação" value={specialties} onChange={(e) => setSpecialties(e.target.value)} /></label>
    <label>Cursos realizados<input maxLength={1000} value={courses} onChange={(e) => setCourses(e.target.value)} /><small>Informe cursos separados por vírgula, sem anexar documentos pessoais.</small></label>
    <label>Qualificações e habilitações<input maxLength={1000} value={qualifications} onChange={(e) => setQualifications(e.target.value)} /></label>
    <label>Certificações<input maxLength={1000} value={certifications} onChange={(e) => setCertifications(e.target.value)} /></label>
    <label>Anos de experiência<input type="number" min={0} max={60} value={profile.experienceYears ?? 0} onChange={(e) => field('experienceYears', Number(e.target.value))} /></label>
    <MunicipalityPicker stateCode={profile.stateCode || 'RS'} cityCode={profile.cityCode || ''} onStateChange={(value) => setProfile((p) => ({ ...p, stateCode: value, cityCode: '' }))} onCityChange={(value) => field('cityCode', value)} />
    <label>Códigos IBGE de outras cidades atendidas<input placeholder="4301602, 4314407" value={serviceCities} onChange={(e) => setServiceCities(e.target.value)} /><small>Informe somente municípios que você aceita atender; separados por vírgula.</small></label>
    <label>Telefone para contato privado<input type="tel" autoComplete="tel" maxLength={24} value={phone} onChange={(e) => setPhone(e.target.value)} /><small>Esse telefone não aparece no diretório público.</small></label>
    <label className="check-label"><input type="checkbox" checked={whatsappAllowed} onChange={(e) => setWhatsappAllowed(e.target.checked)} />Autorizo contato assistido sobre oportunidades pelo WhatsApp</label>
    <div className="toggle-row"><label className="check-label"><input type="checkbox" checked={Boolean(profile.acceptsTravel)} onChange={(e) => field('acceptsTravel', e.target.checked)} />Aceito deslocamento para outras cidades</label><label className="check-label"><input type="checkbox" checked={profile.available !== false} onChange={(e) => field('available', e.target.checked)} />Estou disponível</label><label className="check-label"><input type="checkbox" checked={Boolean(profile.hasVehicle)} onChange={(e) => field('hasVehicle', e.target.checked)} />Tenho veículo para o trabalho</label><label className="check-label"><input type="checkbox" checked={Boolean(profile.ownsTools)} onChange={(e) => field('ownsTools', e.target.checked)} />Tenho ferramentas próprias</label></div>
    <label>Visibilidade<select value={profile.visibility || 'private'} onChange={(e) => field('visibility', e.target.value as 'private' | 'public')}><option value="private">Privado</option><option value="public">Público após aprovação</option></select><small>O perfil só entra no diretório quando público e aprovado.</small></label>
    {message && <p className="form-message" role="status">{message}</p>}
    <div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar perfil'}</button><span className="status-chip">Moderação: {profile.moderationStatus || 'pendente'}</span></div>
  </form>;
}
export function ProfileForm() { return <ProtectedArea><main className="page-wrap"><Editor /></main></ProtectedArea>; }

