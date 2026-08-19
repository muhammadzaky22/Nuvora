import {useEffect,useMemo,useState} from 'react'
import BottomNav from './components/BottomNav'
import Login from './screens/Login'
import Home from './screens/Home'
import Editor from './screens/Editor'
import Invitations from './screens/Invitations'
import Guests from './screens/Guests'
import Profile from './screens/Profile'
import CheckIn from './screens/CheckIn'
import ThemeCatalog from './screens/ThemeCatalog'
import AdminPanel from './screens/AdminPanel'
import OrderCenter from './screens/OrderCenter'
import Menu from './screens/Menu'
import Notifications from './screens/Notifications'
import Analytics from './screens/Analytics'
import PreviewInvitation from './screens/PreviewInvitation'
import {getProfile,listNotifications} from './lib/business'
import PublicInvitation from './screens/PublicInvitation'
import {currentUser,onAuthChange,signOut} from './lib/auth'
import {listGuests,listInvitations,listRsvps} from './lib/repo'

export default function App(){
 const params=new URLSearchParams(location.search),publicSlug=params.get('invite'),previewId=params.get('preview'),guestName=params.get('to')||'',guestToken=params.get('token')||''
 if(publicSlug)return <PublicInvitation slug={publicSlug} guestName={guestName} guestToken={guestToken}/>

 const[user,setUser]=useState(undefined),[profile,setProfile]=useState(null),[screen,setScreen]=useState('home'),[unread,setUnread]=useState(0),[items,setItems]=useState([]),[editing,setEditing]=useState(null),[presetTheme,setPresetTheme]=useState(null),[guestTarget,setGuestTarget]=useState(null),[totalGuests,setTotalGuests]=useState(0),[totalRsvps,setTotalRsvps]=useState(0),[installPrompt,setInstallPrompt]=useState(null)

 useEffect(()=>{currentUser().then(setUser);const sub=onAuthChange(setUser);return()=>sub?.unsubscribe?.()},[])
 useEffect(()=>{const h=e=>{e.preventDefault();setInstallPrompt(e)};addEventListener('beforeinstallprompt',h);return()=>removeEventListener('beforeinstallprompt',h)},[])
 const refresh=async()=>{
  if(!user)return
  try{
   const invs=await listInvitations(user.id);setItems(invs)
   const nested=await Promise.all(invs.map(async i=>{const[g,r]=await Promise.all([listGuests(user.id,i.id),listRsvps(i.id)]);return [g.length,r.length]}))
   setTotalGuests(nested.reduce((n,x)=>n+x[0],0));setTotalRsvps(nested.reduce((n,x)=>n+x[1],0))
  }catch(e){console.error(e)}
 }
 useEffect(()=>{refresh();if(user){getProfile(user).then(setProfile).catch(console.error);listNotifications(user.id).then(x=>setUnread(x.filter(n=>!n.read_at).length)).catch(console.error)}},[user])
 useEffect(()=>{
   if(!user)return
   const refreshUnread=()=>listNotifications(user.id).then(x=>setUnread(x.filter(n=>!n.read_at).length)).catch(()=>{})
   const timer=setInterval(refreshUnread,30000)
   return()=>clearInterval(timer)
 },[user])
 const install=async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null)}
 if(user===undefined)return <main className="public-loading">Menyiapkan aplikasi...</main>
 if(!user)return <Login onSuccess={u=>setUser(u)}/>
 if(previewId)return <PreviewInvitation id={previewId} onClose={()=>{const u=new URL(location.href);u.search='';location.href=u.toString()}}/>
 if(screen==='create'||screen==='edit')return <Editor user={user} existing={editing} presetTheme={presetTheme} onCancel={()=>{setEditing(null);setPresetTheme(null);setScreen('invitations')}} onDone={async()=>{setEditing(null);setPresetTheme(null);await refresh();setScreen('invitations')}}/>
 const nav=s=>{
  if(s==='create'){setEditing(null);setPresetTheme(null);setScreen('create');return}
  if(s==='admin'&&profile?.role!=='admin')return
  setScreen(s)
}
 return <div className="app-shell">
  {screen==='home'&&<Home user={user} invitations={items} totalGuests={totalGuests} totalRsvps={totalRsvps} onCreate={()=>nav('create')} onNavigate={nav} canInstall={!!installPrompt} onInstall={install}/>}
  {screen==='catalog'&&<ThemeCatalog user={user} onUseTheme={t=>{setEditing(null);setPresetTheme(t);setScreen('create')}}/>}
  {screen==='orders'&&<OrderCenter user={user}/>}
  {screen==='invitations'&&<Invitations items={items} onCreate={()=>nav('create')} onEdit={inv=>{setEditing(inv);setScreen('edit')}} onRefresh={refresh} onSelectGuests={inv=>{setGuestTarget(inv);setScreen('guests')}}/>}
  {screen==='guests'&&<Guests user={user} invitations={items} initialInvitation={guestTarget}/>}
  {screen==='checkin'&&<CheckIn user={user} invitations={items}/>} 
  {screen==='admin'&&profile?.role==='admin'&&<AdminPanel user={user}/>}
  {screen==='menu'&&<Menu isAdmin={profile?.role==='admin'} unread={unread} onNavigate={nav}/>}
  {screen==='notifications'&&<Notifications user={user} onChanged={setUnread}/>}
  {screen==='analytics'&&<Analytics invitations={items}/>}
  {screen==='profile'&&<Profile user={user} profile={profile} canInstall={!!installPrompt} onInstall={install} onLogout={async()=>{await signOut();setUser(null)}}/>}
  <BottomNav screen={screen} onChange={nav} unread={unread}/>
 </div>
}
