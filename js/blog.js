// Datos y utilidades compartidas por blog.html y blog-admin.html (se guardan en este navegador)
const MB={
 LK:'miblog-liked',
 samples:[
  {id:'e1',title:'Consejo del día',text:'Hola! saludos a todos aquellos que frecuentan este lado del internet.\n\nEl consejo del día es: prueba paletas de colores complementarios para tus diseños si quieres generar contrastes interesantes.',image:'assets/evento-1.jpg',status:'published',date:'2026-09-16T12:00:00.000Z',hearts:3},
  {id:'e2',title:'Publicación de ejemplo',text:'Aquí va la descripción de tu publicación. Reemplázala desde el panel.',image:'assets/pawcare.jpg',status:'published',date:'2026-10-02T12:00:00.000Z',hearts:1},
  {id:'e3',title:'Otro ejemplo',text:'Otra publicación de muestra para ver el orden por fecha.',image:'assets/landing.jpg',status:'published',date:'2026-10-10T12:00:00.000Z',hearts:0}],
 liked(){try{return JSON.parse(localStorage.getItem(this.LK))||[]}catch(e){return[]}},
 setLiked(a){try{localStorage.setItem(this.LK,JSON.stringify(a))}catch(e){}},
 esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 fmt(d){const x=new Date(d);return String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0')+'/'+String(x.getFullYear()).slice(2)},
 byDate(a,desc=true){return a.slice().sort((x,y)=>(desc?-1:1)*(x.date<y.date?-1:x.date>y.date?1:0))},
 img:f=>new Promise(res=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,900/i.width),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.82))};i.src=r.result};r.readAsDataURL(f)}),
 alert(msg,title='AVISO'){let d=document.getElementById('dlg');
  if(!d){d=document.createElement('dialog');d.id='dlg';d.className='win alert';d.innerHTML='<header><span id="dt"></span><span><i></i><i></i><i></i></span></header><div class="body"><p id="dm" role="alert"></p><button class="ok" type="button">ok</button></div>';document.body.appendChild(d);d.querySelector('.ok').onclick=()=>d.close()}
  d.querySelector('#dt').textContent=title;d.querySelector('#dm').textContent=msg;d.showModal()},
 heart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C5 16 2 12 2 8.5 2 5.5 4.3 3.5 7 3.5c2 0 3.8 1.2 5 3 1.2-1.8 3-3 5-3 2.7 0 5 2 5 5C22 12 19 16 12 21z"/></svg>'
};
// ---- Vista pública: datos desde la API (sin servidor se muestran ejemplos) ----
if(document.getElementById('feed')){
 const feed=document.getElementById('feed'),sort=document.getElementById('sort');let desc=true,all=[];
 const draw=id=>{const lk=MB.liked(),ps=MB.byDate(all,desc);
  feed.innerHTML=ps.length?ps.map(p=>`<article class="post">${p.image?`<div class="shot"><img src="${MB.esc(p.image)}" alt=""></div>`:''}<h3>${MB.esc(p.title)}</h3><time datetime="${p.date}">${MB.fmt(p.date)}</time><p>${MB.esc(p.text)}</p><footer><button class="heart${lk.includes(p.id)?' on':''}" data-id="${p.id}" aria-pressed="${lk.includes(p.id)}" aria-label="Me encanta">${MB.heart}<b>${p.hearts||0}</b></button></footer></article>`).join(''):'<p class="empty">Todavía no hay publicaciones.</p>';
  const b=id&&feed.querySelector(`[data-id="${id}"]`);if(b&&b.classList.contains('on'))b.classList.add('pop')};
 feed.addEventListener('click',async e=>{const b=e.target.closest('.heart');if(!b)return;
  const id=b.dataset.id,p=all.find(x=>x.id===id),lk=MB.liked(),on=!lk.includes(id);
  if(on){lk.push(id);p.hearts=(p.hearts||0)+1}else{lk.splice(lk.indexOf(id),1);p.hearts=Math.max(0,(p.hearts||0)-1)}
  MB.setLiked(lk);draw(id);
  try{p.hearts=(await API.req('/public/posts/'+id+'/hearts',{method:on?'POST':'DELETE'})).hearts;draw(id)}catch(err){}});
 sort.onclick=()=>{desc=!desc;sort.textContent=desc?'Más recientes':'Más antiguas';draw()};
 API.req('/public/posts').then(r=>all=r).catch(()=>all=MB.samples).then(()=>draw());
}
