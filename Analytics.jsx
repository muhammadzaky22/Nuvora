import {useEffect,useMemo,useState} from 'react'
import {getAnalyticsByInvitation,getAnalyticsSeries} from '../lib/analytics'

export default function Analytics({invitations}){
 const[data,setData]=useState({}),[selected,setSelected]=useState(invitations[0]?.id||''),[days,setDays]=useState(30),[series,setSeries]=useState([]),[loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{try{setData(await getAnalyticsByInvitation(invitations.map(x=>x.id)))}catch(e){alert(e.message)}finally{setLoading(false)}})()},[invitations])
 useEffect(()=>{if(!selected)return setSeries([]);getAnalyticsSeries(selected,days).then(setSeries).catch(e=>alert(e.message))},[selected,days])
 const total=key=>Object.values(data).reduce((n,x)=>n+Number(x?.[key]||0),0)
 const current=data[selected]||{}
 const max=Math.max(1,...series.map(x=>x.open))
 const conversion=current.open?Math.round((Number(current.rsvp||0)/Number(current.open||1))*100):0
 return <main className="content-page">
  <header className="topline"><div><p className="micro">ANALYTICS</p><h2>Performa undangan</h2></div></header>
  {loading?<section className="panel empty-inline"><b>Memuat analytics...</b></section>:<>
   <section className="analytics-summary">
    <article className="panel"><b>{total('open')}</b><span>Total dibuka</span></article>
    <article className="panel"><b>{total('unique_open')}</b><span>Perkiraan unik</span></article>
    <article className="panel"><b>{total('rsvp')}</b><span>RSVP terkirim</span></article>
    <article className="panel"><b>{total('wish')}</b><span>Ucapan</span></article>
   </section>

   {invitations.length>0&&<section className="panel analytics-detail">
    <div className="analytics-controls"><select value={selected} onChange={e=>setSelected(e.target.value)}>{invitations.map(i=><option value={i.id} key={i.id}>{i.title}</option>)}</select><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value="7">7 hari</option><option value="30">30 hari</option><option value="90">90 hari</option><option value="0">Semua</option></select></div>
    <div className="conversion-strip"><div><span>Open</span><b>{current.open||0}</b></div><div><span>Unique</span><b>{current.unique_open||0}</b></div><div><span>RSVP</span><b>{current.rsvp||0}</b></div><div><span>Konversi RSVP/Open</span><b>{conversion}%</b></div></div>
    <div className="bar-chart">{series.length===0?<p className="muted">Belum ada data pada periode ini.</p>:series.map(x=><div className="bar-day" key={x.date} title={`${x.date}: ${x.open} open`}><div className="bar" style={{height:`${Math.max(4,Math.round((x.open/max)*100))}%`}}/><small>{x.date.slice(5)}</small></div>)}</div>
   </section>}

   <section className="panel analytics-list">
    {invitations.length===0?<p className="muted">Belum ada undangan.</p>:invitations.map(inv=>{const a=data[inv.id]||{};return <article className="analytics-row" key={inv.id}><div><b>{inv.title}</b><small>{inv.status} • {inv.event_date||'tanpa tanggal'}</small></div><div className="analytics-mini"><span><b>{a.open||0}</b>Buka</span><span><b>{a.unique_open||0}</b>Unik</span><span><b>{a.rsvp||0}</b>RSVP</span><span><b>{a.maps||0}</b>Maps</span><span><b>{a.gift_copy||0}</b>Gift</span></div></article>})}
   </section>
  </>}
 </main>
}
