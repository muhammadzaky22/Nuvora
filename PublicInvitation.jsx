import {useEffect,useState} from 'react'
import QRCode from 'qrcode'
import {getPublicInvitation,listWishes,submitRsvp,submitWish} from '../lib/repo'
import {trackEvent} from '../lib/analytics'

const defaults={opening:'',maps_url:'',music_url:'',streaming_url:'',dress_code:'',closing:'',schedule:[],story_title:'Cerita Kami',story_text:'',gift:{},gallery:[]}
export default function PublicInvitation({slug,guestName,guestToken}){
 const[inv,setInv]=useState(null),[wishes,setWishes]=useState([]),[loading,setLoading]=useState(true),[rsvp,setRsvp]=useState({guest_name:guestName||'',attendance:'hadir',guest_count:1,message:''}),[wish,setWish]=useState({guest_name:guestName||'',message:''}),[done,setDone]=useState(''),[passQr,setPassQr]=useState('')
 useEffect(()=>{(async()=>{try{const i=await getPublicInvitation(slug);setInv(i);if(i){setWishes(await listWishes(i.id,true));trackEvent(i.id,'open');if(guestToken)trackEvent(i.id,'guest_pass_view')}if(guestToken)setPassQr(await QRCode.toDataURL(`NUVORA:${guestToken}`,{width:360,margin:2}))}catch(e){console.error(e)}finally{setLoading(false)}})()},[slug,guestToken])
 if(loading)return <main className="public-loading">Memuat undangan...</main>
 if(!inv)return <main className="public-loading"><div><h2>Undangan tidak ditemukan</h2><p>Link belum dipublish atau alamat tidak valid.</p></div></main>

 const c={...defaults,...(inv.content||{}),gift:{...(inv.content?.gift||{})},schedule:inv.content?.schedule||[],gallery:inv.content?.gallery||[]}
 const sendRsvp=async()=>{if(!rsvp.guest_name.trim())return alert('Isi nama');try{await submitRsvp(inv.id,rsvp);trackEvent(inv.id,'rsvp');setDone('RSVP berhasil dikirim. Terima kasih 🤍')}catch(e){alert(e.message)}}
 const sendWish=async()=>{if(!wish.guest_name.trim()||!wish.message.trim())return alert('Isi nama dan ucapan');try{await submitWish(inv.id,wish);trackEvent(inv.id,'wish');setWish(p=>({...p,message:''}));setWishes(await listWishes(inv.id,true))}catch(e){alert(e.message)}}

 return <main className="public-invite" style={{'--accent':inv.accent||'#a98861'}}>
  {c.music_url&&<audio src={c.music_url} controls loop className="public-audio"/>}

  <section className="public-cover" style={{backgroundImage:inv.cover_url?`linear-gradient(rgba(18,14,14,.28),rgba(18,14,14,.65)),url(${inv.cover_url})`:undefined}}>
   <div className="public-frame"><small>{inv.event_type}</small><h1>{inv.title}</h1>{guestName&&<div className="guest-to">Kepada Yth.<b>{guestName}</b></div>}<a href="#detail">Buka Detail ↓</a></div>
  </section>

  <section className="public-section" id="detail"><p className="micro">DETAIL ACARA</p><h2>{inv.title}</h2>{c.opening&&<p>{c.opening}</p>}<div className="public-info"><div><span>Tanggal</span><b>{inv.event_date||'-'}</b></div><div><span>Lokasi</span><b>{inv.location||'-'}</b></div></div><div className="public-links">{c.maps_url&&<a href={c.maps_url} target="_blank" rel="noreferrer" onClick={()=>trackEvent(inv.id,'maps')}>Buka Google Maps</a>}{c.streaming_url&&<a href={c.streaming_url} target="_blank" rel="noreferrer" onClick={()=>trackEvent(inv.id,'streaming')}>Live Streaming</a>}</div></section>

  {c.schedule.length>0&&<section className="public-section alt"><p className="micro">RUNDOWN</p><h2>Susunan Acara</h2><div className="public-timeline">{c.schedule.map((s,i)=><div key={i}><b>{s.time||'—'}</b><span>{s.label}</span></div>)}</div>{c.dress_code&&<div className="dress-box"><span>Dress Code</span><b>{c.dress_code}</b></div>}</section>}

  {c.story_text&&<section className="public-section"><p className="micro">STORY</p><h2>{c.story_title||'Cerita Kami'}</h2><p className="story-copy">{c.story_text}</p></section>}

  {c.gallery.length>0&&<section className="public-section alt"><p className="micro">GALERI</p><h2>Momen Pilihan</h2><div className="public-gallery">{c.gallery.map((url,i)=><img loading="lazy" key={url+i} src={url} alt={`Galeri ${i+1}`}/>)}</div></section>}

  {(c.gift?.bank||c.gift?.account)&&<section className="public-section"><p className="micro">GIFT</p><h2>Tanda Kasih</h2><div className="gift-card"><span>{c.gift.bank||'Rekening'}</span><b>{c.gift.account}</b><small>a.n. {c.gift.holder||'-'}</small><button onClick={()=>{navigator.clipboard?.writeText(c.gift.account||'');trackEvent(inv.id,'gift_copy')}}>Salin Nomor</button></div></section>}

  {guestToken&&<section className="public-section public-pass"><p className="micro">DIGITAL GUEST PASS</p><h2>QR Check-in</h2><p>Tunjukkan QR ini kepada petugas saat tiba di lokasi.</p>{passQr&&<img src={passQr} className="public-pass-qr" alt="QR Guest Pass"/>}<div className="guest-to"><span>Nama Tamu</span><b>{guestName||'Tamu Undangan'}</b></div></section>}

  <section className="public-section alt"><p className="micro">KONFIRMASI</p><h2>RSVP</h2><div className="public-form"><input placeholder="Nama" value={rsvp.guest_name} onChange={e=>setRsvp(p=>({...p,guest_name:e.target.value}))}/><select value={rsvp.attendance} onChange={e=>setRsvp(p=>({...p,attendance:e.target.value}))}><option value="hadir">Hadir</option><option value="tidak_hadir">Tidak hadir</option></select><input type="number" min="1" max="20" value={rsvp.guest_count} onChange={e=>setRsvp(p=>({...p,guest_count:e.target.value}))}/><textarea placeholder="Pesan opsional" value={rsvp.message} onChange={e=>setRsvp(p=>({...p,message:e.target.value}))}/><button onClick={sendRsvp}>Kirim RSVP</button>{done&&<p className="success">{done}</p>}</div></section>

  <section className="public-section"><p className="micro">UCAPAN</p><h2>Kirim doa & pesan</h2><div className="public-form"><input placeholder="Nama" value={wish.guest_name} onChange={e=>setWish(p=>({...p,guest_name:e.target.value}))}/><textarea placeholder="Tulis ucapan..." value={wish.message} onChange={e=>setWish(p=>({...p,message:e.target.value}))}/><button onClick={sendWish}>Kirim Ucapan</button></div><div className="wish-list">{wishes.slice(0,20).map(w=><article key={w.id}><b>{w.guest_name}</b><p>{w.message}</p></article>)}</div></section>

  {c.closing&&<section className="public-closing"><p>{c.closing}</p><b>{inv.title}</b></section>}
  <footer className="public-footer">Made with Nuvora</footer>
 </main>
}
