import {useEffect,useState} from 'react'
import {addOrderMessage,listOrderMessages} from '../lib/business'

export default function OrderConversation({user,order,onClose}){
 const[items,setItems]=useState([]),[text,setText]=useState(''),[busy,setBusy]=useState(false)
 const load=async()=>{try{setItems(await listOrderMessages(user.id,order.id))}catch(e){alert(e.message)}}
 useEffect(()=>{load()},[order.id])
 const send=async()=>{if(!text.trim())return;try{setBusy(true);await addOrderMessage(user.id,order.id,text);setText('');await load()}catch(e){alert(e.message)}finally{setBusy(false)}}
 return <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}><section className="conversation-modal panel">
  <button className="modal-x" onClick={onClose}>×</button><p className="micro">REVISI & DISKUSI</p><h2>{order.order_no||'Order'}</h2>
  <div className="conversation-list">{items.length===0?<p className="muted">Belum ada pesan.</p>:items.map(m=><article className={`bubble ${m.author_id===user.id?'mine':''}`} key={m.id}><span>{m.author_role}</span><p>{m.message}</p><small>{new Date(m.created_at).toLocaleString('id-ID')}</small></article>)}</div>
  <div className="conversation-send"><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Tulis revisi, pertanyaan, atau balasan..."/><button className="primary" disabled={busy} onClick={send}>Kirim</button></div>
 </section></div>
}
