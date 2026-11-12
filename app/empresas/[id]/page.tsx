import { CompanyWorkspace } from '@/components/company-workspace';
import { ProtectedArea } from '@/components/protected-area';
export default async function CompanyPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ProtectedArea><CompanyWorkspace companyId={id}/></ProtectedArea>;}

