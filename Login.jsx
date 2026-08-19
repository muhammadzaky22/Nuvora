import {useState} from 'react'
import {cloudEnabled} from '../lib/supabase'
import {signIn,signUp} from '../lib/auth'

export default function Login({onSuccess}){
 const[mode,setMode]=useState('login'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState('')
 const submit=async()=>{
  setMsg('')
  if(!email||!password){setMsg('Email dan password wajib diisi.');return}
  if(password.length<6){setMsg('Password minimal 6 karakter.');return}
  try{
   setBusy(true)
   const r=mode==='login'?await signIn(email,password):await signUp(name,email,password)
   if(r.needsConfirmation){setMsg('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.');return}
   onSuccess(r.user)
  }catch(e){setMsg(e.message||'Terjadi kesalahan.')}finally{setBusy(false)}
 }
 return <main className="auth page">
  <section className="auth-hero"><p className="micro">NUVORA • WEB + ANDROID</p><h1>Akun pelanggan,<br/><em>project milik sendiri.</em></h1><p className="muted">{cloudEnabled?'Cloud mode aktif — login terhubung ke database baru.':'Mode lokal aktif untuk pengujian. Sambungkan Supabase agar akun tersimpan online.'}</p></section>
  <section className="panel auth-panel">
   <div className="segmented"><button className={mode==='login'?'selected':''} onClick={()=>setMode('login')}>Masuk</button><button className={mode==='register'?'selected':''} onClick={()=>setMode('register')}>Daftar</button></div>
   {mode==='register'&&<label>Nama<input value={name} onChange={e=>setName(e.target.value)} placeholder="Nama lengkap"/></label>}
   <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></label>
   <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter"/></label>
   {msg&&<div className="notice">{msg}</div>}
   <button className="primary wide" disabled={busy} onClick={submit}>{busy?'Memproses...':mode==='login'?'Masuk':'Buat Akun'}</button>
  </section>
 </main>
}
