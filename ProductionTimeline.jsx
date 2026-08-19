import {useEffect,useState} from 'react'
import {listProductionEvents,PRODUCTION_STAGES} from '../lib/business'

export default function ProductionTimeline({user,order,all=false,refreshKey=0}){
 const[items,setItems]=useState([]),[loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{try{setItems(await listProductionEvents(user.id,order.id,{all}))}catch(e){console.error(e)}finally{setLoading(false)}})()},[order.id,refreshKey])
 if(loading)return <div className="prod-loading">Memuat status produksi...</div>
 const latest=items.at(-1)?.stage
 const label=k=>PRODUCTION_STAGES.find(x=>x[0]===k)?.[1]||k
 return <section className="production-timeline">
  <div className="production-current"><span>Status Produksi</span><b>{latest?label(latest):'Belum dimulai'}</b></div>
  {items.length>0&&<div className="production-events">{items.map((x,i)=><article key={x.id||i}><i className={i===items.length-1?'latest':''}/><div><b>{label(x.stage)}</b>{x.note&&<p>{x.note}</p>}<small>{new Date(x.created_at).toLocaleString('id-ID')}</small></div></article>)}</div>}
 </section>
}
