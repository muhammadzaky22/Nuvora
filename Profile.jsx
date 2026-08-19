import {useEffect,useState} from 'react'
import {cloudEnabled} from '../lib/supabase'
import {getNotificationPreferences,updateNotificationPreferences} from '../lib/business'

export default function Profile({user,profile,onLogout,canInstall,onInstall}){
 const[prefs,setPrefs]=useState({orders:true,payments:true,messages:true,design:true,production:true}),[busy,setBusy]=useState(false)
 useEffect(()=>{getNotificationPreferences(user.id).then(setPrefs).catch(console.error)},[user.id])
 const save=async()=>{try{setBusy(true);setPrefs(await updateNotificationPreferences(user.id,prefs));alert('Preferensi notifikasi disimpan.')}catch(e){alert(e.message)}finally{setBusy(false)}}
 const toggle=k=>setPrefs(p=>({...p,[k]:!p[k]}))
 return <main className="content-page"><header className="topline"><div><p className="micro">AKUN</p><h2>Profil & Pengaturan</h2></div></header>
 <section className="profile-card panel"><div className="big-avatar">{(user?.email||'N')[0].toUpperCase()}</div><div><h3>{user?.user_metadata?.full_name||'Pengguna'}</h3><p className="muted">{user?.email}</p></div></section>
 <section className="settings panel"><div><span>Role</span><b>{profile?.role||'customer'}</b></div><div><span>Mode data</span><b>{cloudEnabled?'Cloud / Supabase':'Lokal'}</b></div><div><span>Versi</span><b>0.7.0</b></div><div><span>Target</span><b>Web + Android</b></div><div><span>Publish link</span><b>Aktif</b></div></section>

 <section className="panel preference-card"><p className="micro">NOTIFIKASI DALAM APLIKASI</p><h3>Preferensi</h3>{[
   ['orders','Order & status'],
   ['payments','Pembayaran'],
   ['messages','Pesan revisi'],
   ['design','Approval desain'],
   ['production','Tahap produksi']
 ].map(([k,l])=><label className="pref-row" key={k}><span>{l}</span><input type="checkbox" checked={!!prefs[k]} onChange={()=>toggle(k)}/></label>)}<button className="secondary wide" disabled={busy} onClick={save}>{busy?'Menyimpan...':'Simpan Preferensi'}</button></section>

 {canInstall&&<button className="secondary wide" onClick={onInstall}>Install PWA</button>}<button className="danger-text wide" onClick={onLogout}>Keluar</button></main>
}
