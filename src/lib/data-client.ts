'use client'
import { authClient } from './auth/client'
// Transitional view adapter: all data operations go to authenticated server routes.
// No database client, credentials or authorization decision exists in the browser.
/* eslint-disable @typescript-eslint/no-explicit-any */
class Query implements PromiseLike<{data:any;error:{message:string}|null}> {
  private request: Record<string,any>
  constructor(table:string) { this.request={table,operation:'select',filters:[]} }
  select(fields='*') {this.request.fields=fields;return this}
  eq(key:string,value:unknown) {this.request.filters.push([key,value]);return this}
  order(column:string, options={ascending:true}) {this.request.order={column,ascending:options.ascending};return this}
  update(values:unknown) {this.request.operation='update';this.request.values=values;return this}
  insert(values:unknown) {this.request.operation='insert';this.request.values=values;return this}
  upsert(values:unknown, options?:{onConflict?:string;ignoreDuplicates?:boolean}) {this.request.operation='upsert';this.request.values=values;this.request.ignoreDuplicates=options?.ignoreDuplicates;return this}
  maybeSingle() {this.request.single=true;return this}
  single() {return this.maybeSingle()}
  async execute() {
    try {
      const res=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(this.request),cache:'no-store'})
      const body=await res.json()
      if (!res.ok) return {data:null,error:{message:body.error??'Data unavailable'}}
      return body
    } catch {return {data:null,error:{message:'Unable to reach CycleWorth'}}}
  }
  then<TResult1 = {data:any;error:{message:string}|null}, TResult2 = never>(onfulfilled?: ((value:{data:any;error:{message:string}|null})=>TResult1|PromiseLike<TResult1>)|null,onrejected?:((reason:any)=>TResult2|PromiseLike<TResult2>)|null):Promise<TResult1|TResult2>{return this.execute().then(onfulfilled,onrejected)}
}
export const dataClient={
  from:(table:string)=>new Query(table),
  auth:{
    async getSession() {
      const res=await fetch('/api/me',{cache:'no-store'})
      if(res.status===401)return {data:{session:null}}
      const body=await res.json()
      if(!res.ok)throw new Error(body.error??'Session unavailable')
      return {data:{session:{user:body.user as {id:string;email:string},access_token:'cookie-session'}}}
    },
    async signOut(){await authClient.signOut();window.dispatchEvent(new Event('cycleworth-auth'))},
    onAuthStateChange(callback:()=>void){
      let active=true
      const run=()=>{if(active)callback()}
      queueMicrotask(run);window.addEventListener('cycleworth-auth',run)
      return {data:{subscription:{unsubscribe(){active=false;window.removeEventListener('cycleworth-auth',run)}}}}
    },
  },
}
