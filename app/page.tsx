import Link from 'next/link';

const highlights=[
 {number:'01',title:'Perfis com identidade profissional',text:'Mostre especialidades, experiência e disponibilidade sem precisar publicar uma fotografia.'},
 {number:'02',title:'Empresas em ambientes próprios',text:'Organize equipes, dados empresariais e oportunidades em cada espaço de trabalho.'},
 {number:'03',title:'Atuação com contexto local',text:'Informe municípios atendidos por códigos oficiais e deixe claro quando aceita deslocamento.'}
];
export default function HomePage(){
 return <main className="landing">
  <section className="hero-section"><div className="hero-copy"><p className="eyebrow">CONEXÕES PROFISSIONAIS · RIO GRANDE DO SUL</p><h1>Trabalho local.<br/><em>Novas possibilidades.</em></h1><p>O Radar aproxima profissionais técnicos, empresas e oportunidades, começando pelas regiões de Bagé, Pelotas e Santana do Livramento.</p><div className="hero-actions"><Link className="button button-primary" href="/cadastro">Criar meu perfil <span>→</span></Link><Link className="button button-secondary" href="/oportunidades">Explorar oportunidades</Link></div><small>Cadastro gratuito · Sem fotografia obrigatória</small></div><div className="hero-art"><div className="radar-ring ring-one"/><div className="radar-ring ring-two"/><div className="radar-ring ring-three"/><div className="radar-core">R<span>+</span></div><span className="radar-point point-a">BAGÉ</span><span className="radar-point point-b">PELOTAS</span><span className="radar-point point-c">FRONTEIRA</span><div className="hero-art-caption">ALCANCE REGIONAL<br/><strong>RS · BRASIL</strong></div></div></section>
  <section className="trust-strip"><span>PROFISSIONAIS</span><i/><span>EMPRESAS</span><i/><span>OPORTUNIDADES</span><i/><span>CONEXÕES REGIONAIS</span></section>
  <section className="feature-section"><div className="section-intro"><p className="eyebrow">UMA PLATAFORMA, DIFERENTES AMBIENTES</p><h2>Uma base para crescer<br/>com a sua região.</h2></div><div className="feature-list">{highlights.map(item=><article className="feature-row" key={item.number}><span>{item.number}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><b aria-hidden="true">↗</b></article>)}</div></section>
  <section className="join-banner"><div><p className="eyebrow">COMECE AGORA</p><h2>Seu próximo contato começa com um perfil.</h2></div><Link className="button button-light" href="/cadastro">Entrar para o Radar <span>→</span></Link></section>
 </main>;
}

