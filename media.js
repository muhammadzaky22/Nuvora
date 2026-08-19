import {cloudEnabled,supabase} from './supabase'

export async function compressImage(file,maxWidth=1400,quality=.78){
  if(!file?.type?.startsWith('image/')) throw new Error('File harus berupa gambar')
  const bitmap=await createImageBitmap(file)
  const scale=Math.min(1,maxWidth/bitmap.width)
  const canvas=document.createElement('canvas')
  canvas.width=Math.max(1,Math.round(bitmap.width*scale))
  canvas.height=Math.max(1,Math.round(bitmap.height*scale))
  const ctx=canvas.getContext('2d')
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height)
  bitmap.close?.()
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality))
  if(!blob) throw new Error('Gagal memproses gambar')
  return new File([blob],(file.name.replace(/\.[^.]+$/,'')||'image')+'.webp',{type:'image/webp'})
}

export async function uploadInvitationImage(ownerId,invitationId,file,prefix='gallery'){
  const compressed=await compressImage(file)
  if(!cloudEnabled){
    return await new Promise((resolve,reject)=>{
      const fr=new FileReader()
      fr.onload=()=>resolve(fr.result)
      fr.onerror=reject
      fr.readAsDataURL(compressed)
    })
  }
  const path=`${ownerId}/${invitationId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}.webp`
  const {error}=await supabase.storage.from('media').upload(path,compressed,{upsert:false,cacheControl:'31536000'})
  if(error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

export async function uploadPaymentProof(userId,orderId,file){
  if(!file) throw new Error('Pilih bukti pembayaran')
  const allowed=['image/jpeg','image/png','image/webp','application/pdf']
  if(!allowed.includes(file.type)) throw new Error('Bukti pembayaran harus JPG, PNG, WEBP, atau PDF')
  if(file.size>8*1024*1024) throw new Error('Ukuran bukti maksimal 8 MB')

  if(!cloudEnabled){
    let localFile=file
    if(file.type.startsWith('image/')) localFile=await compressImage(file,1200,.72)
    if(localFile.size>1800000) throw new Error('Pada mode lokal, bukti maksimal sekitar 1.8 MB. Gunakan Cloud/Supabase untuk file lebih besar.')
    return await new Promise((resolve,reject)=>{
      const fr=new FileReader()
      fr.onload=()=>resolve({path:fr.result,preview_url:fr.result})
      fr.onerror=reject
      fr.readAsDataURL(localFile)
    })
  }
  const ext=(file.name.split('.').pop()||'bin').toLowerCase()
  const path=`${userId}/${orderId}/proof-${Date.now()}.${ext}`
  const {error}=await supabase.storage.from('payment-proofs').upload(path,file,{upsert:false,cacheControl:'3600'})
  if(error) throw error
  const {data,error:signError}=await supabase.storage.from('payment-proofs').createSignedUrl(path,3600)
  if(signError) throw signError
  return {path,preview_url:data.signedUrl}
}

export async function signedPaymentProof(path){
  if(!path) return ''
  if(!cloudEnabled) return path
  const {data,error}=await supabase.storage.from('payment-proofs').createSignedUrl(path,3600)
  if(error) throw error
  return data.signedUrl
}
