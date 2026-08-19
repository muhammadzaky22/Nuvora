import {useEffect,useState} from 'react'
import {addGuest,addGuestsBulk,deleteGuest,listGuests,listRsvps,markGuestCheckedIn} from '../lib/repo'
import {downloadGuestTemplate,exportGuestsWorkbook,parseGuestWorkbook} from '../lib/excel'
import GuestPass from '../components/GuestPass'

export default function Guests({user,invitations,initialInvitation}){
 const[selected,setSelected]=useState(initialInvitation?.id||invitations[0]?.id||'')
 const[guests,setGuests]=useState([]),[rsvps,setRsvps]=useState([])
 const[form,setForm]=useState({name:'',group_name:'',phone:'',guest_count:1})
 const[busy,setBusy]=useState(false),[passGuest,setPassGuest]=useState(null),[search,setSearch]=useState('')
 const inv=invitations.find(x=>x.id===selected)

 const load=async()=>{if(!selected){setGuests([]);setRsvps([]);return}try{const[g,r]=await Promise.all([listGuests(user.id,selected),listRsvps(selected)]);setGuests(g);setRsvps(r)}catch(e){alert(e.message)}}
 useEffect(()=>{load()},[selected])

 const add=async()=>{if(!form.name.trim())return alert('Nama tamu wajib');try{setBusy(true);await addGuest(user.id,selected,form);setForm({name:'',group_name:'',phone:'',guest_count:1});await load()}catch(e){alert(e.message)}finally{setBusy(false)}}

 const importExcel=async(file)=>{
  if(!file||!selected)return
  try{
   setBusy(true)
   const rows=await parseGuestWorkbook(file)
   if(!rows.length)throw new Error('Tidak ada baris tamu yang terbaca. Pastikan kolom Nama tersedia.')
   if(!confirm(`Import ${rows.length} tamu ke "${inv?.title}"?`))return
   await addGuestsBulk(user.id,selected,rows)
   await load()
   alert(`${rows.length} tamu berhasil diimport.`)
  }catch(e){alert(e.message||'Gagal membaca Excel')}finally{setBusy(false)}
 }

 const filtered=guests.filter(g=>(g.name+' '+(g.group_name||'')+' '+(g.phone||'')).toLowerCase().includes(search.toLowerCase()))
 const quota=guests.reduce((n,g)=>n+Number(g.guest_count||1),0)
 const checked=guests.filter(g=>g.checked_in_at).length
 const hadir=rsvps.filter(r=>r.attendance==='hadir').reduce((n,r)=>n+Number(r.guest_count||1),0)

 return <main className="content-page">
  <header className="topline"><div><p className="micro">GUEST MANAGEMENT</p><h2>Daftar tamu, RSVP & Pass</h2></div></header>

  {invitations.length===0?<section className="empty panel"><h3>Belum ada undangan</h3><p className="muted">Buat undangan dulu sebelum menambah tamu.</p></section>:<>
   <section className="panel guest-controls"><label>Pilih undangan<select value={selected} onChange={e=>setSelected(e.target.value)}>{invitations.map(x=><option value={x.id} key={x.id}>{x.title}</option>)}</select></label></section>

   <section className="stats-grid mini-stats">
    <article className="stat-card"><b>{guests.length}</b><span>Nama tamu</span></article>
    <article className="stat-card"><b>{quota}</b><span>Total kuota</span></article>
    <article className="stat-card"><b>{hadir}</b><span>RSVP hadir</span></article>
   </section>
   <section className="stats-grid mini-stats">
    <article className="stat-card"><b>{checked}</b><span>Sudah check-in</span></article>
    <article className="stat-card"><b>{Math.max(0,guests.length-checked)}</b><span>Belum check-in</span></article>
    <article className="stat-card"><b>{guests.length?Math.round(checked/guests.length*100):0}%</b><span>Check-in rate</span></article>
   </section>

   <section className="panel import-bar">
    <div><h3>Import / Export Excel</h3><p className="muted">Kolom yang dibaca: Nama, Grup, WhatsApp, Jumlah Tamu.</p></div>
    <div className="import-actions">
     <button onClick={downloadGuestTemplate}>Download Template</button>
     <label className="file-button">Import Excel<input type="file" accept=".xlsx,.xls,.csv" onChange={e=>{importExcel(e.target.files?.[0]);e.target.value=''}}/></label>
     <button disabled={!guests.length} onClick={()=>exportGuestsWorkbook(guests,inv?.title)}>Export Excel</button>
    </div>
   </section>

   <section className="panel guest-form"><h3>Tambah tamu manual</h3><div className="guest-form-grid"><input placeholder="Nama tamu" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/><input placeholder="Grup (Keluarga/Kantor)" value={form.group_name} onChange={e=>setForm(p=>({...p,group_name:e.target.value}))}/><input placeholder="WhatsApp" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/><input type="number" min="1" max="20" value={form.guest_count} onChange={e=>setForm(p=>({...p,guest_count:e.target.value}))}/></div><button className="primary" disabled={busy||!selected} onClick={add}>+ Tambah Tamu</button></section>

   <section className="panel guest-list">
    <div className="guest-list-head"><h3>Daftar tamu</h3><input className="small-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari tamu..."/></div>
    {filtered.length===0?<p className="muted">Belum ada tamu yang cocok.</p>:filtered.map(g=><div className="guest-row" key={g.id}><div><b>{g.name}</b><small>{g.group_name||'Tanpa grup'} • kuota {g.guest_count}{g.checked_in_at?` • check-in ${new Date(g.checked_in_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}`:''}</small></div><div className="guest-buttons"><button onClick={()=>setPassGuest(g)}>QR Pass</button><button className={g.checked_in_at?'checked-btn':''} onClick={async()=>{await markGuestCheckedIn(user.id,g.id,!g.checked_in_at);load()}}>{g.checked_in_at?'Batalkan Hadir':'Check-in'}</button><button className="danger-link" onClick={async()=>{if(confirm('Hapus tamu?')){await deleteGuest(g.id);load()}}}>Hapus</button></div></div>)}
   </section>

   <section className="panel guest-list"><h3>RSVP masuk</h3>{rsvps.length===0?<p className="muted">Belum ada RSVP.</p>:rsvps.map(r=><div className="guest-row" key={r.id}><div><b>{r.guest_name}</b><small>{r.attendance==='hadir'?'Hadir':'Tidak hadir'} • {r.guest_count} orang</small></div><span className={`status ${r.attendance==='hadir'?'published':''}`}>{r.attendance}</span></div>)}</section>
  </>}

  {passGuest&&inv&&<GuestPass guest={passGuest} invitation={inv} onClose={()=>setPassGuest(null)}/>}
 </main>
}
