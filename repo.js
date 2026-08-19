import { cloudEnabled, supabase } from './supabase'

const L_INV='nuvora_v02_invitations'
const L_GUEST='nuvora_v02_guests'
const L_RSVP='nuvora_v02_rsvps'
const L_WISH='nuvora_v02_wishes'

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || [] } catch { return [] } }
const write = (k,v) => localStorage.setItem(k,JSON.stringify(v))
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
const slugify = s => (s || 'undangan').toLowerCase().trim()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55) || `undangan-${Date.now()}`

async function uniqueSlug(base) {
  const root = slugify(base)
  if (!cloudEnabled) {
    const used = new Set(read(L_INV).map(x=>x.slug))
    let s=root, i=2; while(used.has(s)) s=`${root}-${i++}`; return s
  }
  let s=root, i=2
  while(true){
    const { data, error } = await supabase.from('invitations').select('id').eq('slug',s).maybeSingle()
    if(error) throw error
    if(!data) return s
    s=`${root}-${i++}`
  }
}

export async function listInvitations(ownerId){
  if(!cloudEnabled) return read(L_INV).filter(x=>x.owner_id===ownerId).sort((a,b)=>b.created_at.localeCompare(a.created_at))
  const {data,error}=await supabase.from('invitations').select('*').order('created_at',{ascending:false})
  if(error) throw error; return data || []
}
export async function getInvitation(id){
  if(!cloudEnabled) return read(L_INV).find(x=>x.id===id) || null
  const {data,error}=await supabase.from('invitations').select('*').eq('id',id).single()
  if(error) throw error; return data
}
export async function getPublicInvitation(slug){
  if(!cloudEnabled) return read(L_INV).find(x=>x.slug===slug && x.status==='published') || null
  const {data,error}=await supabase.from('invitations').select('*').eq('slug',slug).eq('status','published').maybeSingle()
  if(error) throw error; return data
}
export async function createInvitation(ownerId,input){
  const slug=await uniqueSlug(input.title)
  const row={
    owner_id:ownerId, slug, event_type:input.event_type || 'Pernikahan',
    title:input.title || 'Tanpa Judul', event_date:input.event_date || null,
    location:input.location || '', style:input.style || 'Ivory',
    accent:input.accent || '#a98861', cover_url:input.cover_url || '',
    description:input.description || '', theme_id:input.theme_id || null, content:input.content || {}, status:'draft'
  }
  if(!cloudEnabled){
    const now=new Date().toISOString(); const item={id:uid(),...row,created_at:now,updated_at:now}
    write(L_INV,[item,...read(L_INV)]); return item
  }
  const {data,error}=await supabase.from('invitations').insert(row).select().single()
  if(error) throw error; return data
}
export async function updateInvitation(id,patch){
  const clean={...patch,updated_at:new Date().toISOString()}
  if(!cloudEnabled){
    const arr=read(L_INV); const idx=arr.findIndex(x=>x.id===id); if(idx<0) throw new Error('Undangan tidak ditemukan')
    arr[idx]={...arr[idx],...clean}; write(L_INV,arr); return arr[idx]
  }
  const {data,error}=await supabase.from('invitations').update(clean).eq('id',id).select().single()
  if(error) throw error; return data
}
export async function deleteInvitation(id){
  if(!cloudEnabled){
    write(L_INV,read(L_INV).filter(x=>x.id!==id))
    write(L_GUEST,read(L_GUEST).filter(x=>x.invitation_id!==id))
    write(L_RSVP,read(L_RSVP).filter(x=>x.invitation_id!==id))
    write(L_WISH,read(L_WISH).filter(x=>x.invitation_id!==id))
    return
  }
  const {error}=await supabase.from('invitations').delete().eq('id',id); if(error) throw error
}
export async function uploadCover(ownerId, invitationId, file){
  if(!file) return ''
  if(!cloudEnabled){
    return await new Promise((resolve,reject)=>{
      const fr=new FileReader(); fr.onload=()=>resolve(fr.result); fr.onerror=reject; fr.readAsDataURL(file)
    })
  }
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase()
  const path=`${ownerId}/${invitationId}/cover-${Date.now()}.${ext}`
  const {error}=await supabase.storage.from('media').upload(path,file,{upsert:true,cacheControl:'3600'})
  if(error) throw error
  const {data}=supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}

export async function listGuests(ownerId, invitationId){
  if(!cloudEnabled) return read(L_GUEST).filter(x=>x.owner_id===ownerId && x.invitation_id===invitationId).sort((a,b)=>b.created_at.localeCompare(a.created_at))
  const {data,error}=await supabase.from('guests').select('*').eq('invitation_id',invitationId).order('created_at',{ascending:false})
  if(error) throw error; return data || []
}
export async function addGuest(ownerId, invitationId, input){
  const row={owner_id:ownerId,invitation_id:invitationId,name:input.name,group_name:input.group_name||'',phone:input.phone||'',guest_count:Number(input.guest_count||1)}
  if(!cloudEnabled){
    const item={id:uid(),token:uid(),...row,created_at:new Date().toISOString()}
    write(L_GUEST,[item,...read(L_GUEST)]); return item
  }
  const {data,error}=await supabase.from('guests').insert(row).select().single()
  if(error) throw error; return data
}
export async function deleteGuest(id){
  if(!cloudEnabled){ write(L_GUEST,read(L_GUEST).filter(x=>x.id!==id)); return }
  const {error}=await supabase.from('guests').delete().eq('id',id); if(error) throw error
}
export async function listRsvps(invitationId){
  if(!cloudEnabled) return read(L_RSVP).filter(x=>x.invitation_id===invitationId).sort((a,b)=>b.created_at.localeCompare(a.created_at))
  const {data,error}=await supabase.from('rsvps').select('*').eq('invitation_id',invitationId).order('created_at',{ascending:false})
  if(error) throw error; return data || []
}
export async function submitRsvp(invitationId,input){
  const row={invitation_id:invitationId,guest_name:input.guest_name,attendance:input.attendance,guest_count:Number(input.guest_count||1),message:input.message||''}
  if(!cloudEnabled){ const item={id:uid(),...row,created_at:new Date().toISOString()}; write(L_RSVP,[item,...read(L_RSVP)]); return item }
  const {data,error}=await supabase.from('rsvps').insert(row).select().single()
  if(error) throw error; return data
}
export async function listWishes(invitationId, publicMode=false){
  if(!cloudEnabled) return read(L_WISH).filter(x=>x.invitation_id===invitationId).sort((a,b)=>b.created_at.localeCompare(a.created_at))
  const {data,error}=await supabase.from('wishes').select('*').eq('invitation_id',invitationId).order('created_at',{ascending:false})
  if(error) throw error; return data || []
}
export async function submitWish(invitationId,input){
  const row={invitation_id:invitationId,guest_name:input.guest_name,message:input.message}
  if(!cloudEnabled){ const item={id:uid(),...row,created_at:new Date().toISOString()}; write(L_WISH,[item,...read(L_WISH)]); return item }
  const {data,error}=await supabase.from('wishes').insert(row).select().single()
  if(error) throw error; return data
}

export async function addGuestsBulk(ownerId, invitationId, rows){
  const clean = rows
    .filter(x=>String(x.name||'').trim())
    .map(x=>({
      owner_id:ownerId,
      invitation_id:invitationId,
      name:String(x.name).trim(),
      group_name:String(x.group_name||'').trim(),
      phone:String(x.phone||'').trim(),
      guest_count:Math.min(20,Math.max(1,Number(x.guest_count||1)))
    }))
  if(!clean.length) return []
  if(!cloudEnabled){
    const now=new Date().toISOString()
    const items=clean.map(row=>({id:uid(),token:uid(),checked_in_at:null,checked_in_by:null,...row,created_at:now}))
    write(L_GUEST,[...items,...read(L_GUEST)])
    return items
  }
  const {data,error}=await supabase.from('guests').insert(clean).select()
  if(error) throw error
  return data || []
}

export async function markGuestCheckedIn(ownerId, guestId, checked=true){
  const checked_at=checked?new Date().toISOString():null
  if(!cloudEnabled){
    const arr=read(L_GUEST),idx=arr.findIndex(x=>x.id===guestId && x.owner_id===ownerId)
    if(idx<0) throw new Error('Tamu tidak ditemukan')
    arr[idx]={...arr[idx],checked_in_at:checked_at,checked_in_by:checked?ownerId:null}
    write(L_GUEST,arr)
    return arr[idx]
  }
  const {data,error}=await supabase.from('guests')
    .update({checked_in_at:checked_at,checked_in_by:checked?ownerId:null})
    .eq('id',guestId).select().single()
  if(error) throw error
  return data
}

export async function checkInGuestByToken(ownerId, invitationId, token){
  if(!token) throw new Error('Token QR kosong')
  if(!cloudEnabled){
    const guest=read(L_GUEST).find(x=>x.owner_id===ownerId && x.invitation_id===invitationId && x.token===token)
    if(!guest) throw new Error('QR tamu tidak ditemukan untuk undangan ini')
    return markGuestCheckedIn(ownerId,guest.id,true)
  }
  const {data:guest,error}=await supabase.from('guests')
    .select('*').eq('invitation_id',invitationId).eq('token',token).maybeSingle()
  if(error) throw error
  if(!guest) throw new Error('QR tamu tidak ditemukan untuk undangan ini')
  return markGuestCheckedIn(ownerId,guest.id,true)
}

export function buildPublicLink(slug, guestName='', guestToken=''){
  const u=new URL(location.href)
  u.search=''
  u.hash=''
  u.searchParams.set('invite',slug)
  if(guestName) u.searchParams.set('to',guestName)
  if(guestToken) u.searchParams.set('token',guestToken)
  return u.toString()
}
