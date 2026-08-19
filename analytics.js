import {cloudEnabled,supabase} from './supabase'

const L_ANALYTICS='nuvora_v06_analytics'
const ALLOWED=new Set(['open','rsvp','wish','maps','streaming','gift_copy','guest_pass_view'])
const read=()=>{try{return JSON.parse(localStorage.getItem(L_ANALYTICS))||[]}catch{return[]}}
const write=v=>localStorage.setItem(L_ANALYTICS,JSON.stringify(v))
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`

function sessionId(){
  const key='nuvora_public_session'
  let s=sessionStorage.getItem(key)
  if(!s){s=uid();sessionStorage.setItem(key,s)}
  return s
}

export async function trackEvent(invitationId,eventType){
  if(!invitationId||!ALLOWED.has(eventType)) return
  const row={invitation_id:invitationId,event_type:eventType,session_id:sessionId(),created_at:new Date().toISOString()}
  try{
    if(!cloudEnabled){write([row,...read()].slice(0,5000));return}
    await supabase.from('analytics_events').insert({
      invitation_id:row.invitation_id,
      event_type:row.event_type,
      session_id:row.session_id
    })
  }catch(e){
    console.warn('Analytics event skipped:',e?.message||e)
  }
}

function summarize(rows){
  const counts={open:0,rsvp:0,wish:0,maps:0,streaming:0,gift_copy:0,guest_pass_view:0,unique_open:0}
  const sessions=new Set()
  for(const r of rows){
    if(r.event_type in counts) counts[r.event_type]++
    if(r.event_type==='open'&&r.session_id) sessions.add(r.session_id)
  }
  counts.unique_open=sessions.size
  return counts
}

export async function getInvitationAnalytics(invitationId){
  if(!invitationId) return summarize([])
  if(!cloudEnabled) return summarize(read().filter(x=>x.invitation_id===invitationId))
  const {data,error}=await supabase.from('analytics_events')
    .select('event_type,session_id,created_at')
    .eq('invitation_id',invitationId)
  if(error) throw error
  return summarize(data||[])
}

export async function getAnalyticsByInvitation(invitationIds=[]){
  const ids=invitationIds.filter(Boolean)
  if(!ids.length) return {}
  let rows=[]
  if(!cloudEnabled){
    rows=read().filter(x=>ids.includes(x.invitation_id))
  }else{
    const {data,error}=await supabase.from('analytics_events')
      .select('invitation_id,event_type,session_id,created_at')
      .in('invitation_id',ids)
    if(error) throw error
    rows=data||[]
  }
  const out={}
  for(const id of ids) out[id]=summarize(rows.filter(x=>x.invitation_id===id))
  return out
}


function dayKey(v){
  const d=new Date(v)
  if(Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0,10)
}

export async function getAnalyticsSeries(invitationId,days=30){
  if(!invitationId) return []
  let rows=[]
  if(!cloudEnabled){
    rows=read().filter(x=>x.invitation_id===invitationId)
  }else{
    let q=supabase.from('analytics_events')
      .select('event_type,session_id,created_at')
      .eq('invitation_id',invitationId)
    if(days>0){
      const since=new Date(Date.now()-days*86400000).toISOString()
      q=q.gte('created_at',since)
    }
    const {data,error}=await q.order('created_at',{ascending:true})
    if(error) throw error
    rows=data||[]
  }
  if(days>0){
    const since=Date.now()-days*86400000
    rows=rows.filter(x=>new Date(x.created_at).getTime()>=since)
  }
  const map=new Map()
  for(const r of rows){
    const k=dayKey(r.created_at)
    if(!k) continue
    if(!map.has(k)) map.set(k,{date:k,open:0,rsvp:0,wish:0,maps:0})
    const x=map.get(k)
    if(r.event_type in x) x[r.event_type]++
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date))
}
