'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { loginWithEmail, registerWithEmail, sendPasswordReset } from '@/lib/firebase/auth';
const messages:Record<string,string>={
 'auth/email-already-in-use':'Este e-mail já tem uma conta. Entre ou recupere a senha.',
 'auth/invalid-credential':'E-mail ou senha não conferem.','auth/invalid-email':'Informe um e-mail válido.',
 'auth/weak-password':'Use uma senha com pelo menos 6 caracteres.',
 'auth/operation-not-allowed':'O provedor e-mail/senha ainda precisa ser habilitado no Firebase Authentication.',
 'auth/network-request-failed':'Sem conexão com o Firebase. Confira sua internet e tente novamente.'
};
export function AuthForm({mode}:{mode:'login'|'register'}){
 const router=useRouter();const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const isRegister=mode==='register';
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setMessage('');
  try{if(isRegister)await registerWithEmail(name,email,password);else await loginWithEmail(email,password);router.replace('/painel');}
  catch(error){const code=typeof error==='object'&&error&&'code'in error?String(error.code):'';setMessage(messages[code]||'Não foi possível concluir. Confira os dados e tente novamente.');}
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
   {!isRegister&&<button className="text-button" onClick={()=>void resetPassword()} disabled={busy}>Esqueci minha senha</button>}<p className="auth-switch">{isRegister?'Já tem conta?':'Ainda não tem conta?'} <Link href={isRegister?'/entrar':'/cadastro'}>{isRegister?'Entrar':'Cadastre-se'}</Link></p>
  </section></main>;
}

