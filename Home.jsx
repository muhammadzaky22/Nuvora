import {cloudEnabled} from '../lib/supabase'
export default function Home({user,invitations,totalGuests,totalRsvps,onCreate,onNavigate,canInstall,onInstall}){
 return <main className="content-page">
  <header className="topline"><div><p className="micro">SELAMAT DATANG</p><h2>{user?.user_metadata?.full_name||user?.email?.split('@')[0]||'Pengguna'}</h2></div><div className="avatar">{(user?.email||'N')[0].toUpperCase()}</div></header>
  {!cloudEnabled&&<div className="mode-banner"><b>Mode lokal</b><span>Semua fitur bisa diuji di perangkat ini. Hubungkan Supabase untuk sinkronisasi akun dan data online.</span></div>}
  <section className="hero-card dark"><span className="chip">{cloudEnabled?'CLOUD READY':'LOCAL TEST'}</span><h1>Buat dan kelola undangan.</h1><p>Draft, publish link, daftar tamu, RSVP dan ucapan sudah terhubung dalam satu alur.</p><button className="light-button" onClick={onCreate}>+ Buat Undangan</button></section>
  <section className="stats-grid"><article className="stat-card"><b>{invitations.length}</b><span>Undangan</span></article><article className="stat-card"><b>{totalGuests}</b><span>Tamu</span></article><article className="stat-card"><b>{totalRsvps}</b><span>RSVP</span></article></section>
  <section className="section-head"><h3>Akses cepat</h3><span>v0.6</span></section>
  <section className="feature-list panel">
   <button className="feature-row button-row" onClick={()=>onNavigate('invitations')}><b>01</b><div><strong>Undangan Saya</strong><small>Edit, publish, share, atau hapus project</small></div></button>
   <button className="feature-row button-row" onClick={()=>onNavigate('guests')}><b>02</b><div><strong>Guest Management</strong><small>Tambah tamu dan buat link personal</small></div></button>
   <button className="feature-row button-row" onClick={onCreate}><b>03</b><div><strong>Buat Undangan</strong><small>Wizard + upload cover + preview</small></div></button>
  </section>
  {canInstall&&<section className="install-card panel"><div><p className="micro">PWA</p><h3>Pasang di HP</h3></div><button className="secondary" onClick={onInstall}>Install</button></section>}
 </main>
}
