export default function Menu({isAdmin,unread,onNavigate}){
 const items=[
  ['invitations','▣','Undangan','Edit, publish, dan share project'],
  ['guests','♙','Tamu','Guest list, Excel, QR Pass'],
  ['checkin','⌁','Check-in','Scanner QR untuk hari H'],
  ['analytics','◔','Analytics','Lihat performa undangan'],
  ['notifications','◉','Notifikasi',unread?`${unread} belum dibaca`:'Aktivitas terbaru'],
  ...(isAdmin?[['admin','⚙','Admin','Order, pembayaran, tema, desain']]:[]),
  ['profile','○','Profil','Akun dan pengaturan aplikasi']
 ]
 return <main className="content-page">
  <header className="topline"><div><p className="micro">MENU</p><h2>Semua fitur</h2></div></header>
  <section className="menu-grid">{items.map(([id,icon,title,desc])=><button className="menu-card panel" key={id} onClick={()=>onNavigate(id)}><span>{icon}</span><div><b>{title}{id==='notifications'&&unread>0?<i>{unread}</i>:null}</b><small>{desc}</small></div><strong>›</strong></button>)}</section>
 </main>
}
