import {useState} from 'react'
import {buildPublicLink,deleteInvitation,updateInvitation} from '../lib/repo'

export default function Invitations({items,onCreate,onEdit,onRefresh,onSelectGuests}){
 const[busy,setBusy]=useState('')
 const act=async(fn,id)=>{try{setBusy(id);await fn();await onRefresh()}catch(e){alert(e.message)}finally{setBusy('')}}
 const copy=async(inv)=>{const u=buildPublicLink(inv.slug);try{await navigator.clipboard.writeText(u);alert('Link disalin')}catch{prompt('Salin link:',u)}}
 return <main className="content-page">
  <header className="topline"><div><p className="micro">UNDANGAN SAYA</p><h2>{items.length} project</h2></div><button className="round-button filled" onClick={onCreate}>+</button></header>
  {items.length===0?<section className="empty panel"><div className="empty-icon">▣</div><h3>Belum ada undangan</h3><p className="muted">Buat project pertama.</p><button className="primary" onClick={onCreate}>Buat Undangan</button></section>:
  <div className="project-list">{items.map(inv=><article className="project-card panel" key={inv.id}>
   <div className="project-cover" style={{background:inv.cover_url?`linear-gradient(rgba(20,15,15,.35),rgba(20,15,15,.55)),url(${inv.cover_url}) center/cover`:inv.style==='Noir'?'#17151b':'#eadfd6',color:inv.cover_url||inv.style==='Noir'?'white':'#19171c'}}><small>{inv.event_type}</small><b>{inv.title}</b></div>
   <div className="project-meta"><div><h3>{inv.title}</h3><p>{inv.event_date||'Tanggal belum diisi'} • {inv.style}</p></div><span className={`status ${inv.status==='published'?'published':''}`}>{inv.status.toUpperCase()}</span></div>
   <div className="card-actions">
    <button onClick={()=>onEdit(inv)}>Edit</button>
    <button onClick={()=>onSelectGuests(inv)}>Tamu</button>
    {inv.status==='published'?<><button onClick={()=>copy(inv)}>Salin Link</button><button onClick={()=>open(buildPublicLink(inv.slug),'_blank')}>Buka</button><button onClick={()=>act(()=>updateInvitation(inv.id,{status:'draft'}),inv.id)}>Unpublish</button></>:<button className="accent" onClick={()=>act(()=>updateInvitation(inv.id,{status:'published'}),inv.id)}>Publish</button>}
    <button className="danger" disabled={busy===inv.id} onClick={()=>{if(confirm('Hapus undangan ini?'))act(()=>deleteInvitation(inv.id),inv.id)}}>Hapus</button>
   </div>
  </article>)}</div>}
 </main>
}
