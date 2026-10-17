
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
const sk=(w,h,cls)=>`<span class="sk ${cls||'sk-line'}" style="width:${w};height:${h}"></span>`;
const skSet=(id,h)=>{ const el=document.getElementById(id); if(el) el.innerHTML=h; };
function paintSkeletons(){
  skSet('brand', sk('84px','11px'));
  skSet('footerCopy', sk('110px','11px'));
  skSet('profileName', sk('70%','30px'));
  skSet('profileRole', sk('130px','12px'));
  skSet('profileBio', sk('100%','16px','sk-line sk-block')+sk('82%','16px','sk-line sk-block')+'<span class="sk sk-block" style="width:64%;height:16px;margin-top:8px"></span>');
  skSet('availability', sk('150px','11px'));
  skSet('socialsBox', Array.from({length:3}).map(()=>`<div class="meta-row"><span class="sk" style="width:56px;height:11px"></span><span class="sk" style="width:110px;height:11px"></span></div>`).join(''));
  skSet('trackTabs', Array.from({length:3}).map(()=>sk('104px','34px','sk')).join(''));
  skSet('stackGrid', Array.from({length:6}).map(()=>`<div class="skill"><span class="sk sk-block" style="width:64px;height:10px"></span>${sk('92%','13px','sk-line sk-block')}</div>`).join(''));
  skSet('projectsList', Array.from({length:3}).map(()=>`<div class="project"><div class="p-num"><span class="sk" style="width:38px;height:11px"></span></div><div><span class="sk" style="width:40%;height:15px"></span>${sk('90%','13px','sk-line sk-block')}${sk('72%','13px','sk-line sk-block')}</div></div>`).join(''));
  skSet('certsList', Array.from({length:4}).map(()=>`<li><span class="sk" style="width:70px;height:12px"></span><span class="sk" style="width:44%;height:12px"></span></li>`).join(''));
  skSet('educationList', Array.from({length:3}).map(()=>`<li><span class="sk" style="width:56px;height:11px"></span><div>${sk('60%','13px','sk-line sk-block')}${sk('40%','11px','sk-line sk-block')}</div></li>`).join(''));
  skSet('contactsGrid', Array.from({length:3}).map(()=>`<div class="contact-cell"><span class="sk sk-block" style="width:52px;height:10px"></span><span class="sk sk-block" style="width:80%;height:13px;margin-top:9px"></span></div>`).join(''));
  const sq=document.querySelector('.profile-square');
  if(sq) sq.classList.add('sk');
}
// Runs synchronously before first paint so the page never looks empty.
paintSkeletons();

function whenVisible(el,fn){
  if(!el) return fn();
  if(!('IntersectionObserver' in window)) return fn();
  const io=new IntersectionObserver((entries,obs)=>{
    entries.forEach(en=>{ if(en.isIntersecting){ obs.disconnect(); fn(); } });
  },{rootMargin:'250px 0px'});
  io.observe(el);
}
function reveal(el){ if(el){ el.classList.remove('fade-in'); void el.offsetWidth; el.classList.add('fade-in'); } }

(async()=>{
  const pProfile=loadJSON('data/profile.json');
  const pTracks=discoverTracks();
  const pCerts=loadJSON('data/certifications.json');
  const pContacts=loadJSON('data/contacts.json');
  const pSocials=loadJSON('data/socials.json');
  const pEducation=loadJSON('data/education.json');
  const pStackFallback=loadJSON('data/stack.json');

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

  // Hero is painted as soon as the small profile/contacts/socials data arrives,
  // without waiting on the slower track discovery.
  const [profile,contacts,socials]=await Promise.all([pProfile,pContacts,pSocials]);

  if(profile){
    document.title=`${profile.name} — ${profile.title}`;
    const brand=document.getElementById('brand');
    brand.textContent='PORTFOLIO';
    const img=document.getElementById('profileImg');
    img.src=profile.image||''; img.alt=profile.name||'';
    const h1=document.getElementById('profileName');
    const parts=(profile.name||'').trim().split(' ');
    if(parts.length>1){ const last=parts.pop(); h1.innerHTML=`${esc(parts.join(' '))} <em>${esc(last)}</em>`; } else h1.textContent=profile.name||'';
    const sq=document.querySelector('.profile-square');
    if(sq) sq.classList.remove('sk');
    document.getElementById('profileBio').textContent=profile.bio||'';
    document.getElementById('availability').innerHTML=`<span class="dot-live"></span> ${esc(profile.availability||'')}`;
    document.getElementById('ctaEmail').href=contacts&&contacts.email?`mailto:${contacts.email}`:'mailto:';
    document.getElementById('footerCopy').textContent='© kenpydev 2025';
    reveal(document.querySelector('.hero-left'));
  }

  if(socials){
    const box=document.getElementById('socialsBox');
    box.innerHTML=socials.map(s=>`<div class="meta-row"><span>${esc(s.label)}</span><a href="${esc(s.url)}" target="_blank"><strong>${esc(s.handle)} →</strong></a></div>`).join('');
    const gh=socials.find(s=>s.label.toLowerCase()==='github');
    if(gh) document.getElementById('ctaGithub').href=gh.url;
    reveal(box);
  }

  // Below-the-fold sections are only rendered once scrolled near, so the first
  // paint stays light and is never blocked by the slower track discovery.
  whenVisible(document.getElementById('contactsGrid'),()=>{
    const c=document.getElementById('contactsGrid');
    const phone=contacts&&contacts.phone?`<div class="contact-cell"><label>Phone</label><span>${esc(contacts.phone)}</span></div>`:'';
    const email=contacts&&contacts.email?`<div class="contact-cell"><label>Email</label><a href="mailto:${esc(contacts.email)}">${esc(contacts.email)}</a></div>`:'';
    const loc=contacts&&contacts.location?`<div class="contact-cell"><label>Location</label><span>${esc(contacts.location)}</span></div>`:'';
    c.innerHTML=phone+email+loc;
    reveal(c);
  });

  whenVisible(document.getElementById('certsList'),async()=>{
    const certs=await pCerts;
    const el=document.getElementById('certsList');
    el.innerHTML=(certs||[]).map(c=>`<li><a href="${esc(c.url)}" target="_blank"><div><div class="name">${esc(c.name)} ↗</div><div class="org">${esc(c.org)}</div></div></a></li>`).join('');
    reveal(el);
  });

  whenVisible(document.getElementById('educationList'),async()=>{
    const education=await pEducation;
    const el=document.getElementById('educationList');
    el.innerHTML=(education||[]).map(e=>{
      const logo=e.logo?`<img src="${esc(e.logo)}" alt="" style="width:20px;height:20px;object-fit:cover;background:#fff;border:1px solid var(--line-light);border-radius:50%;pointer-events:auto"> `:``;
      const place=e.url?`<a href="${esc(e.url)}" target="_blank">${esc(e.place)} ↗</a>`:esc(e.place);
      const desc=e.desc?`<div class="t-desc">${esc(e.desc)}</div>`:'';
      return `<li><span class="t-date">${esc(e.date)}</span><div><div class="t-title">${esc(e.title)}</div><div class="t-place" style="display:flex;align-items:center;gap:6px">${logo}${place}</div>${desc}</div></li>`;
    }).join('');
    reveal(el);
  });

  const [tracks,stackFallback]=await Promise.all([pTracks,pStackFallback]);

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

  const tabsEl=document.getElementById('trackTabs');
  function moveInd(){
    if(!tabsEl) return;
    const ind=tabsEl.querySelector('.track-ind');
    const active=tabsEl.querySelector('.track-tab.active');
    if(!ind||!active) return;
    ind.style.width=active.offsetWidth+'px';
    ind.style.transform=`translateX(${active.offsetLeft}px)`;
  }
  function selectTrack(id,animate){
    const entry=trackIndex.find(x=>x.id===id)||trackIndex[0];
    if(!entry) return;
    const t=trackData[entry.id]||entry;
    const stack=(t.stack&&t.stack.length)?t.stack:(entry.stack||stackFallback||[]);
    const projects=(t.projects&&t.projects.length)?t.projects:(entry.projects||[]);
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
    moveInd();
    try{ history.replaceState(null,'','#'+entry.id); }catch(e){}
  }
  if(tabsEl){
    tabsEl.innerHTML='<span class="track-ind" aria-hidden="true"></span>'+trackIndex.map(t=>`<button class="track-tab" role="tab" aria-selected="false" data-id="${esc(t.id)}">${t.icon?`<i class="fa-solid ${esc(t.icon)}"></i>`:''}${esc(t.label||t.id)}</button>`).join('');
    tabsEl.addEventListener('click',e=>{
      const b=e.target.closest('.track-tab');
      if(b&&b.dataset.id) selectTrack(b.dataset.id);
    });
    const hash=location.hash.replace('#','');
    selectTrack(trackIndex.some(t=>t.id===hash)?hash:trackIndex[0].id, false);
    reveal(tabsEl.querySelector('.track-tab.active'));
    reveal(document.getElementById('stackGrid'));
    reveal(document.getElementById('projectsList'));
    requestAnimationFrame(moveInd);
    window.addEventListener('resize',moveInd,{passive:true});
    window.addEventListener('load',moveInd);
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(moveInd);
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

function initReveal(){
  const els=document.querySelectorAll('[data-reveal]');
  if(!els.length) return;
  if(!('IntersectionObserver' in window)){ els.forEach(e=>e.classList.add('in')); return; }
  const io=new IntersectionObserver((entries,obs)=>{
    entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in'); obs.unobserve(en.target); } });
  },{rootMargin:'0px 0px -8% 0px',threshold:.08});
  els.forEach(e=>io.observe(e));
}

function initNavSpy(){
  const links=[...document.querySelectorAll('.nav-links a')];
  if(!links.length||!('IntersectionObserver' in window)) return;
  const map={};
  links.forEach(a=>{ const t=document.querySelector(a.getAttribute('href')); if(t&&t.id) map[t.id]=a; });
  const io=new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(en.isIntersecting) links.forEach(a=>a.classList.toggle('active',a===map[en.target.id]));
    });
  },{rootMargin:'-45% 0px -50% 0px',threshold:0});
  Object.keys(map).forEach(id=>io.observe(document.getElementById(id)));
}

function initPointerFX(){
  if(!matchMedia('(pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  document.addEventListener('pointermove',e=>{
    const el=e.target.closest('.project,.skill,.contact-cell,.hero-right,.btn');
    if(!el) return;
    const r=el.getBoundingClientRect();
    el.style.setProperty('--mx',(e.clientX-r.left)+'px');
    el.style.setProperty('--my',(e.clientY-r.top)+'px');
  },{passive:true});
  const hc=document.querySelector('.hero-right');
  if(hc){
    hc.addEventListener('pointermove',e=>{
      const r=hc.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      hc.style.transform=`perspective(900px) rotateX(${(-y*4).toFixed(2)}deg) rotateY(${(x*5).toFixed(2)}deg) translateY(-2px)`;
    });
    hc.addEventListener('pointerleave',()=>{ hc.style.transform=''; });
  }
}

function initScrollUI(){
  const top=document.getElementById('toTop');
  const progress=document.getElementById('progress');
  const onScroll=()=>{
    const h=document.documentElement;
    const max=h.scrollHeight-h.clientHeight;
    if(progress) progress.style.transform=`scaleX(${max>0?h.scrollTop/max:0})`;
    if(top) top.classList.toggle('hidden',window.scrollY<300);
  };
  window.addEventListener('scroll',onScroll,{passive:true});
  onScroll();
  if(top) top.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
}

initReveal();
initNavSpy();
initPointerFX();
initScrollUI();
