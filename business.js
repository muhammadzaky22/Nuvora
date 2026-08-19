import { cloudEnabled, supabase } from './supabase'

const L_THEMES='nuvora_v04_themes'
const L_PLANS='nuvora_v04_plans'
const L_ORDERS='nuvora_v04_orders'
const L_PROFILE='nuvora_v04_profiles'
const L_MESSAGES='nuvora_v05_order_messages'
const L_PAYMENTS='nuvora_v05_payments'
const L_SETTINGS='nuvora_v05_settings'
const L_NOTIFICATIONS='nuvora_v06_notifications'
const L_REVIEWS='nuvora_v06_design_reviews'
const L_INV='nuvora_v02_invitations'
const L_PRODUCTION='nuvora_v07_production'

const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`
const read=k=>{try{return JSON.parse(localStorage.getItem(k))||[]}catch{return []}}
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v))
const slugify=s=>(s||'theme').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)


function notificationCategory(type){
  if(['order_new','order_status','order_assignment'].includes(type)) return 'orders'
  if(['payment_new','payment_review'].includes(type)) return 'payments'
  if(type==='order_message') return 'messages'
  if(['design_review','design_response'].includes(type)) return 'design'
  if(type==='production_update') return 'production'
  return ''
}
function localNotify(userId,type,title,message,entityType='',entityId=''){
  if(!userId)return
  const profile=read(L_PROFILE).find(x=>x.id===userId)
  const category=notificationCategory(type)
  if(category && profile?.notification_preferences?.[category]===false) return
  const item={id:uid(),user_id:userId,type,title,message,entity_type:entityType,entity_id:entityId,read_at:null,created_at:new Date().toISOString()}
  write(L_NOTIFICATIONS,[item,...read(L_NOTIFICATIONS)].slice(0,500))
  return item
}
function localNotifyAdmins(type,title,message,entityType='',entityId=''){
  for(const p of read(L_PROFILE).filter(x=>x.role==='admin')) localNotify(p.id,type,title,message,entityType,entityId)
}

const DEFAULT_THEMES=[
 {name:'Ivory Atelier',category:'Elegant',accent:'#9b7c58',background:'#f4eee7',featured:true},
 {name:'Noir Editorial',category:'Modern',accent:'#d2b07a',background:'#17151b',featured:true},
 {name:'Sage Garden',category:'Nature',accent:'#62735d',background:'#dfe6dc',featured:true},
 {name:'Rose Amour',category:'Floral',accent:'#9a6d72',background:'#ead7d5',featured:false},
 {name:'Ocean Clean',category:'Minimalist',accent:'#557181',background:'#dbe6ec',featured:false},
 {name:'Terracotta Vows',category:'Rustic',accent:'#985f49',background:'#ead6cb',featured:false},
]
const DEFAULT_PLANS=[
 {code:'essential',name:'Essential',price:149000,description:'Undangan sederhana dan elegan',features:['1 tema','Nama tamu personal','Countdown','Maps','Galeri','Gift'],sort_order:1},
 {code:'premium',name:'Premium',price:249000,description:'Untuk kebutuhan acara lengkap',features:['Semua Essential','RSVP','Ucapan','Guest Management','Love Story','2x revisi'],sort_order:2},
 {code:'signature',name:'Signature',price:399000,description:'Lebih custom dan premium',features:['Semua Premium','Layout custom','QR Pass','Check-in','3x revisi'],sort_order:3},
]

function ensureLocalSeeds(){
 if(!read(L_THEMES).length){
  const now=new Date().toISOString()
  write(L_THEMES,DEFAULT_THEMES.map((t,i)=>({id:uid(),slug:slugify(t.name),preview_url:'',status:'active',sort_order:i+1,config:{background:t.background,accent:t.accent},created_at:now,updated_at:now,...t})))
 }
 if(!read(L_PLANS).length){
  const now=new Date().toISOString()
  write(L_PLANS,DEFAULT_PLANS.map(p=>({id:uid(),active:true,created_at:now,updated_at:now,...p})))
 }
}
ensureLocalSeeds()

export async function getProfile(user){
 if(!user)return null
 if(!cloudEnabled){
  const profiles=read(L_PROFILE)
  let p=profiles.find(x=>x.id===user.id)
  if(!p){
   p={id:user.id,full_name:user.user_metadata?.full_name||'',role:(user.email||'').toLowerCase().startsWith('admin@')?'admin':'customer'}
   write(L_PROFILE,[...profiles,p])
  }
  return p
 }
 const {data,error}=await supabase.from('profiles').select('*').eq('id',user.id).single()
 if(error)throw error
 return data
}

export async function listThemes({all=false}={}){
 if(!cloudEnabled){
  const rows=read(L_THEMES)
  return rows.filter(x=>all||x.status==='active').sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
 }
 let q=supabase.from('themes').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false})
 if(!all)q=q.eq('status','active')
 const {data,error}=await q
 if(error)throw error
 return data||[]
}

export async function saveTheme(input){
 const row={
  name:String(input.name||'').trim(),
  slug:slugify(input.slug||input.name),
  category:String(input.category||'General').trim(),
  description:String(input.description||'').trim(),
  preview_url:String(input.preview_url||'').trim(),
  accent:input.accent||'#a98861',
  background:input.background||'#f4eee7',
  featured:Boolean(input.featured),
  status:input.status||'active',
  sort_order:Number(input.sort_order||0),
  config:{background:input.background||'#f4eee7',accent:input.accent||'#a98861'}
 }
 if(!row.name)throw new Error('Nama tema wajib diisi')
 if(!cloudEnabled){
  const arr=read(L_THEMES),now=new Date().toISOString()
  if(input.id){
   const i=arr.findIndex(x=>x.id===input.id)
   if(i<0)throw new Error('Tema tidak ditemukan')
   arr[i]={...arr[i],...row,updated_at:now};write(L_THEMES,arr);return arr[i]
  }
  const item={id:uid(),...row,created_at:now,updated_at:now}
  write(L_THEMES,[...arr,item]);return item
 }
 if(input.id){
  const {data,error}=await supabase.from('themes').update(row).eq('id',input.id).select().single()
  if(error)throw error;return data
 }
 const {data,error}=await supabase.from('themes').insert(row).select().single()
 if(error)throw error;return data
}

export async function deleteTheme(id){
 if(!cloudEnabled){write(L_THEMES,read(L_THEMES).filter(x=>x.id!==id));return}
 const {error}=await supabase.from('themes').delete().eq('id',id)
 if(error)throw error
}

export async function listPlans({all=false}={}){
 if(!cloudEnabled){
  const rows=read(L_PLANS)
  return rows.filter(x=>all||x.active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
 }
 let q=supabase.from('plans').select('*').order('sort_order',{ascending:true})
 if(!all)q=q.eq('active',true)
 const {data,error}=await q
 if(error)throw error
 return data||[]
}

export async function savePlan(input){
 const row={
  code:slugify(input.code||input.name),
  name:String(input.name||'').trim(),
  price:Number(input.price||0),
  description:String(input.description||'').trim(),
  features:Array.isArray(input.features)?input.features:String(input.features||'').split('\n').map(x=>x.trim()).filter(Boolean),
  active:input.active!==false,
  sort_order:Number(input.sort_order||0)
 }
 if(!row.name)throw new Error('Nama paket wajib diisi')
 if(!cloudEnabled){
  const arr=read(L_PLANS),now=new Date().toISOString()
  if(input.id){const i=arr.findIndex(x=>x.id===input.id);if(i<0)throw new Error('Paket tidak ditemukan');arr[i]={...arr[i],...row,updated_at:now};write(L_PLANS,arr);return arr[i]}
  const item={id:uid(),...row,created_at:now,updated_at:now};write(L_PLANS,[...arr,item]);return item
 }
 if(input.id){
  const {data,error}=await supabase.from('plans').update(row).eq('id',input.id).select().single()
  if(error)throw error;return data
 }
 const {data,error}=await supabase.from('plans').insert(row).select().single()
 if(error)throw error;return data
}

export async function createOrder(userId,input){
 const row={
  customer_id:userId,
  invitation_id:input.invitation_id||null,
  theme_id:input.theme_id||null,
  plan_id:input.plan_id||null,
  status:'pending',
  amount:Number(input.amount||0),
  notes:String(input.notes||'').trim()
 }
 if(!cloudEnabled){
  const item={id:uid(),order_no:`NV-${String(Date.now()).slice(-8)}`,...row,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}
  write(L_ORDERS,[item,...read(L_ORDERS)]);return item
 }
 const {data,error}=await supabase.rpc('create_order',{
  p_theme_id:row.theme_id,
  p_plan_id:row.plan_id,
  p_invitation_id:row.invitation_id,
  p_notes:row.notes
 })
 if(error)throw error
 return data
}

export async function listMyOrders(userId){
 if(!cloudEnabled){
  const themes=read(L_THEMES),plans=read(L_PLANS)
  return read(L_ORDERS).filter(x=>x.customer_id===userId)
   .map(o=>({...o,themes:themes.find(t=>t.id===o.theme_id)||null,plans:plans.find(p=>p.id===o.plan_id)||null}))
   .sort((a,b)=>b.created_at.localeCompare(a.created_at))
 }
 const {data,error}=await supabase.from('orders').select('*,themes(name,category),plans(name,price)').order('created_at',{ascending:false})
 if(error)throw error;return data||[]
}

export async function listAllOrders(){
 if(!cloudEnabled){
  const themes=read(L_THEMES),plans=read(L_PLANS),profiles=read(L_PROFILE)
  return read(L_ORDERS)
   .map(o=>({...o,themes:themes.find(t=>t.id===o.theme_id)||null,plans:plans.find(p=>p.id===o.plan_id)||null,profiles:profiles.find(p=>p.id===o.customer_id)||null}))
   .sort((a,b)=>b.created_at.localeCompare(a.created_at))
 }
 const {data,error}=await supabase.from('orders').select('*,themes(name,category),plans(name,price),profiles!orders_customer_id_fkey(full_name)').order('created_at',{ascending:false})
 if(error)throw error;return data||[]
}

export async function updateOrderStatus(id,status){
 const allowed=['pending','confirmed','processing','completed','cancelled']
 if(!allowed.includes(status))throw new Error('Status order tidak valid')
 if(!cloudEnabled){
  const arr=read(L_ORDERS),i=arr.findIndex(x=>x.id===id);if(i<0)throw new Error('Order tidak ditemukan')
  arr[i]={...arr[i],status,updated_at:new Date().toISOString()};write(L_ORDERS,arr)
  localNotify(arr[i].customer_id,'order_status','Status order diperbarui',`Order ${arr[i].order_no||''} sekarang ${status}.`,'order',id)
  return arr[i]
 }
 const {data,error}=await supabase.rpc('update_order_status',{p_order_id:id,p_status:status})
 if(error)throw error
 return data
}


export async function listOrderMessages(userId,orderId){
  if(!cloudEnabled){
    return read(L_MESSAGES).filter(x=>x.order_id===orderId).sort((a,b)=>a.created_at.localeCompare(b.created_at))
  }
  const {data,error}=await supabase.from('order_messages').select('*').eq('order_id',orderId).order('created_at',{ascending:true})
  if(error) throw error
  return data||[]
}

export async function addOrderMessage(userId,orderId,message){
  const text=String(message||'').trim()
  if(!text) throw new Error('Pesan revisi tidak boleh kosong')
  if(!cloudEnabled){
    const profile=(read(L_PROFILE).find(x=>x.id===userId)||{role:'customer'})
    const item={id:uid(),order_id:orderId,author_id:userId,author_role:profile.role,message:text,created_at:new Date().toISOString()}
    write(L_MESSAGES,[...read(L_MESSAGES),item])
    const order=read(L_ORDERS).find(x=>x.id===orderId)
    if(profile.role==='admin') localNotify(order?.customer_id,'order_message','Pesan baru dari admin',text.slice(0,120),'order',orderId)
    else localNotifyAdmins('order_message','Pesan baru dari pelanggan',text.slice(0,120),'order',orderId)
    return item
  }
  const {data,error}=await supabase.rpc('add_order_message',{p_order_id:orderId,p_message:text})
  if(error) throw error
  return data
}

export async function listMyPayments(userId){
  if(!cloudEnabled){
    return read(L_PAYMENTS).filter(x=>x.customer_id===userId).sort((a,b)=>b.created_at.localeCompare(a.created_at))
  }
  const {data,error}=await supabase.from('payments').select('*').order('created_at',{ascending:false})
  if(error) throw error
  return data||[]
}

export async function listAllPayments(){
  if(!cloudEnabled){
    const orders=read(L_ORDERS),profiles=read(L_PROFILE)
    return read(L_PAYMENTS)
      .map(p=>({...p,orders:orders.find(o=>o.id===p.order_id)||null,profiles:profiles.find(x=>x.id===p.customer_id)||null}))
      .sort((a,b)=>b.created_at.localeCompare(a.created_at))
  }
  const {data,error}=await supabase.from('payments')
    .select('*,orders(order_no,amount,status),profiles!payments_customer_id_fkey(full_name)')
    .order('created_at',{ascending:false})
  if(error) throw error
  return data||[]
}

export async function submitPayment(userId,orderId,method,proofPath){
  const payMethod=String(method||'Transfer Bank').trim()
  if(!cloudEnabled){
    const order=read(L_ORDERS).find(x=>x.id===orderId && x.customer_id===userId)
    if(!order) throw new Error('Order tidak ditemukan')
    const item={id:uid(),order_id:orderId,customer_id:userId,amount:Number(order.amount||0),method:payMethod,proof_path:proofPath,status:'pending',review_note:'',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}
    write(L_PAYMENTS,[item,...read(L_PAYMENTS)])
    localNotifyAdmins('payment_new','Bukti pembayaran baru',`Bukti untuk ${order.order_no||'order'} menunggu review.`,'payment',item.id)
    return item
  }
  const {data,error}=await supabase.rpc('submit_payment',{p_order_id:orderId,p_method:payMethod,p_proof_path:proofPath})
  if(error) throw error
  return data
}

export async function reviewPayment(paymentId,status,note=''){
  if(!['approved','rejected'].includes(status)) throw new Error('Status review tidak valid')
  if(!cloudEnabled){
    const arr=read(L_PAYMENTS),i=arr.findIndex(x=>x.id===paymentId)
    if(i<0) throw new Error('Pembayaran tidak ditemukan')
    arr[i]={...arr[i],status,review_note:note,updated_at:new Date().toISOString()}
    write(L_PAYMENTS,arr)
    const order=read(L_ORDERS).find(x=>x.id===arr[i].order_id)
    if(status==='approved'){
      const orders=read(L_ORDERS),oi=orders.findIndex(x=>x.id===arr[i].order_id)
      if(oi>=0 && orders[oi].status==='pending'){orders[oi]={...orders[oi],status:'confirmed',updated_at:new Date().toISOString()};write(L_ORDERS,orders)}
    }
    localNotify(arr[i].customer_id,'payment_review',status==='approved'?'Pembayaran diterima':'Pembayaran perlu diperbaiki',note||`Pembayaran ${order?.order_no||''} ${status}.`,'payment',arr[i].id)
    return arr[i]
  }
  const {data,error}=await supabase.rpc('review_payment',{p_payment_id:paymentId,p_status:status,p_note:String(note||'')})
  if(error) throw error
  return data
}


export async function getPaymentSettings(){
  const fallback={bank_name:'',account_number:'',account_holder:'',qris_image_url:'',payment_note:'Silakan transfer sesuai total invoice lalu upload bukti pembayaran.'}
  if(!cloudEnabled){
    const found=read(L_SETTINGS).find(x=>x.key==='payment')
    return {...fallback,...(found?.value||{})}
  }
  const {data,error}=await supabase.from('platform_settings').select('value').eq('key','payment').maybeSingle()
  if(error) throw error
  return {...fallback,...(data?.value||{})}
}

export async function savePaymentSettings(value){
  const clean={
    bank_name:String(value.bank_name||'').trim(),
    account_number:String(value.account_number||'').trim(),
    account_holder:String(value.account_holder||'').trim(),
    qris_image_url:String(value.qris_image_url||'').trim(),
    payment_note:String(value.payment_note||'').trim()
  }
  if(!cloudEnabled){
    const arr=read(L_SETTINGS),i=arr.findIndex(x=>x.key==='payment')
    const row={key:'payment',value:clean,updated_at:new Date().toISOString()}
    if(i>=0)arr[i]=row;else arr.push(row)
    write(L_SETTINGS,arr);return row
  }
  const {data,error}=await supabase.from('platform_settings').upsert({key:'payment',value:clean,updated_at:new Date().toISOString()},{onConflict:'key'}).select().single()
  if(error) throw error
  return data
}


export async function listNotifications(userId){
  if(!cloudEnabled) return read(L_NOTIFICATIONS).filter(x=>x.user_id===userId).sort((a,b)=>b.created_at.localeCompare(a.created_at))
  const {data,error}=await supabase.from('notifications').select('*').order('created_at',{ascending:false}).limit(200)
  if(error) throw error
  return data||[]
}

export async function markNotificationRead(id,read=true){
  const when=read?new Date().toISOString():null
  if(!cloudEnabled){
    const arr=read(L_NOTIFICATIONS),i=arr.findIndex(x=>x.id===id)
    if(i>=0){arr[i]={...arr[i],read_at:when};write(L_NOTIFICATIONS,arr);return arr[i]}
    return null
  }
  const {data,error}=await supabase.from('notifications').update({read_at:when}).eq('id',id).select().single()
  if(error) throw error
  return data
}

export async function markAllNotificationsRead(userId){
  const when=new Date().toISOString()
  if(!cloudEnabled){
    const arr=read(L_NOTIFICATIONS).map(x=>x.user_id===userId?{...x,read_at:when}:x)
    write(L_NOTIFICATIONS,arr);return
  }
  const {error}=await supabase.from('notifications').update({read_at:when}).is('read_at',null)
  if(error) throw error
}

export async function listAllInvitationsAdmin(){
  if(!cloudEnabled) return read(L_INV).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))
  const {data,error}=await supabase.from('invitations').select('id,owner_id,title,event_type,event_date,status,slug,theme_id,created_at').order('created_at',{ascending:false})
  if(error) throw error
  return data||[]
}

export async function assignOrderInvitation(orderId,invitationId){
  if(!cloudEnabled){
    const orders=read(L_ORDERS),oi=orders.findIndex(x=>x.id===orderId)
    if(oi<0) throw new Error('Order tidak ditemukan')
    const inv=read(L_INV).find(x=>x.id===invitationId)
    if(!inv||inv.owner_id!==orders[oi].customer_id) throw new Error('Undangan harus milik pelanggan order ini')
    orders[oi]={...orders[oi],invitation_id:invitationId,updated_at:new Date().toISOString()}
    write(L_ORDERS,orders)
    localNotify(orders[oi].customer_id,'order_assignment','Project dihubungkan',`Order ${orders[oi].order_no||''} sudah dihubungkan ke project ${inv.title}.`,'order',orderId)
    return orders[oi]
  }
  const {data,error}=await supabase.rpc('assign_order_invitation',{p_order_id:orderId,p_invitation_id:invitationId})
  if(error) throw error
  return data
}

export async function listDesignReviews(userId,{all=false}={}){
  if(!cloudEnabled){
    const orders=read(L_ORDERS)
    return read(L_REVIEWS)
      .filter(r=>all||orders.some(o=>o.id===r.order_id&&o.customer_id===userId))
      .sort((a,b)=>b.created_at.localeCompare(a.created_at))
  }
  const {data,error}=await supabase.from('design_reviews')
    .select('*,orders(order_no,customer_id,invitation_id,status),invitations(title,slug,status)')
    .order('created_at',{ascending:false})
  if(error) throw error
  return data||[]
}

export async function createDesignReview(adminId,orderId,note=''){
  if(!cloudEnabled){
    const order=read(L_ORDERS).find(x=>x.id===orderId)
    if(!order?.invitation_id) throw new Error('Hubungkan order ke project undangan dulu')
    const versions=read(L_REVIEWS).filter(x=>x.order_id===orderId).map(x=>Number(x.version||0))
    const item={id:uid(),order_id:orderId,invitation_id:order.invitation_id,version:(Math.max(0,...versions)+1),status:'pending',admin_note:String(note||''),customer_note:'',created_by:adminId,responded_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}
    write(L_REVIEWS,[item,...read(L_REVIEWS)])
    localNotify(order.customer_id,'design_review','Desain siap direview',`Versi ${item.version} dari ${order.order_no||'order'} menunggu persetujuan.`,'design_review',item.id)
    return item
  }
  const {data,error}=await supabase.rpc('create_design_review',{p_order_id:orderId,p_note:String(note||'')})
  if(error) throw error
  return data
}

export async function respondDesignReview(userId,reviewId,status,note=''){
  if(!['approved','changes_requested'].includes(status)) throw new Error('Respons tidak valid')
  if(!cloudEnabled){
    const arr=read(L_REVIEWS),i=arr.findIndex(x=>x.id===reviewId)
    if(i<0) throw new Error('Review tidak ditemukan')
    const order=read(L_ORDERS).find(x=>x.id===arr[i].order_id)
    if(order?.customer_id!==userId) throw new Error('Tidak diizinkan')
    arr[i]={...arr[i],status,customer_note:String(note||''),responded_at:new Date().toISOString(),updated_at:new Date().toISOString()}
    write(L_REVIEWS,arr)
    localNotifyAdmins('design_response',status==='approved'?'Desain disetujui':'Perubahan desain diminta',`${order?.order_no||'Order'}: ${note||status}`,'design_review',reviewId)
    return arr[i]
  }
  const {data,error}=await supabase.rpc('respond_design_review',{p_review_id:reviewId,p_status:status,p_note:String(note||'')})
  if(error) throw error
  return data
}


export const PRODUCTION_STAGES=[
  ['brief_received','Brief Masuk'],
  ['designing','Desain Dikerjakan'],
  ['review','Menunggu Review'],
  ['revision','Revisi'],
  ['finalizing','Finalisasi'],
  ['published','Dipublish'],
  ['completed','Selesai']
]

export async function listProductionEvents(userId,orderId,{all=false}={}){
  if(!cloudEnabled){
    const orders=read(L_ORDERS)
    const order=orders.find(x=>x.id===orderId)
    if(!order) return []
    if(!all && order.customer_id!==userId) throw new Error('Tidak diizinkan')
    return read(L_PRODUCTION).filter(x=>x.order_id===orderId).sort((a,b)=>a.created_at.localeCompare(b.created_at))
  }
  const {data,error}=await supabase.from('production_events').select('*').eq('order_id',orderId).order('created_at',{ascending:true})
  if(error) throw error
  return data||[]
}

export async function addProductionEvent(adminId,orderId,stage,note=''){
  const allowed=PRODUCTION_STAGES.map(x=>x[0])
  if(!allowed.includes(stage)) throw new Error('Tahap produksi tidak valid')
  if(!cloudEnabled){
    const admin=read(L_PROFILE).find(x=>x.id===adminId)
    if(admin?.role!=='admin') throw new Error('Admin only')
    const order=read(L_ORDERS).find(x=>x.id===orderId)
    if(!order) throw new Error('Order tidak ditemukan')
    const item={id:uid(),order_id:orderId,stage,note:String(note||''),created_by:adminId,created_at:new Date().toISOString()}
    write(L_PRODUCTION,[...read(L_PRODUCTION),item])
    const orders=read(L_ORDERS),oi=orders.findIndex(x=>x.id===orderId)
    if(oi>=0){orders[oi]={...orders[oi],updated_at:new Date().toISOString()};write(L_ORDERS,orders)}
    localNotify(order.customer_id,'production_update','Tahap produksi diperbarui',`${order.order_no||'Order'}: ${PRODUCTION_STAGES.find(x=>x[0]===stage)?.[1]||stage}`,'order',orderId)
    return item
  }
  const {data,error}=await supabase.rpc('add_production_event',{p_order_id:orderId,p_stage:stage,p_note:String(note||'')})
  if(error) throw error
  return data
}

export async function getNotificationPreferences(userId){
  const fallback={orders:true,payments:true,messages:true,design:true,production:true}
  if(!cloudEnabled){
    const p=read(L_PROFILE).find(x=>x.id===userId)
    return {...fallback,...(p?.notification_preferences||{})}
  }
  const {data,error}=await supabase.from('profiles').select('notification_preferences').eq('id',userId).single()
  if(error) throw error
  return {...fallback,...(data?.notification_preferences||{})}
}

export async function updateNotificationPreferences(userId,prefs){
  const clean={
    orders:prefs.orders!==false,
    payments:prefs.payments!==false,
    messages:prefs.messages!==false,
    design:prefs.design!==false,
    production:prefs.production!==false
  }
  if(!cloudEnabled){
    const arr=read(L_PROFILE),i=arr.findIndex(x=>x.id===userId)
    if(i<0) throw new Error('Profile tidak ditemukan')
    arr[i]={...arr[i],notification_preferences:clean}
    write(L_PROFILE,arr)
    return clean
  }
  const {data,error}=await supabase.rpc('update_notification_preferences',{p_preferences:clean})
  if(error) throw error
  return data
}
