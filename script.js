
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
async function loadJSON(p){
  try{ const r=await fetch(p); if(!r.ok) throw 0; return await r.json(); }catch{ return null; }
}
function detectRepo(){
  const host=location.hostname;
  if(!/\.github\.io$/i.test(host)) return null;
  const owner=host.replace(/\.github\.io$/i,'');
  const seg=location.pathname.split('/').filter(Boolean);
  return {owner, repo: seg.length?seg[0]:`${owner}.github.io`};
}
async function discoverTracks(){
  const info=detectRepo();
  if(info){
    try{
      const r=await fetch(`https://api.github.com/repos/${info.owner}/${info.repo}/contents/data/tracks`);
      if(r.ok){
        const arr=await r.json();
        if(Array.isArray(arr)){
          const files=arr.filter(f=>f.type==='file'&&/\.json$/i.test(f.name));
          const list=await Promise.all(files.map(async f=>{
            const url=f.download_url||`https://raw.githubusercontent.com/${info.owner}/${info.repo}/HEAD/data/tracks/${f.name}`;
            const data=await loadJSON(url);
            return data?Object.assign({id:f.name.replace(/\.json$/i,'')},data):null;
          }));
          const ok=list.filter(Boolean);
          if(ok.length) return ok;
        }
      }
    }catch(e){}
  }
  const idx=await loadJSON('data/tracks.json');
  if(idx&&Array.isArray(idx.tracks)){
const list=await Promise.all(idx.tracks.map(async e=>{
    if(e.file){ const d=await loadJSON(e.file); return d?Object.assign({},e,d):null; }
    return e;
  }));
  return list.filter(Boolean);
  }
  return [];
}
(async()=>{
  const [profile,tracks,certs,contacts,socials,education,projectsFallback,stackFallback]=await Promise.all([
    loadJSON('data/profile.json'),
    discoverTracks(),
    loadJSON('data/certifications.json'),
    loadJSON('data/contacts.json'),
    loadJSON('data/socials.json'),
    loadJSON('data/education.json'),
    loadJSON('data/projects.json'),
    loadJSON('data/stack.json')
  ]);

  const renderMedia=(m)=>{
    if(!m) return '';
    const list=Array.isArray(m)?m:[m];
    return list.map(item=>{
      if(!item||!item.src) return '';
      const type=(item.type||'image').toLowerCase();
      const src=esc(item.src);
      const alt=esc(item.alt||'');
      if(type==='video'){
        const poster=item.poster?` poster="${esc(item.poster)}"`:'';
        return `<div class="p-media"><video autoplay loop muted playsinline${poster}><source src="${src}" type="video/mp4"></video></div>`;
      }
      if(type==='loom'){
        return `<div class="p-media"><iframe src="${src}" allowfullscreen loading="lazy" title="${alt||'Embedded video'}"></iframe></div>`;
      }
      return `<div class="p-media"><img src="${src}" alt="${alt}" loading="lazy"></div>`;
    }).join('');
  };
  const renderStack=(list)=>{
    document.getElementById('stackGrid').innerHTML=(list||[]).map(s=>`<div class="skill"><label>${esc(s.label)}</label><p>${esc(s.value)}</p></div>`).join('');
  };
  const renderProjects=(list)=>{
    list=list||[];
    const total=String(list.length).padStart(2,'0');
    document.getElementById('projectsList').innerHTML=list.map((p,i)=>{
      const num=String(i+1).padStart(2,'0');
      const title=p.url?`<a href="${esc(p.url)}" target="_blank">${esc(p.title)} ↗</a>`:esc(p.title);
      const tags=(p.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
      return `<div class="project"><div class="p-num">${num} / ${total}</div><div><h3>${title}</h3><p>${esc(p.description||'')}</p><div class="tags">${tags}</div>${renderMedia(p.media)}</div><div class="p-arrow">↗</div></div>`;
    }).join('');
  };

  const trackIndex=(Array.isArray(tracks)&&tracks.length)
    ? tracks.slice()
    : [{
        id:'default',
        label:(profile&&profile.title)||'Profile',
        icon:'fa-id-badge'
      }];
  trackIndex.sort((a,b)=>{
    const ao=(a.order==null?9999:Number(a.order)||9999);
    const bo=(b.order==null?9999:Number(b.order)||9999);
    if(ao!==bo) return ao-bo;
    return String(a.label||a.id).localeCompare(String(b.label||b.id));
  });
  const trackData={};
  trackIndex.forEach(e=>{ trackData[e.id]=e; });

  if(profile){
    document.title=`${profile.name} — ${profile.title}`;
    const brand=document.getElementById('brand');
    brand.textContent='PORTFOLIO';
    const img=document.getElementById('profileImg');
    img.src=profile.image||''; img.alt=profile.name||'';
    const h1=document.getElementById('profileName');
    const parts=(profile.name||'').trim().split(' ');
    if(parts.length>1){ const last=parts.pop(); h1.innerHTML=`${esc(parts.join(' '))} <em>${esc(last)}</em>`; } else h1.textContent=profile.name||'';
    document.getElementById('profileBio').textContent=profile.bio||'';
    document.getElementById('availability').innerHTML=`<span class="dot-live"></span> ${esc(profile.availability||'')}`;
    document.getElementById('ctaEmail').href=contacts&&contacts.email?`mailto:${contacts.email}`:'mailto:';
    document.getElementById('footerCopy').textContent='© kenpydev 2025';
  }

  const tabsEl=document.getElementById('trackTabs');
  function selectTrack(id,animate){
    const entry=trackIndex.find(x=>x.id===id)||trackIndex[0];
    if(!entry) return;
    const t=trackData[entry.id]||entry;
    const stack=(t.stack&&t.stack.length)?t.stack:(entry.stack||stackFallback||[]);
    const projects=(t.projects&&t.projects.length)?t.projects:(entry.projects||projectsFallback||[]);
    document.title=`${(profile&&profile.name)||'Portfolio'} — ${t.title||t.label||entry.label}`;
    const roleEl=document.getElementById('profileRole');
    if(roleEl) roleEl.textContent=t.title||t.label||entry.label||'';
    const badgesEl=document.getElementById('profileBadges');
    if(badgesEl){
      badgesEl.innerHTML=(t.badges||entry.badges||[]).map(b=>{
        if(!b) return '';
        const icon=b.icon?esc(b.icon):'';
        const attrs=b.url?`href="${esc(b.url)}" target="_blank" rel="noopener"`:'';
        return `<a class="badge" ${attrs} title="${esc(b.label||'')}" aria-label="${esc(b.label||'')}"${icon?` data-icon="${icon}"`:''}>${b.logo?`<img src="${esc(b.logo)}" alt="${esc(b.label||'')}">`:(icon?`<i class="${icon}"></i>`:'')}</a>`;
      }).join('');
      badgesEl.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{
        const a=img.closest('.badge');
        if(a) a.innerHTML=`<i class="${a.dataset.icon||'fa-solid fa-circle-question'}"></i>`;
      }));
    }
    document.getElementById('profileBio').textContent=t.bio||'';
    document.getElementById('availability').innerHTML=`<span class="dot-live"></span> ${esc(t.availability||'')}`;
    renderStack(stack);
    renderProjects(projects);
    const grid=document.getElementById('stackGrid');
    const list=document.getElementById('projectsList');
    if(animate !== false){
      [grid,list].forEach(el=>{ el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); });
    }
    [...tabsEl.querySelectorAll('.track-tab')].forEach(b=>{
      const on=b.dataset.id===entry.id;
      b.classList.toggle('active',on);
      b.setAttribute('aria-selected',on?'true':'false');
    });
    try{ history.replaceState(null,'','#'+entry.id); }catch(e){}
  }
  if(tabsEl){
    tabsEl.innerHTML=trackIndex.map(t=>`<button class="track-tab" role="tab" aria-selected="false" data-id="${esc(t.id)}">${t.icon?`<i class="fa-solid ${esc(t.icon)}"></i>`:''}${esc(t.label||t.id)}</button>`).join('');
    tabsEl.addEventListener('click',e=>{
      const b=e.target.closest('.track-tab');
      if(b&&b.dataset.id) selectTrack(b.dataset.id);
    });
    const hash=location.hash.replace('#','');
    selectTrack(trackIndex.some(t=>t.id===hash)?hash:trackIndex[0].id, false);
  }

  if(socials){
    const box=document.getElementById('socialsBox');
    box.innerHTML=socials.map(s=>`<div class="meta-row"><span>${esc(s.label)}</span><a href="${esc(s.url)}" target="_blank"><strong>${esc(s.handle)} →</strong></a></div>`).join('');
    const gh=socials.find(s=>s.label.toLowerCase()==='github');
    if(gh) document.getElementById('ctaGithub').href=gh.url;
  }

  if(certs){
    document.getElementById('certsList').innerHTML=certs.map(c=>`<li><a href="${esc(c.url)}" target="_blank"><div><div class="name">${esc(c.name)} ↗</div><div class="org">${esc(c.org)}</div></div></a></li>`).join('');
  }

  if(education){
    document.getElementById('educationList').innerHTML=education.map(e=>{
      const logo=e.logo?`<img src="${esc(e.logo)}" alt="" style="width:20px;height:20px;object-fit:cover;background:#fff;border:1px solid var(--line-light);border-radius:50%;pointer-events:auto"> `:``;
      const place=e.url?`<a href="${esc(e.url)}" target="_blank">${esc(e.place)} ↗</a>`:esc(e.place);
      const desc=e.desc?`<div class="t-desc">${esc(e.desc)}</div>`:'';
      return `<li><span class="t-date">${esc(e.date)}</span><div><div class="t-title">${esc(e.title)}</div><div class="t-place" style="display:flex;align-items:center;gap:6px">${logo}${place}</div>${desc}</div></li>`;
    }).join('');
  }

  if(contacts){
    const c=document.getElementById('contactsGrid');
    const phone=contacts.phone?`<div class="contact-cell"><label>Phone</label><span>${esc(contacts.phone)}</span></div>`:'';
    const email=contacts.email?`<div class="contact-cell"><label>Email</label><a href="mailto:${esc(contacts.email)}">${esc(contacts.email)}</a></div>`:'';
    const loc=contacts.location?`<div class="contact-cell"><label>Location</label><span>${esc(contacts.location)}</span></div>`:'';
    c.innerHTML=phone+email+loc;
    const ce=document.getElementById('ctaEmail');
    if(contacts.email) ce.href=`mailto:${contacts.email}`;
  }
})();



document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('copy',e=>e.preventDefault());
document.addEventListener('cut',e=>e.preventDefault());
document.addEventListener('selectstart',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&['c','x','s','p','u','a'].includes(e.key.toLowerCase()))e.preventDefault();
  if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&['i','j','c'].includes(e.key.toLowerCase())))e.preventDefault();
});
document.addEventListener('dragstart',e=>e.preventDefault());

const toTop=document.getElementById('toTop');
if(toTop){
  const toggle=()=>toTop.classList.toggle('hidden',window.scrollY<300);
  window.addEventListener('scroll',toggle,{passive:true});
  toggle();
  toTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
}
