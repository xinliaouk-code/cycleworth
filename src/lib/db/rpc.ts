import 'server-only'
import { scoped } from './connection'
const procedures: Record<string, string[]> = {
  health_sync_manage: ['p_action','p_token_hash','p_settings'],
  health_history_import: ['p_rides','p_dry_run','p_parse_summary'],
  health_import: ['p_rides','p_dry_run'],
  health_token_context: ['p_token_hash'],
  health_token_import: ['p_token_hash','p_rides','p_dry_run','p_parse_summary'],
}
export function rpcClient(owner: string | null) {
  return { rpc: async (name: string, args: Record<string, unknown> = {}) => {
    const parameters = procedures[name]
    if (!parameters) return { data: null, error: { code: '42501' } }
    const defaults: Record<string, unknown> = {p_action:'status',p_token_hash:null,p_settings:null,p_rides:[],p_dry_run:true,p_parse_summary:{}}
    try {
      const data = await scoped(owner, async db => (await db.query(`select personal_cycleworth.${name}(${parameters.map((_,i)=>`$${i+1}`).join(',')}) as result`, parameters.map(p=>{const v=args[p]??defaults[p];return typeof v==='object'&&v!==null?JSON.stringify(v):v}))).rows[0].result)
      return {data,error:null}
    } catch(error) { return {data:null,error:{code:(error as {code?:string}).code}} }
  } }
}
