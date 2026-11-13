'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ensureUserDocuments, loginWithEmail, registerWithEmail, sendPasswordReset } from '@/lib/firebase/auth';
import { getFirebaseClient } from '@/lib/firebase/client';
const messages:Record<string,string>={
 'auth/email-already-in-use':'Este e-mail já tem uma conta. Entre ou recupere a senha.',
 'auth/invalid-credential':'E-mail ou senha não conferem.','auth/invalid-email':'Informe um e-mail válido.',
 'auth/weak-password':'Use uma senha com pelo menos 6 caracteres.',
 'auth/operation-not-allowed':'O provedor e-mail/senha ainda precisa ser habilitado no Firebase Authentication.',
 'auth/network-request-failed':'Sem conexão com o Firebase Authentication. Confira a conexão e tente novamente.',
 'permission-denied':'A autenticação foi aceita, mas o Firestore recusou a leitura ou gravação do perfil. Confira as regras publicadas e tente novamente.',
 'unauthenticated':'A autenticação foi aceita, mas o Firestore não recebeu uma sessão válida para criar o perfil. Saia e entre novamente.',
 'unavailable':'A autenticação foi aceita, mas o Firestore está indisponível ou sem resposta. Tente novamente em instantes.',
 'deadline-exceeded':'A autenticação foi aceita, mas a operação no Firestore excedeu o tempo limite. Tente entrar novamente.',
 'failed-precondition':'A autenticação foi aceita, mas uma condição do Firestore impediu a gravação do perfil.'
};
export function AuthForm({mode}:{mode:'login'|'register'}){
 const router=useRouter();const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [profilePending,setProfilePending]=useState(false);const isRegister=mode==='register';
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setMessage('');
  try{if(isRegister)await registerWithEmail(name,email,password);else await loginWithEmail(email,password);router.replace('/painel');}
  catch(error){const code=typeof error==='object'&&error&&'code'in error?String(error.code):'';const detail=error instanceof Error?error.message:'';console.error('[Radar] Falha no fluxo de autenticação/perfil:',{code:code||'sem código',message:detail});let authenticated=false;try{authenticated=Boolean(getFirebaseClient().auth.currentUser)}catch{}setProfilePending(authenticated&&!code.startsWith('auth/'));setMessage(messages[code]||(code?`Não foi possível concluir. Código Firebase: ${code}.`:'Não foi possível concluir. Confira o Console do navegador para ver o erro técnico.'));}
  finally{setBusy(false);}
 }
 async function retryProfileSetup(){
  const user=getFirebaseClient().auth.currentUser;
  if(!user){setProfilePending(false);setMessage('Sua sessão expirou. Entre novamente para concluir o cadastro.');return;}
  setBusy(true);setMessage('');
  try{await ensureUserDocuments(user);setProfilePending(false);router.replace('/painel');}
  catch(error){const code=typeof error==='object'&&error&&'code'in error?String(error.code):'';const detail=error instanceof Error?error.message:'';console.error('[Radar] Nova tentativa de criação do perfil falhou:',{code:code||'sem código',message:detail});setMessage(messages[code]||(code?`Ainda não foi possível salvar o perfil. Código Firebase: ${code}.`:'Ainda não foi possível salvar o perfil. Tente novamente.'));}
  finally{setBusy(false);}
 }
 async function resetPassword(){
  if(!email.trim()){setMessage('Informe seu e-mail para receber o link de recuperação.');return;}
  setBusy(true);setMessage('');
  try{await sendPasswordReset(email);setMessage('Se esse e-mail estiver cadastrado, o Firebase enviará as instruções de recuperação.');}
  catch{setMessage('Não foi possível solicitar a recuperação agora. Confira o e-mail e tente novamente.');}
  finally{setBusy(false);}
 }
 return <main className="auth-layout"><section className="auth-aside"><span className="eyebrow">RADAR COMERCIAL REGIONAL</span><h1>{isRegister?'Seu trabalho encontra novos caminhos.':'Bem-vindo de volta.'}</h1><p>Uma plataforma para conectar profissionais, empresas e oportunidades na região.</p><div className="auth-aside-note"><span>01</span><p>Comece com seu perfil profissional. Sua foto é opcional.</p></div><div className="auth-aside-note"><span>02</span><p>Crie um ambiente empresarial quando precisar.</p></div></section>
  <section className="auth-card"><Link href="/" className="back-link">← Início</Link><p className="eyebrow">{isRegister?'NOVO CADASTRO':'ACESSO À PLATAFORMA'}</p><h2>{isRegister?'Criar uma conta':'Entrar'}</h2><p className="muted">{isRegister?'Uma conta pode ter perfil profissional e participar de várias empresas.':'Use o e-mail e a senha da sua conta Radar.'}</p>
   <form className="form-stack" onSubmit={e=>void submit(e)}>{isRegister&&<label>Nome completo<input autoComplete="name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>}<label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input type="password" autoComplete={isRegister?'new-password':'current-password'} required minLength={6} value={password} onChange={e=>setPassword(e.target.value)}/></label>{message&&<p className="form-message" role="status">{message}</p>}<button className="button button-primary button-full" disabled={busy}>{busy?'Aguarde…':isRegister?'Criar conta':'Entrar'}</button></form>
   {profilePending&&<button className="button button-secondary button-full" onClick={()=>void retryProfileSetup()} disabled={busy}>{busy?'Tentando salvar…':'Tentar salvar meu perfil novamente'}</button>}
   {!isRegister&&<button className="text-button" onClick={()=>void resetPassword()} disabled={busy}>Esqueci minha senha</button>}<p className="auth-switch">{isRegister?'Já tem conta?':'Ainda não tem conta?'} <Link href={isRegister?'/entrar':'/cadastro'}>{isRegister?'Entrar':'Cadastre-se'}</Link></p>
  </section></main>;
}

