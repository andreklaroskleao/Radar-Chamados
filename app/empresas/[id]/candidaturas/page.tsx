import { CompanyApplications } from '@/components/company-applications';
import { ProtectedArea } from '@/components/protected-area';
export default async function ApplicationsPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ProtectedArea><main className="page-wrap"><CompanyApplications companyId={id}/></main></ProtectedArea>;}

