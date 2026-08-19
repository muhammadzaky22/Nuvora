import * as XLSX from 'xlsx'

const pick=(row,names)=>{
  for(const n of names){
    const key=Object.keys(row).find(k=>k.trim().toLowerCase()===n.toLowerCase())
    if(key!==undefined && row[key]!==undefined && row[key]!==null) return row[key]
  }
  return ''
}

export async function parseGuestWorkbook(file){
  const bytes=await file.arrayBuffer()
  const wb=XLSX.read(bytes,{type:'array'})
  const ws=wb.Sheets[wb.SheetNames[0]]
  const rows=XLSX.utils.sheet_to_json(ws,{defval:''})
  return rows.map(r=>({
    name:String(pick(r,['Nama','Name','Nama Tamu','Tamu'])).trim(),
    group_name:String(pick(r,['Grup','Group','Kelompok','Kategori'])).trim(),
    phone:String(pick(r,['WhatsApp','Whatsapp','WA','Phone','No HP','Nomor'])).trim(),
    guest_count:Number(pick(r,['Jumlah Tamu','Jumlah','Kuota','Guest Count','Pax']))||1
  })).filter(x=>x.name)
}

export function exportGuestsWorkbook(guests, invitationTitle='Undangan'){
  const rows=guests.map((g,i)=>({
    No:i+1,
    Nama:g.name,
    Grup:g.group_name||'',
    WhatsApp:g.phone||'',
    Kuota:Number(g.guest_count||1),
    'Status Check-in':g.checked_in_at?'Sudah Hadir':'Belum',
    'Waktu Check-in':g.checked_in_at?new Date(g.checked_in_at).toLocaleString('id-ID'):''
  }))
  const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{No:'',Nama:'',Grup:'',WhatsApp:'',Kuota:''}])
  ws['!cols']=[{wch:6},{wch:28},{wch:18},{wch:18},{wch:10},{wch:18},{wch:24}]
  const wb=XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb,ws,'Daftar Tamu')
  const safe=invitationTitle.replace(/[\\/:*?"<>|]/g,'-').slice(0,40)||'Undangan'
  XLSX.writeFile(wb,`Tamu-${safe}.xlsx`,{compression:true})
}

export function downloadGuestTemplate(){
  const data=[
    {Nama:'Bapak Ahmad dan Keluarga',Grup:'Keluarga',WhatsApp:'081234567890','Jumlah Tamu':2},
    {Nama:'Ibu Rina',Grup:'Teman',WhatsApp:'081234567891','Jumlah Tamu':1}
  ]
  const ws=XLSX.utils.json_to_sheet(data)
  ws['!cols']=[{wch:30},{wch:18},{wch:18},{wch:14}]
  const wb=XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb,ws,'Template Tamu')
  XLSX.writeFile(wb,'Template-Tamu-Nuvora.xlsx',{compression:true})
}
