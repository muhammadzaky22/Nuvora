import {useEffect,useMemo,useState} from 'react'
import {createOrder,listMyOrders,listPlans,listThemes} from '../lib/business'

const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0)

export default function ThemeCatalog({user,onUseTheme}){
 const[themes,setThemes]=useState([]),[plans,setPlans]=useState([]),[orders,setOrders]=useState([]),[q,setQ]=useState(''),[cat,setCat]=useState('Semua'),[selected,setSelected]=useState(null),[plan,setPlan]=useState(null),[notes,setNotes]=useState(''),[busy,setBusy]=useState(false)

 const load=async()=>{
  try{
   const[t,p,o]=await Promise.all([listThemes(),listPlans(),listMyOrders(user.id)])
   setThemes(t);setPlans(p);setOrders(o);if(!plan&&p[0])setPlan(p[0])
  }catch(e){alert(e.message)}
 }
 useEffect(()=>{load()},[])
 const cats=['Semua',...new Set(themes.map(x=>x.category))]
 const filtered=useMemo(()=>themes.filter(t=>(cat==='Semua'||t.category===cat)&&(!q||(t.name+' '+t.category+' '+(t.description||'')).toLowerCase().includes(q.toLowerCase()))),[themes,q,cat])


 const submitOrder=async()=>{
  if(!selected||!plan)return alert('Pilih tema dan paket')
  try{
   setBusy(true)
   const o=await createOrder(user.id,{theme_id:selected.id,plan_id:plan.id,amount:plan.price,notes})
   alert(`Order ${o.order_no||''} berhasil dibuat.`)
   setSelected(null);setNotes('');await load()
  }catch(e){alert(e.message)}finally{setBusy(false)}
 }

 return <main className="content-page">
  <header className="topline"><div><p className="micro">KATALOG</p><h2>Pilih tema & paket</h2></div></header>

  <section className="catalog-tools panel"><input placeholder="Cari tema..." value={q} onChange={e=>setQ(e.target.value)}/><select value={cat} onChange={e=>setCat(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select></section>

  <div className="theme-catalog-grid">{filtered.map(t=><article className="theme-db-card panel" key={t.id}>
   <div className="theme-db-preview" style={{background:t.preview_url?`url(${t.preview_url}) center/cover`:t.background||t.config?.background||'#f4eee7'}}>
    <div style={{borderColor:t.accent||t.config?.accent||'#a98861'}}><small>{t.category}</small><b>{t.name}</b></div>
    {t.featured&&<span>FEATURED</span>}
   </div>
   <div className="theme-db-meta"><div><h3>{t.name}</h3><p>{t.description||'Tema undangan digital'}</p></div><div className="theme-actions"><button onClick={()=>onUseTheme?.(t)}>Buat Draft</button><button className="accent" onClick={()=>setSelected(t)}>Pesan</button></div></div>
  </article>)}</div>

  <section className="section-head"><h3>Order saya</h3><span>{orders.length}</span></section>
  <section className="panel order-list">{orders.length===0?<p className="muted">Belum ada order.</p>:orders.map(o=><div className="order-row" key={o.id}><div><b>{o.order_no||'Order'}</b><small>{o.themes?.name||'Tema'} • {o.plans?.name||'Paket'} • {money(o.amount)}</small></div><span className={`order-status s-${o.status}`}>{o.status}</span></div>)}</section>

  {selected&&<div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setSelected(null)}><section className="order-modal panel">
   <button className="modal-x" onClick={()=>setSelected(null)}>×</button><p className="micro">BUAT ORDER</p><h2>{selected.name}</h2>
   <div className="mini-theme" style={{background:selected.background||selected.config?.background||'#eee'}}><span style={{borderColor:selected.accent||'#a98861'}}>{selected.name}</span></div>
   <label>Pilih paket<select value={plan?.id||''} onChange={e=>setPlan(plans.find(x=>x.id===e.target.value))}>{plans.map(p=><option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}</select></label>
   {plan&&<div className="plan-box"><b>{plan.name}</b><strong>{money(plan.price)}</strong><p>{plan.description}</p><ul>{(plan.features||[]).map(x=><li key={x}>✓ {x}</li>)}</ul></div>}
   <label>Catatan<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Warna, deadline, request khusus..."/></label>
   <button className="primary wide" disabled={busy} onClick={submitOrder}>{busy?'Memproses...':'Buat Order'}</button>
  </section></div>}
 </main>
}
