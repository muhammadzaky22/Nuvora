import {useEffect,useState} from 'react'
import {getPaymentSettings,listDesignReviews,listMyOrders,listMyPayments,submitPayment} from '../lib/business'
import {signedPaymentProof,uploadPaymentProof} from '../lib/media'
import OrderConversation from '../components/OrderConversation'
import DesignApproval from '../components/DesignApproval'
import ProductionTimeline from '../components/ProductionTimeline'

const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0)
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))

export default function OrderCenter({user}){
 const[orders,setOrders]=useState([]),[payments,setPayments]=useState([]),[reviews,setReviews]=useState([]),[paymentSettings,setPaymentSettings]=useState(null),[conversation,setConversation]=useState(null),[payOrder,setPayOrder]=useState(null),[proof,setProof]=useState(null),[method,setMethod]=useState('Transfer Bank'),[busy,setBusy]=useState(false),[proofPreview,setProofPreview]=useState(null)
 const load=async()=>{try{const[o,p,r,settings]=await Promise.all([listMyOrders(user.id),listMyPayments(user.id),listDesignReviews(user.id),getPaymentSettings()]);setOrders(o);setPayments(p);setReviews(r);setPaymentSettings(settings)}catch(e){alert(e.message)}}
 useEffect(()=>{load()},[])
 const paymentFor=id=>payments.find(p=>p.order_id===id)
 const reviewFor=id=>reviews.find(r=>r.order_id===id)

 const sendPayment=async()=>{
  if(!payOrder||!proof)return alert('Pilih bukti pembayaran')
  try{
   setBusy(true)
   const uploaded=await uploadPaymentProof(user.id,payOrder.id,proof)
   await submitPayment(user.id,payOrder.id,method,uploaded.path)
   setPayOrder(null);setProof(null);await load();alert('Bukti pembayaran berhasil dikirim.')
  }catch(e){alert(e.message)}finally{setBusy(false)}
 }

 const viewProof=async p=>{try{setProofPreview(await signedPaymentProof(p.proof_path))}catch(e){alert(e.message)}}
 const printInvoice=order=>{
   const theme=esc(order.themes?.name||'-'),plan=esc(order.plans?.name||'-')
   const body=`<!doctype html><html><head><title>Invoice ${esc(order.order_no||'')}</title><style>body{font-family:Arial;padding:40px;color:#222}.head{display:flex;justify-content:space-between}.box{margin-top:25px;border:1px solid #ddd;border-radius:12px;padding:20px}.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #eee}.total{font-size:24px;font-weight:bold;margin-top:20px}</style></head><body><div class="head"><div><h1>NUVORA</h1><p>Digital Invitation Platform</p></div><div><b>INVOICE</b><p>${esc(order.order_no||'')}</p></div></div><div class="box"><div class="row"><span>Tema</span><b>${theme}</b></div><div class="row"><span>Paket</span><b>${plan}</b></div><div class="row"><span>Status Order</span><b>${esc(order.status)}</b></div><div class="total">Total: ${money(order.amount)}</div></div><p style="margin-top:35px">Dicetak ${new Date().toLocaleString('id-ID')}</p><script>window.onload=()=>window.print()</script></body></html>`
   const w=open('','_blank');w.document.write(body);w.document.close()
 }

 return <main className="content-page">
  <header className="topline"><div><p className="micro">PESANAN</p><h2>Order, pembayaran & revisi</h2></div></header>
  <section className="panel order-center">{orders.length===0?<p className="muted">Belum ada order. Pilih tema dari Katalog.</p>:orders.map(o=>{const pay=paymentFor(o.id),review=reviewFor(o.id);return <article className="order-center-row" key={o.id}>
    <div className="order-main"><b>{o.order_no||'Order'}</b><h3>{o.themes?.name||'Tema'} • {o.plans?.name||'Paket'}</h3><p>{money(o.amount)} • dibuat {new Date(o.created_at).toLocaleDateString('id-ID')}</p></div>
    <div className="order-badges"><span className={`order-status s-${o.status}`}>{o.status}</span>{pay&&<span className={`payment-status p-${pay.status}`}>Bayar: {pay.status}</span>}</div>
    <div className="order-center-actions"><button onClick={()=>printInvoice(o)}>Invoice</button><button onClick={()=>setConversation(o)}>Revisi / Chat</button>{(!pay||pay.status==='rejected')&&o.status!=='cancelled'&&<button className="accent" onClick={()=>setPayOrder(o)}>{pay?.status==='rejected'?'Kirim Ulang Bukti':'Kirim Bukti Bayar'}</button>}{pay&&<button onClick={()=>viewProof(pay)}>Lihat Bukti</button>}</div>
    {pay?.review_note&&<div className="review-note"><b>Catatan admin:</b> {pay.review_note}</div>}
    {review&&<DesignApproval user={user} review={review} onUpdated={load}/>}
    <ProductionTimeline user={user} order={o}/>
  </article>})}</section>

  {conversation&&<OrderConversation user={user} order={conversation} onClose={()=>setConversation(null)}/>}
  {payOrder&&<div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setPayOrder(null)}><section className="payment-modal panel"><button className="modal-x" onClick={()=>setPayOrder(null)}>×</button><p className="micro">PEMBAYARAN MANUAL</p><h2>{payOrder.order_no}</h2><div className="payment-total"><span>Total</span><b>{money(payOrder.amount)}</b></div>
   {paymentSettings&&(paymentSettings.bank_name||paymentSettings.account_number)&&<div className="pay-destination"><span>Tujuan Pembayaran</span><b>{paymentSettings.bank_name||'Transfer'}</b><strong>{paymentSettings.account_number}</strong><small>a.n. {paymentSettings.account_holder||'-'}</small><button onClick={()=>navigator.clipboard?.writeText(paymentSettings.account_number||'')}>Salin Rekening</button></div>}
   {paymentSettings?.qris_image_url&&<div className="qris-box"><span>QRIS</span><img src={paymentSettings.qris_image_url} alt="QRIS"/></div>}
   {paymentSettings?.payment_note&&<p className="muted small-note">{paymentSettings.payment_note}</p>}
   <label>Metode<select value={method} onChange={e=>setMethod(e.target.value)}><option>Transfer Bank</option><option>QRIS Manual</option><option>E-Wallet</option></select></label><label>Bukti pembayaran<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setProof(e.target.files?.[0]||null)}/></label><p className="muted small-note">Versi ini belum memakai payment gateway. Admin akan memeriksa bukti secara manual.</p><button className="primary wide" disabled={busy} onClick={sendPayment}>{busy?'Mengirim...':'Kirim Bukti Pembayaran'}</button></section></div>}
  {proofPreview&&<div className="modal-backdrop" onClick={()=>setProofPreview(null)}><section className="proof-modal panel"><button className="modal-x" onClick={()=>setProofPreview(null)}>×</button>{proofPreview.startsWith('data:application/pdf')||proofPreview.includes('.pdf')?<iframe src={proofPreview}/>:<img src={proofPreview}/>}</section></div>}
 </main>
}
