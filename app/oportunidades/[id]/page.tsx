import { OpportunityDetail } from '@/components/opportunity-detail';
export default async function OpportunityPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <OpportunityDetail callId={id}/>;}

