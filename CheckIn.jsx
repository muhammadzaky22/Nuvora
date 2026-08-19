import {useEffect,useRef,useState} from 'react'
import {Html5QrcodeScanner} from 'html5-qrcode'
import {checkInGuestByToken,listGuests,markGuestCheckedIn} from '../lib/repo'

function extractToken(text){
 const s=String(text||'').trim()
 if(s.startsWith('NUVORA:')) return s.slice(7).trim()
 try{
  const u=new URL(s)
  return u.searchParams.get('token')||''
 }catch{return s}
}

export default function CheckIn({user,invitations}){
 const[selected,setSelected]=useState(invitations[0]?.id||''),[guests,setGuests]=useState([]),[scannerOn,setScannerOn]=useState(false),[last,setLast]=useState(null),[manual,setManual]=useState(''),[msg,setMsg]=useState('')
 const scannerRef=useRef(null)
 const inv=invitations.find(x=>x.id===selected)

 const load=async()=>{if(!selected)return setGuests([]);try{setGuests(await listGuests(user.id,selected))}catch(e){setMsg(e.message)}}
 useEffect(()=>{load()},[selected])

 useEffect(()=>{
  if(!scannerOn)return
  const scanner=new Html5QrcodeScanner('qr-reader',{fps:10,qrbox:{width:230,height:230},rememberLastUsedCamera:true},false)
  scannerRef.current=scanner
  scanner.render(async decoded=>{
    try{
      const token=extractToken(decoded)
      const g=await checkInGuestByToken(user.id,selected,token)
      setLast(g);setMsg(`${g.name} berhasil check-in.`);await load()
      await scanner.clear();setScannerOn(false)
    }catch(e){setMsg(e.message||'QR tidak valid')}
  },()=>{})
  return()=>{scanner.clear().catch(()=>{});scannerRef.current=null}
 },[scannerOn,selected])

 const manualCheck=async()=>{
  const q=manual.trim().toLowerCase()
  if(!q)return
  const matches=guests.filter(g=>g.name.toLowerCase().includes(q)||g.phone?.toLowerCase().includes(q))
  if(matches.length===0)return setMsg('Tamu tidak ditemukan.')
  if(matches.length>1)return setMsg(`Ditemukan ${matches.length} tamu. Ketik nama lebih lengkap.`)
  try{const g=await markGuestCheckedIn(user.id,matches[0].id,true);setLast(g);setMsg(`${g.name} berhasil check-in.`);setManual('');await load()}catch(e){setMsg(e.message)}
 }

 const checked=guests.filter(g=>g.checked_in_at).length

 return <main className="content-page">
  <header className="topline"><div><p className="micro">HARI H</p><h2>QR Check-in</h2></div></header>
  {invitations.length===0?<section className="empty panel"><h3>Belum ada undangan</h3><p className="muted">Buat undangan dan daftar tamu terlebih dahulu.</p></section>:<>
   <section className="panel checkin-top"><label>Pilih acara<select value={selected} onChange={e=>{setSelected(e.target.value);setLast(null);setMsg('')}}>{invitations.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label><div className="checkin-stat"><b>{checked}</b><span>dari {guests.length} tamu sudah check-in</span></div></section>
   <section className="scanner-card panel">
    <div className="scanner-head"><div><p className="micro">SCAN QR PASS</p><h3>{inv?.title}</h3></div><button className={scannerOn?'secondary':'primary'} onClick={()=>setScannerOn(x=>!x)}>{scannerOn?'Tutup Kamera':'Buka Kamera'}</button></div>
    {scannerOn?<div id="qr-reader" className="qr-reader"></div>:<div className="camera-placeholder"><span>QR</span><p>Tekan “Buka Kamera”, lalu arahkan ke QR Pass tamu.</p></div>}
    {msg&&<div className={`notice ${last?'success-notice':''}`}>{msg}</div>}
    {last&&<div className="last-checkin"><span>CHECK-IN BERHASIL</span><b>{last.name}</b><small>Kuota {last.guest_count} orang</small></div>}
   </section>
   <section className="panel manual-checkin"><h3>Pencarian manual</h3><p className="muted">Dipakai jika kamera/QR bermasalah.</p><div><input value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==='Enter'&&manualCheck()} placeholder="Nama atau WhatsApp tamu"/><button className="primary" onClick={manualCheck}>Check-in</button></div></section>
   <section className="panel guest-list"><h3>Terakhir hadir</h3>{guests.filter(g=>g.checked_in_at).sort((a,b)=>String(b.checked_in_at).localeCompare(String(a.checked_in_at))).slice(0,8).map(g=><div className="guest-row" key={g.id}><div><b>{g.name}</b><small>{new Date(g.checked_in_at).toLocaleString('id-ID')}</small></div><span className="status published">HADIR</span></div>)}</section>
  </>}
 </main>
}
