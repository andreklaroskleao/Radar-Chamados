import { OpportunityForm } from '@/components/opportunity-form';
import { ProtectedArea } from '@/components/protected-area';
export default async function NewOpportunityPage({searchParams}:{searchParams:Promise<{companyId?:string}>}){
 const {companyId}=await searchParams;
 if(!companyId)return <main className="page-wrap"><div className="notice-card"><h1>Selecione uma empresa</h1><p>Abra o ambiente empresarial para iniciar a publicação.</p></div></main>;
 return <ProtectedArea><OpportunityForm companyId={companyId}/></ProtectedArea>;
}

