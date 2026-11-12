import { ReportForm } from '@/components/report-form';
import { ProtectedArea } from '@/components/protected-area';
export default async function ReportPage({searchParams}:{searchParams:Promise<{targetType?:string;targetId?:string}>}){const query=await searchParams;return <ProtectedArea><ReportForm targetType={query.targetType} targetId={query.targetId}/></ProtectedArea>;}
