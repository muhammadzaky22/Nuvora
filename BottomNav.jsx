export default function BottomNav({screen,onChange,unread=0}){
 const sub=['invitations','guests','checkin','analytics','notifications','admin','profile']
 const active=sub.includes(screen)?'menu':screen
 const items=[['home','⌂','Home'],['catalog','◇','Tema'],['create','+','Buat'],['orders','¤','Pesanan'],['menu','☰','Menu']]
 return <nav className="bottom-nav main-five">{items.map(([id,icon,label])=><button key={id} className={active===id?'active':''} onClick={()=>onChange(id)}><span className={id==='create'?'nav-create':'nav-icon'}>{icon}{id==='menu'&&unread>0?<i className="nav-badge">{unread>99?'99+':unread}</i>:null}</span><small>{label}</small></button>)}</nav>
}
