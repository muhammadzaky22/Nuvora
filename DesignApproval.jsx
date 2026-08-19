import {useState} from 'react'
import {respondDesignReview} from '../lib/business'

export default function DesignApproval({user,review,onUpdated}){
 const[busy,setBusy]=useState(false)
 const respond=async status=>{
  const note=status==='changes_requested'?(prompt('Tulis perubahan yang kamu inginkan:','')||''):(prompt('Catatan persetujuan (opsional):','')||'')
  if(status==='changes_requested'&&!note.trim())return
  try{setBusy(true);await respondDesignReview(user.id,review.id,status,note);await onUpdated?.()}catch(e){alert(e.message)}finally{setBusy(false)}
 }
 return <section className={`design-approval panel state-${review.status}`}>
  <div><p className="micro">DESIGN REVIEW • V{review.version}</p><h3>{review.invitations?.title||'Preview undangan'}</h3><p>{review.admin_note||'Silakan periksa desain terbaru.'}</p>{review.customer_note&&<div className="customer-note"><b>Catatan kamu:</b> {review.customer_note}</div>}</div>
  <div className="design-review-side"><span className={`review-status r-${review.status}`}>{review.status}</span><button className="preview-design" onClick={()=>{const u=new URL(location.href);u.search='';u.searchParams.set('preview',review.invitation_id);open(u.toString(),'_blank')}}>Preview Desain</button>{review.status==='pending'&&<div><button disabled={busy} className="approve" onClick={()=>respond('approved')}>Setujui</button><button disabled={busy} className="change" onClick={()=>respond('changes_requested')}>Minta Perubahan</button></div>}</div>
 </section>
}
