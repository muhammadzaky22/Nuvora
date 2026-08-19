import {useEffect,useState} from 'react'
import {listNotifications,markAllNotificationsRead,markNotificationRead} from '../lib/business'

export default function Notifications({user,onChanged}){
 const[items,setItems]=useState([]),[busy,setBusy]=useState(false)
 const load=async()=>{try{const rows=await listNotifications(user.id);setItems(rows);onChanged?.(rows.filter(x=>!x.read_at).length)}catch(e){alert(e.message)}}
 useEffect(()=>{load()},[])
 const mark=async n=>{if(n.read_at)return;try{await markNotificationRead(n.id,true);await load()}catch(e){alert(e.message)}}
 const markAll=async()=>{try{setBusy(true);await markAllNotificationsRead(user.id);await load()}catch(e){alert(e.message)}finally{setBusy(false)}}
 return <main className="content-page">
  <header className="topline"><div><p className="micro">NOTIFIKASI</p><h2>Pusat aktivitas</h2></div><button className="small-pill" disabled={busy} onClick={markAll}>Tandai semua dibaca</button></header>
  <section className="panel notification-list">
   {items.length===0?<div className="empty-inline"><b>Belum ada notifikasi</b><span>Update order, pembayaran, revisi, dan desain akan muncul di sini.</span></div>:items.map(n=><button key={n.id} className={`notification-row ${n.read_at?'':'unread'}`} onClick={()=>mark(n)}>
    <span className="notification-dot"/><div><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.created_at).toLocaleString('id-ID')}</small></div>
   </button>)}
  </section>
 </main>
}
