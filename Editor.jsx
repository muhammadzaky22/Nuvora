import {useMemo,useState} from 'react'
import {createInvitation,updateInvitation} from '../lib/repo'
import {uploadInvitationImage} from '../lib/media'

const eventTypes=['Pernikahan','Aqiqah','Khitanan','Ulang Tahun','Wisuda','Tasyakuran','Event','Peresmian']
const styles=[
 ['Ivory','#f4eee7','#8a6c4a'],['Noir','#17151b','#d5b27c'],['Sage','#dfe6dc','#5e705d'],
 ['Rose','#ead7d5','#976d71'],['Ocean','#dbe6ec','#536b78'],['Terracotta','#ead6cb','#985f49']
]
const defaultContent={
 opening:'Dengan penuh kebahagiaan, kami mengundang Anda untuk hadir di hari istimewa kami.',
 maps_url:'',music_url:'',streaming_url:'',dress_code:'',closing:'Terima kasih atas doa dan kehadirannya.',
 schedule:[{time:'08:00',label:'Acara Utama'},{time:'11:00',label:'Ramah Tamah'}],
 story_title:'Cerita Kami',story_text:'',
 gift:{bank:'',account:'',holder:''},
 gallery:[]
}
const mergeContent=c=>({...defaultContent,...(c||{}),gift:{...defaultContent.gift,...(c?.gift||{})},schedule:Array.isArray(c?.schedule)&&c.schedule.length?c.schedule:defaultContent.schedule,gallery:Array.isArray(c?.gallery)?c.gallery:[]})

export default function Editor({user,existing,presetTheme,onDone,onCancel}){
 const initialContent=mergeContent(existing?.content)
 const[data,setData]=useState(existing?{
   event_type:existing.event_type,title:existing.title,event_date:existing.event_date||'',location:existing.location||'',
   style:existing.style,accent:existing.accent,cover_url:existing.cover_url||'',description:existing.description||'',
   theme_id:existing.theme_id||null,content:initialContent
 }:{event_type:'Pernikahan',title:'',event_date:'',location:'',style:presetTheme?.name||'Ivory',accent:presetTheme?.accent||presetTheme?.config?.accent||'#8a6c4a',cover_url:'',description:'',theme_id:presetTheme?.id||null,content:defaultContent})

 const[tab,setTab]=useState('basic'),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[pendingFiles,setPendingFiles]=useState([]),[pendingCover,setPendingCover]=useState(null)
 const style=useMemo(()=>styles.find(x=>x[0]===data.style)||[data.style,presetTheme?.background||presetTheme?.config?.background||'#f4eee7',data.accent],[data.style,data.accent,presetTheme])
 const set=(k,v)=>setData(p=>({...p,[k]:v}))
 const setContent=(k,v)=>setData(p=>({...p,content:{...p.content,[k]:v}}))
 const setGift=(k,v)=>setData(p=>({...p,content:{...p.content,gift:{...p.content.gift,[k]:v}}}))

 const updateSchedule=(i,k,v)=>{
   const next=[...data.content.schedule];next[i]={...next[i],[k]:v};setContent('schedule',next)
 }
 const addSchedule=()=>setContent('schedule',[...data.content.schedule,{time:'',label:'Acara'}])
 const removeSchedule=i=>setContent('schedule',data.content.schedule.filter((_,x)=>x!==i))
 const removeGallery=i=>setContent('gallery',data.content.gallery.filter((_,x)=>x!==i))

 const save=async()=>{
  if(!data.title.trim()){setMsg('Judul undangan wajib diisi.');return}
  try{
   setBusy(true);setMsg('')
   let inv=existing?await updateInvitation(existing.id,data):await createInvitation(user.id,data)
   if(pendingCover){
     const coverUrl=await uploadInvitationImage(user.id,inv.id,pendingCover,'cover')
     inv=await updateInvitation(inv.id,{cover_url:coverUrl})
   }
   let gallery=[...(data.content.gallery||[])]
   for(const f of pendingFiles){
     const url=await uploadInvitationImage(user.id,inv.id,f,'gallery')
     gallery.push(url)
   }
   if(pendingFiles.length){
     inv=await updateInvitation(inv.id,{content:{...data.content,gallery}})
   }
   onDone(inv)
  }catch(e){setMsg(e.message||'Gagal menyimpan.')}finally{setBusy(false)}
 }

 const previewBg=existing?.cover_url
   ?`linear-gradient(rgba(20,15,15,.32),rgba(20,15,15,.55)),url(${existing.cover_url})`
   :style[1]

 return <main className="content-page">
  <header className="wizard-head"><button className="round-button" onClick={onCancel}>←</button><div><p className="micro">{existing?'EDIT':'BUAT'} UNDANGAN</p><h2>Editor lengkap</h2></div></header>

  <nav className="editor-tabs">{[
   ['basic','Dasar'],['event','Acara'],['story','Cerita'],['gallery','Galeri'],['gift','Gift'],['style','Style']
  ].map(([id,l])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{l}</button>)}</nav>

  <div className="editor-grid">
   <section className="panel form-stack">
    {tab==='basic'&&<>
      <label>Jenis acara<select value={data.event_type} onChange={e=>set('event_type',e.target.value)}>{eventTypes.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Judul<input value={data.title} onChange={e=>set('title',e.target.value)} placeholder="Contoh: Dimas & Alya"/></label>
      <label>Tanggal<input type="date" value={data.event_date} onChange={e=>set('event_date',e.target.value)}/></label>
      <label>Lokasi<input value={data.location} onChange={e=>set('location',e.target.value)} placeholder="Gedung / kota"/></label>
      <label>Foto cover<input type="file" accept="image/*" onChange={e=>setPendingCover(e.target.files?.[0]||null)}/></label>
      {pendingCover&&<div className="notice">Cover baru: {pendingCover.name}</div>}
      <label>Teks pembuka<textarea value={data.content.opening} onChange={e=>setContent('opening',e.target.value)}/></label>
      <label>Google Maps URL<input value={data.content.maps_url} onChange={e=>setContent('maps_url',e.target.value)} placeholder="https://maps.google.com/..."/></label>
      <label>Music URL<input value={data.content.music_url} onChange={e=>setContent('music_url',e.target.value)} placeholder="Link MP3/OGG publik"/></label>
      <label>Live Streaming URL<input value={data.content.streaming_url} onChange={e=>setContent('streaming_url',e.target.value)} placeholder="YouTube / Zoom / lainnya"/></label>
      <label>Dress code<input value={data.content.dress_code} onChange={e=>setContent('dress_code',e.target.value)} placeholder="Ivory, Sage, Champagne"/></label>
      <label>Pesan penutup<textarea value={data.content.closing} onChange={e=>setContent('closing',e.target.value)}/></label>
    </>}

    {tab==='event'&&<>
      <div className="section-inline"><h3>Rundown acara</h3><button onClick={addSchedule}>+ Tambah</button></div>
      {data.content.schedule.map((s,i)=><div className="schedule-edit" key={i}><input type="time" value={s.time} onChange={e=>updateSchedule(i,'time',e.target.value)}/><input value={s.label} onChange={e=>updateSchedule(i,'label',e.target.value)} placeholder="Nama acara"/><button className="danger-link" onClick={()=>removeSchedule(i)}>×</button></div>)}
    </>}

    {tab==='story'&&<>
      <label>Judul cerita<input value={data.content.story_title} onChange={e=>setContent('story_title',e.target.value)}/></label>
      <label>Cerita / Love Story<textarea className="tall-textarea" value={data.content.story_text} onChange={e=>setContent('story_text',e.target.value)} placeholder="Tulis perjalanan atau cerita acara..."/></label>
    </>}

    {tab==='gallery'&&<>
      <label>Tambah foto<input type="file" multiple accept="image/*" onChange={e=>setPendingFiles([...e.target.files].slice(0,10))}/></label>
      {pendingFiles.length>0&&<div className="notice">{pendingFiles.length} foto baru akan diupload saat disimpan.</div>}
      <div className="gallery-manager">{data.content.gallery.length===0?<p className="muted">Belum ada galeri tersimpan.</p>:data.content.gallery.map((url,i)=><div key={url+i}><img src={url}/><button onClick={()=>removeGallery(i)}>Hapus</button></div>)}</div>
    </>}

    {tab==='gift'&&<>
      <label>Bank / e-wallet<input value={data.content.gift.bank} onChange={e=>setGift('bank',e.target.value)} placeholder="Contoh: Bank Mandiri"/></label>
      <label>Nomor rekening<input value={data.content.gift.account} onChange={e=>setGift('account',e.target.value)}/></label>
      <label>Atas nama<input value={data.content.gift.holder} onChange={e=>setGift('holder',e.target.value)}/></label>
    </>}

    {tab==='style'&&<>
      <label>Style<select value={data.style} onChange={e=>{const s=styles.find(x=>x[0]===e.target.value);if(s)setData(p=>({...p,style:s[0],accent:s[2]}));else set('style',e.target.value)}}>{presetTheme&&!styles.some(x=>x[0]===presetTheme.name)&&<option value={presetTheme.name}>{presetTheme.name} (Katalog)</option>}{styles.map(x=><option key={x[0]}>{x[0]}</option>)}</select></label>
      <label>Warna aksen<input type="color" value={data.accent} onChange={e=>set('accent',e.target.value)}/></label>
      <p className="muted">Galeri otomatis dikompres ke WEBP agar lebih ringan.</p>
    </>}

    {msg&&<div className="notice">{msg}</div>}
    <button className="primary wide" disabled={busy} onClick={save}>{busy?'Menyimpan...':existing?'Simpan Perubahan':'Simpan Draft'}</button>
   </section>

   <section className="preview-side">
    <div className="preview-phone" style={{background:previewBg,backgroundSize:'cover',backgroundPosition:'center'}}>
      <div className="preview-ornament" style={{borderColor:data.accent}}/>
      <small>{data.event_type}</small><h2>{data.title||'Nama Acara'}</h2><i style={{background:data.accent}}/><p>{data.event_date||'Tanggal belum diisi'}</p><p>{data.location||'Lokasi belum diisi'}</p>
    </div>
    <div className="preview-summary panel"><b>{data.content.schedule.length}</b><span>Rundown</span><b>{data.content.gallery.length+pendingFiles.length}</b><span>Foto</span><b>{data.content.gift.account?'Aktif':'—'}</b><span>Gift</span></div>
   </section>
  </div>
 </main>
}
