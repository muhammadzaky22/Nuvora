import {useEffect,useState} from 'react'
import {getInvitation} from '../lib/repo'

const defaults={opening:'',maps_url:'',music_url:'',streaming_url:'',dress_code:'',closing:'',schedule:[],story_title:'Cerita Kami',story_text:'',gift:{},gallery:[]}

export default function PreviewInvitation({id,onClose}){
 const[inv,setInv]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{(async()=>{try{setInv(await getInvitation(id))}catch(e){setError(e.message||'Preview tidak dapat dibuka')}finally{setLoading(false)}})()},[id])
 if(loading)return <main className="public-loading">Memuat preview...</main>
 if(error||!inv)return <main className="public-loading"><div><h2>Preview tidak tersedia</h2><p>{error||'Project tidak ditemukan.'}</p><button className="primary" onClick={onClose}>Kembali</button></div></main>

 const c={...defaults,...(inv.content||{}),gift:{...(inv.content?.gift||{})},schedule:inv.content?.schedule||[],gallery:inv.content?.gallery||[]}
 return <main className="public-invite private-preview" style={{'--accent':inv.accent||'#a98861'}}>
  <div className="preview-ribbon"><span>PRIVATE DESIGN PREVIEW</span><button onClick={onClose}>Tutup Preview</button></div>
  <section className="public-cover" style={{backgroundImage:inv.cover_url?`linear-gradient(rgba(18,14,14,.28),rgba(18,14,14,.65)),url(${inv.cover_url})`:undefined}}>
   <div className="public-frame"><small>{inv.event_type}</small><h1>{inv.title}</h1><div className="guest-to">Mode Review<b>Belum untuk disebarkan</b></div><a href="#preview-detail">Lihat Desain ↓</a></div>
  </section>
  <section className="public-section" id="preview-detail"><p className="micro">DETAIL ACARA</p><h2>{inv.title}</h2>{c.opening&&<p>{c.opening}</p>}<div className="public-info"><div><span>Tanggal</span><b>{inv.event_date||'-'}</b></div><div><span>Lokasi</span><b>{inv.location||'-'}</b></div></div></section>
  {c.schedule.length>0&&<section className="public-section alt"><p className="micro">RUNDOWN</p><h2>Susunan Acara</h2><div className="public-timeline">{c.schedule.map((s,i)=><div key={i}><b>{s.time||'—'}</b><span>{s.label}</span></div>)}</div>{c.dress_code&&<div className="dress-box"><span>Dress Code</span><b>{c.dress_code}</b></div>}</section>}
  {c.story_text&&<section className="public-section"><p className="micro">STORY</p><h2>{c.story_title||'Cerita Kami'}</h2><p className="story-copy">{c.story_text}</p></section>}
  {c.gallery.length>0&&<section className="public-section alt"><p className="micro">GALERI</p><h2>Momen Pilihan</h2><div className="public-gallery">{c.gallery.map((url,i)=><img loading="lazy" key={url+i} src={url} alt={`Galeri ${i+1}`}/>)}</div></section>}
  {(c.gift?.bank||c.gift?.account)&&<section className="public-section"><p className="micro">GIFT</p><h2>Tanda Kasih</h2><div className="gift-card"><span>{c.gift.bank||'Rekening'}</span><b>{c.gift.account}</b><small>a.n. {c.gift.holder||'-'}</small></div></section>}
  {c.closing&&<section className="public-closing"><p>{c.closing}</p><b>{inv.title}</b></section>}
  <footer className="public-footer">Private preview • Nuvora</footer>
 </main>
}
