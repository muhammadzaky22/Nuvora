import {useEffect,useState} from 'react'
import QRCode from 'qrcode'
import {buildPublicLink} from '../lib/repo'

export default function GuestPass({guest,invitation,onClose}){
 const[qr,setQr]=useState('')
 const url=buildPublicLink(invitation.slug,guest.name,guest.token)
 useEffect(()=>{QRCode.toDataURL(`NUVORA:${guest.token}`,{width:420,margin:2,errorCorrectionLevel:'M'}).then(setQr)},[guest.token])
 const share=async()=>{
  const text=`Yth. ${guest.name}\n\nSilakan buka undangan melalui link berikut:\n${url}\n\nSimpan QR Pass untuk check-in di hari acara.`
  if(navigator.share){try{return await navigator.share({title:invitation.title,text})}catch{}}
  try{await navigator.clipboard.writeText(text);alert('Pesan undangan disalin')}catch{prompt('Salin pesan:',text)}
 }
 return <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
  <section className="pass-modal panel">
   <button className="modal-x" onClick={onClose}>×</button>
   <p className="micro">DIGITAL GUEST PASS</p>
   <h2>{invitation.title}</h2>
   <div className="pass-name"><span>Kepada</span><b>{guest.name}</b><small>Kuota {guest.guest_count} orang</small></div>
   {qr?<img className="qr-img" src={qr} alt="QR Guest Pass"/>:<div className="qr-loading">Membuat QR...</div>}
   <p className="pass-hint">QR ini berisi token check-in unik tamu. Jangan gunakan QR tamu lain.</p>
   <div className="pass-actions"><button className="primary" onClick={share}>Bagikan Pass</button><button className="secondary" onClick={()=>{navigator.clipboard?.writeText(url);alert('Link disalin')}}>Salin Link</button></div>
  </section>
 </div>
}
