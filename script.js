const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const toast=$('#toast');function showToast(t){toast.textContent=t;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),3000)}
const get=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const SUPABASE_URL='https://pctvejnflawjpgxjhvnu.supabase.co';
const SUPABASE_KEY='sb_publishable_UWPCdyTBmQW2c78SzknC7g_-R5Un4dU';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let currentSession=null,ownerAccess=false;
const nickname=()=>localStorage.getItem('facepuchNickname')||'';const isAdmin=()=>ownerAccess;
function syncAdmin(){ $('#adminEntry').hidden=false; }
function updateAdminPanel(){
  $('#adminLogin').hidden=ownerAccess;
  $('.admin-tabs').hidden=!ownerAccess;
  $('#adminLogout').hidden=!ownerAccess;
  $$('.admin-view').forEach((view,i)=>view.hidden=!ownerAccess||i!==0);
  $('#adminWarning').textContent=ownerAccess?'Подключено к общей базе FACEPUCH STUDIO. Изменения видны всем посетителям.':'Войди в аккаунт владельца Supabase, чтобы управлять сайтом.';
}
async function verifyOwner(session){
  currentSession=session;ownerAccess=false;
  if(session){
    const {data,error}=await sb.from('site_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
    ownerAccess=!!data&&!error;
  }
  updateAdminPanel();
  if(ownerAccess){await Promise.all([renderAdmin(),loadRemoteSettings()]);$('#profileOpen').innerHTML='<span class="online-dot"></span> Владелец <b class="admin-badge">ADMIN</b>';}
  else{$('#profileOpen').textContent=nickname()||'Профиль';}
}
async function initAuth(){
  const {data}=await sb.auth.getSession();await verifyOwner(data.session);
  sb.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>verifyOwner(session),0)});
}

function openModal(el){el.classList.add('open');el.setAttribute('aria-hidden','false')}function closeModal(el){el.classList.remove('open');el.setAttribute('aria-hidden','true')}
const details={rust2:{title:'RUST 2',text:'Раздел Rust 2 в каталоге FACEPUCH STUDIO. Здесь будут появляться новости и подтверждённая информация о проекте.',url:'#news',button:'Новости студии',note:'Информация о доступности и дате выхода здесь пока не публикуется.'},rust:{title:'RUST',text:'Rust — многопользовательская игра на выживание. FACEPUCH STUDIO — независимое сообщество и не является официальным сайтом игры.',url:'https://rust.facepunch.com/',button:'Официальный сайт Rust',note:'Переход на сайт разработчика.'},project:{title:'FACEPUCH: PROJECT 01',text:'Собственный проект студии находится в разработке.',url:'#news',button:'Следить за новостями',note:'Загрузка пока недоступна.'},soon:{title:'СКОРО',text:'Этот проект ещё готовится к публикации.',url:'#news',button:'Новости',note:'Кнопка загрузки станет активна после релиза.'}};
$$('[data-action]').forEach(b=>b.addEventListener('click',()=>{let d=details[b.dataset.action];$('#modalTitle').textContent=d.title;$('#modalText').textContent=d.text;$('#modalLink').textContent=d.button+' ↗';$('#modalLink').href=d.url;$('#modalNote').textContent=d.note;openModal($('#gameModal'))}));
$$('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.closest('.modal')));$$('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)closeModal(m)});
$('#profileOpen').onclick=()=>{let n=nickname();$('#nickname').value=n;$('.avatar').textContent=n?n[0].toUpperCase():'G';$('.profile-panel h2').textContent=n?n.toUpperCase():'ГОСТЬ';openModal($('#profileModal'))};$('#saveNickname').onclick=()=>{let v=$('#nickname').value.trim();if(!v)return showToast('Введи никнейм');localStorage.setItem('facepuchNickname',v);syncAdmin();$('.avatar').textContent=v[0].toUpperCase();$('.profile-panel h2').textContent=v.toUpperCase();closeModal($('#profileModal'));showToast(isAdmin()?'Вход владельца распознан.':'Никнейм сохранён локально')};
$('#adminEntry').onclick=()=>{openModal($('#adminModal'));updateAdminPanel();if(isAdmin())renderAdmin()};
$('#adminClose').onclick=()=>closeModal($('#adminModal'));$('#adminModal').onclick=e=>{if(e.target.id==='adminModal')closeModal($('#adminModal'))};
$('#adminLogin').onsubmit=async e=>{e.preventDefault();const email=$('#adminEmail').value.trim(),password=$('#adminPassword').value;if(!email||!password)return;const {data,error}=await sb.auth.signInWithPassword({email,password});if(error){showToast('Не удалось войти: проверь email и пароль');return;}await verifyOwner(data.session);if(!ownerAccess){await sb.auth.signOut();showToast('Этот аккаунт не добавлен в список владельцев Supabase');return;}$('#adminPassword').value='';showToast('Вход владельца выполнен');};
$('#adminLogout').onclick=async()=>{await sb.auth.signOut();await verifyOwner(null);showToast('Вы вышли из панели')};
function activateAdminTab(name){
  const target=$('#admin-'+name);
  if(!target)return;
  $$('.admin-tabs button').forEach(button=>{
    const active=button.dataset.tab===name;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });
  $$('.admin-view').forEach(view=>{view.hidden=view!==target;});
  renderAdmin();
}
// Делегирование не теряет обработчики после перерисовки содержимого панели.
$('.admin-tabs').addEventListener('click',event=>{
  const button=event.target.closest('button[data-tab]');
  if(button)activateAdminTab(button.dataset.tab);
});
async function renderNews(){
  const list=$('#newsList');if(!list)return;
  list.innerHTML='<p class="news-empty">Загружаем новости…</p>';
  const {data,error}=await sb.from('news').select('id,title,content,image_url,created_at').eq('published',true).order('created_at',{ascending:false});
  if(error){console.error(error);list.innerHTML='<p class="news-empty">Новости временно недоступны. Попробуй обновить страницу.</p>';return;}
  if(!data?.length){list.innerHTML='<p class="news-empty">Пока новостей нет. Новые публикации появятся здесь.</p>';return;}
  list.innerHTML=data.map(n=>`<article class="feed-card news-card">${n.image_url?`<img class="feed-image" src="${esc(n.image_url)}" alt="Изображение новости" loading="lazy">`:''}<div class="news-copy"><span class="feed-tag">НОВОСТЬ</span><h3>${esc(n.title||'Без заголовка')}</h3><p>${esc(n.content||'')}</p><small>${esc(new Date(n.created_at).toLocaleDateString('ru-RU'))}</small>${isAdmin()?`<button type="button" class="btn btn-ghost news-delete" data-news-delete="${esc(n.id)}">Удалить новость</button>`:''}</div></article>`).join('');
  if(!list.dataset.deleteBound){
    list.dataset.deleteBound='1';
    list.addEventListener('click',async event=>{
      const button=event.target.closest('[data-news-delete]');if(!button)return;
      if(!isAdmin())return showToast('Сначала войди как владелец');
      if(!confirm('Удалить эту новость?'))return;
      button.disabled=true;
      const {error}=await sb.from('news').delete().eq('id',button.dataset.newsDelete);
      if(error){console.error(error);button.disabled=false;showToast('Не удалось удалить новость');return;}
      await renderNews();showToast('Новость удалена');
    });
  }
}

function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function renderReviews(){
  const {data,error}=await sb.from('site_reviews').select('id,name,body,blocked,created_at').eq('blocked',false).order('created_at',{ascending:false});
  if(error){console.warn(error);return;}
  $('#reviewList').innerHTML=(data||[]).map(r=>`<article class="feed-card review-item"><span class="feed-tag">ОТЗЫВ</span><h3>${esc(r.name||'Гость')}</h3><p>${esc(r.body||'')}</p></article>`).join('');
}
$('#reviewForm').onsubmit=async e=>{e.preventDefault();const name=$('#reviewName').value.trim(),body=$('#reviewText').value.trim();const {error}=await sb.from('site_reviews').insert({name,body});if(error){console.error(error);showToast('Не удалось отправить отзыв');return;}$('#reviewText').value='';await renderReviews();showToast('Отзыв отправлен');};
$('#messageForm').onsubmit=async e=>{e.preventDefault();const name=$('#messageName').value.trim(),body=$('#messageText').value.trim();const {error}=await sb.from('site_messages').insert({name,body});if(error){console.error(error);showToast('Не удалось отправить сообщение');return;}$('#messageText').value='';showToast('Сообщение отправлено студии');};
async function renderAdmin(){
  if(!isAdmin())return;
  const [{data:messages,error:me},{data:reviews,error:re}] = await Promise.all([
    sb.from('site_messages').select('id,name,body,created_at').order('created_at',{ascending:false}),
    sb.from('site_reviews').select('id,name,body,blocked,created_at').order('created_at',{ascending:false})
  ]);
  if(me)console.error(me);if(re)console.error(re);
  $('#inboxList').innerHTML=messages?.length?messages.map(m=>`<article class="feed-card"><b>${esc(m.name||'Гость')}</b><p>${esc(m.body||'')}</p><small>${esc(new Date(m.created_at).toLocaleString('ru-RU'))}</small></article>`).join(''):'Сообщений пока нет.';
  const moderation=$('#moderationList');
  moderation.innerHTML=reviews?.length?reviews.map(r=>`<article class="feed-card"><span class="feed-tag">${r.blocked?'ЗАБЛОКИРОВАНО':'ОТЗЫВ'}</span><h3>${esc(r.name||'Гость')}</h3><p>${esc(r.body||'')}</p><div class="moderation-actions"><button type="button" class="btn btn-ghost" data-mod-toggle="${r.id}">${r.blocked?'Разблокировать':'Заблокировать'}</button><button type="button" class="btn btn-ghost" data-mod-delete="${r.id}">Удалить отзыв</button></div></article>`).join(''):'Пока нет отзывов для модерации.';
  moderation.onclick=async event=>{
    const toggle=event.target.closest('[data-mod-toggle]'),remove=event.target.closest('[data-mod-delete]');if(!toggle&&!remove)return;
    const id=Number((toggle||remove).dataset.modToggle??(toggle||remove).dataset.modDelete);
    if(toggle){const row=reviews.find(r=>r.id===id);const {error}=await sb.from('site_reviews').update({blocked:!row.blocked}).eq('id',id);if(error)showToast('Не удалось изменить отзыв');else showToast(row.blocked?'Отзыв разблокирован':'Отзыв заблокирован');}
    if(remove){if(!confirm('Удалить этот отзыв?'))return;const {error}=await sb.from('site_reviews').delete().eq('id',id);if(error)showToast('Не удалось удалить отзыв');else showToast('Отзыв удалён');}
    await renderReviews();await renderAdmin();
  };
  $('#statVisits').textContent=localStorage.getItem('fpVisits')||'1';
  $('#statReviews').textContent=reviews?.length||0;$('#statMessages').textContent=messages?.length||0;
}
async function uploadPublicFile(file,path){
  if(!isAdmin())throw new Error('Нужен вход владельца');
  if(file.size>50*1024*1024)throw new Error('Файл больше лимита 50 МБ');
  const {error}=await sb.storage.from('site-media').upload(path,file,{upsert:true,cacheControl:'3600',contentType:file.type||'application/octet-stream'});
  if(error)throw error;
  const {data}=sb.storage.from('site-media').getPublicUrl(path);return data.publicUrl;
}
async function saveSetting(key,value){const {error}=await sb.from('site_settings').upsert({key,value,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;}
async function getSettings(){const {data,error}=await sb.from('site_settings').select('key,value');if(error)throw error;return Object.fromEntries((data||[]).map(x=>[x.key,x.value]));}
$('#publishNews').onclick=async()=>{
  if(!isAdmin())return showToast('Сначала войди как владелец');
  const title=$('#newsTitle').value.trim(),body=$('#newsBody').value.trim(),file=$('#newsImage').files[0];
  if(!title||!body)return showToast('Заполни заголовок и текст');
  try{
    let image_url=null;if(file){if(!file.type.startsWith('image/'))return showToast('Выбери изображение');image_url=await uploadPublicFile(file,`news/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`);}
    const {error}=await sb.from('news').insert({title,content:body,image_url,published:true});if(error)throw error;
    await renderNews();$('#newsTitle').value='';$('#newsBody').value='';$('#newsImage').value='';showToast('Новость опубликована для всех посетителей');
  }catch(err){console.error(err);showToast('Ошибка публикации. Проверь вход и политики Supabase.');}
};
function applySiteSettings(settings={}){
  const title=settings.site_title??'СКОРО БУДЕТ ДОСТУПНО',desc=settings.site_description??'FACEPUCH STUDIO — игровое сообщество и зимняя атмосфера выживания.';
  const color=settings.background_color||'#17130f';
  document.documentElement.style.setProperty('--site-bg-color',color);
  $('.hero h1').innerHTML=esc(title).replace(' ','<br>');$('.hero-copy').textContent=desc;
  $('#editTitle').value=title;$('#editDescription').value=desc;$('#editBackgroundColor').value=color;
  const bg=settings.background_image_url||'';$('#editBackground').value=bg;
  document.documentElement.style.setProperty('--site-bg-image',bg?`url("${bg}")`:'none');
  $('#backgroundStatus').textContent=bg?'Фоновая картинка загружена для всех посетителей.':'Используется цвет фона.';
}
let remoteSettings={};
async function loadRemoteSettings(){
  try{remoteSettings=await getSettings();applySiteSettings({site_title:remoteSettings.site_title,site_description:remoteSettings.site_description,background_color:remoteSettings.background_color,background_image_url:remoteSettings.background_image_url});
    await loadLogo(remoteSettings.logo_url||'');await loadBackgroundVideo(remoteSettings.background_video_url||'',remoteSettings.background_video_enabled===true);
  }catch(err){console.error(err);showToast('Не удалось загрузить настройки Supabase');}
}
$('#saveSite').onclick=async()=>{
  if(!isAdmin())return showToast('Сначала войди как владелец');
  const title=$('#editTitle').value.trim(),desc=$('#editDescription').value.trim(),color=$('#editBackgroundColor').value;
  if(!title||!desc)return showToast('Заполни заголовок и описание');
  try{await Promise.all([saveSetting('site_title',title),saveSetting('site_description',desc),saveSetting('background_color',color)]);applySiteSettings({...remoteSettings,site_title:title,site_description:desc,background_color:color});showToast('Настройки обновлены у всех посетителей');}
  catch(err){console.error(err);showToast('Не удалось сохранить настройки Supabase');}
};
$('#uploadImage').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/'))return showToast('Выбери изображение');
  try{const url=await uploadPublicFile(file,'site/background-image');await saveSetting('background_image_url',url);remoteSettings.background_image_url=url;applySiteSettings({...remoteSettings,background_color:$('#editBackgroundColor').value});showToast('Общий фон обновлён для всех посетителей');}
  catch(err){console.error(err);showToast('Не удалось загрузить фон. Проверь лимит и права Storage.');}
};
async function loadBackgroundImage(){await loadRemoteSettings();}
// Обновляем общие настройки, чтобы новое состояние фонового видео появлялось у всех посетителей.
setInterval(async()=>{
  try{
    const fresh=await getSettings();
    const changed=fresh.background_video_url!==(remoteSettings.background_video_url||'')||fresh.background_video_enabled!==(remoteSettings.background_video_enabled===true);
    if(changed){remoteSettings={...remoteSettings,...fresh};await loadBackgroundVideo(fresh.background_video_url||'',fresh.background_video_enabled===true);}
  }catch(error){console.warn('Не удалось обновить состояние фонового видео:',error);}
},15000);
$('#removeBackground').onclick=async()=>{
  if(!isAdmin())return showToast('Сначала войди как владелец');
  try{await saveSetting('background_image_url','');remoteSettings.background_image_url='';applySiteSettings({...remoteSettings,background_color:$('#editBackgroundColor').value});$('#uploadImage').value='';showToast('Картинка фона убрана у всех посетителей');}
  catch(err){console.error(err);showToast('Не удалось изменить фон');}
};

$('#searchInput').oninput=$('#categoryFilter').onchange=()=>{let q=$('#searchInput').value.toLowerCase(),c=$('#categoryFilter').value,n=0;$$('.game-card').forEach(x=>{x.hidden=!(x.dataset.name.toLowerCase().includes(q)&&(c==='all'||x.dataset.category===c));if(!x.hidden)n++});$('#emptyState').hidden=n>0};
// Владелец может загрузить свой аудиофайл. Файл хранится в IndexedDB этого браузера.
let audioCtx=null,master=null,musicTimer=null,musicOn=false,customMusicUrl=null;
const customMusic=$('#customMusic');
const backgroundVideo=$('#backgroundVideo');let backgroundVideoUrl=null;
async function loadBackgroundVideo(url='',enabled=false){
  const toggle=$('#enableBackgroundVideo');
  toggle.disabled=false;
  toggle.checked=!!(url&&enabled);
  if(url){
    if(backgroundVideo.src!==url){backgroundVideo.pause();backgroundVideo.src=url;backgroundVideo.load();}
    backgroundVideo.muted=true;backgroundVideo.defaultMuted=true;backgroundVideo.loop=true;backgroundVideo.playsInline=true;
    backgroundVideo.hidden=!enabled;
    $('#videoStatus').textContent=enabled?'Общее видео включено для всех посетителей.':'Видео загружено, но выключено.';
    if(enabled){const playResult=backgroundVideo.play();if(playResult?.catch)playResult.catch(error=>console.warn('Автовоспроизведение видео заблокировано браузером:',error));}
    else backgroundVideo.pause();
  }else{
    backgroundVideo.pause();backgroundVideo.removeAttribute('src');backgroundVideo.load();backgroundVideo.hidden=true;
    $('#videoStatus').textContent='Видео не загружено.';
  }
}
$('#uploadVideo').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;if(file.type!=='video/mp4'&&!file.name.toLowerCase().endsWith('.mp4'))return showToast('Выбери видео MP4');
  try{const url=await uploadPublicFile(file,'site/background-video.mp4');await Promise.all([saveSetting('background_video_url',url),saveSetting('background_video_enabled',true)]);remoteSettings.background_video_url=url;remoteSettings.background_video_enabled=true;await loadBackgroundVideo(url,true);showToast('Фоновое видео обновлено у всех посетителей');}
  catch(err){console.error(err);showToast('Не удалось загрузить видео. Максимум 50 МБ.');}
};
const videoToggle=$('#enableBackgroundVideo');
videoToggle.onchange=async e=>{
  const wanted=e.target.checked;
  if(!isAdmin()){e.target.checked=!!remoteSettings.background_video_enabled;return showToast('Сначала войди как владелец');}
  if(!remoteSettings.background_video_url){e.target.checked=false;return showToast('Сначала загрузи MP4-видео');}
  e.target.disabled=true;
  try{
    await saveSetting('background_video_enabled',wanted);
    remoteSettings.background_video_enabled=wanted;
    await loadBackgroundVideo(remoteSettings.background_video_url,wanted);
    showToast(wanted?'Видео включено у всех посетителей':'Видео выключено у всех посетителей');
  }catch(err){console.error(err);e.target.checked=!wanted;showToast('Не удалось изменить настройку видео. Проверь права Supabase.');}
  finally{e.target.disabled=false;}
};
$('#removeVideo').onclick=async()=>{
  if(!isAdmin())return showToast('Сначала войди как владелец');
  try{await sb.storage.from('site-media').remove(['site/background-video.mp4']);await Promise.all([saveSetting('background_video_url',''),saveSetting('background_video_enabled',false)]);remoteSettings.background_video_url='';remoteSettings.background_video_enabled=false;await loadBackgroundVideo('',false);$('#uploadVideo').value='';showToast('Фоновое видео удалено для всех посетителей');}
  catch(err){console.error(err);showToast('Не удалось удалить видео');}
};
async function loadLogo(url=''){
  ['headerLogo','footerLogo'].forEach(id=>{const img=$('#'+id);if(url){img.src=url;img.hidden=false;const fallback=img.parentElement.querySelector('.logo-fallback');if(fallback)fallback.hidden=true;}else{img.removeAttribute('src');img.hidden=true;const fallback=img.parentElement.querySelector('.logo-fallback');if(fallback)fallback.hidden=false;}});
  if(url){$('#logoPreview').src=url;$('#logoPreview').hidden=false;$('#logoPreviewEmpty').hidden=true;}else{$('#logoPreview').removeAttribute('src');$('#logoPreview').hidden=true;$('#logoPreviewEmpty').hidden=false;}
}
$('#uploadLogo').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/'))return showToast('Выбери изображение логотипа');
  try{const url=await uploadPublicFile(file,'site/logo');await saveSetting('logo_url',url);remoteSettings.logo_url=url;await loadLogo(url);showToast('Логотип обновлён у всех посетителей');}
  catch(err){console.error(err);showToast('Не удалось загрузить логотип');}
};
$('#removeLogo').onclick=async()=>{
  if(!isAdmin())return showToast('Сначала войди как владелец');
  try{await sb.storage.from('site-media').remove(['site/logo']);await saveSetting('logo_url','');remoteSettings.logo_url='';await loadLogo('');$('#uploadLogo').value='';showToast('Логотип убран у всех посетителей');}
  catch(err){console.error(err);showToast('Не удалось удалить логотип');}
};

function openMusicDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('facepuchStudioMedia',1);req.onupgradeneeded=()=>req.result.createObjectStore('audio');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function saveMedia(key,file){const db=await openMusicDB();await new Promise((resolve,reject)=>{const tx=db.transaction('audio','readwrite');tx.objectStore('audio').put(file,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function readMedia(key){const db=await openMusicDB();const value=await new Promise((resolve,reject)=>{const req=db.transaction('audio','readonly').objectStore('audio').get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)});db.close();return value}
async function applyLogo(file){
  const url=URL.createObjectURL(file);
  ['headerLogo','footerLogo'].forEach(id=>{const img=$('#'+id);img.src=url;img.hidden=false;const fallback=img.parentElement.querySelector('.logo-fallback');if(fallback)fallback.hidden=true;});
  $('#logoPreview').src=url;$('#logoPreview').hidden=false;$('#logoPreviewEmpty').hidden=true;
}
async function loadLogo(){try{const file=await readMedia('siteLogo');if(file)await applyLogo(file)}catch(err){console.warn('Логотип не загружен',err)}}
$('#uploadLogo').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/'))return showToast('Выбери изображение логотипа');try{await saveMedia('siteLogo',file);await applyLogo(file);showToast('Логотип сохранён в этом браузере')}catch{showToast('Не удалось сохранить логотип')}};
$('#removeLogo').onclick=async()=>{try{await deleteMedia('siteLogo');['headerLogo','footerLogo'].forEach(id=>{const img=$('#'+id);img.removeAttribute('src');img.hidden=true;const fallback=img.parentElement.querySelector('.logo-fallback');if(fallback)fallback.hidden=false;});$('#logoPreview').removeAttribute('src');$('#logoPreview').hidden=true;$('#logoPreviewEmpty').hidden=false;$('#uploadLogo').value='';showToast('Логотип удалён')}catch{showToast('Не удалось удалить логотип')}};

async function deleteMedia(key){const db=await openMusicDB();await new Promise((resolve,reject)=>{const tx=db.transaction('audio','readwrite');tx.objectStore('audio').delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function saveMusicFile(file){const db=await openMusicDB();await new Promise((resolve,reject)=>{const tx=db.transaction('audio','readwrite');tx.objectStore('audio').put(file,'siteMusic');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function readMusicFile(){try{const db=await openMusicDB();const file=await new Promise((resolve,reject)=>{const req=db.transaction('audio','readonly').objectStore('audio').get('siteMusic');req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)});db.close();return file}catch{return null}}
async function clearMusicFile(){const db=await openMusicDB();await new Promise((resolve,reject)=>{const tx=db.transaction('audio','readwrite');tx.objectStore('audio').delete('siteMusic');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
function useCustomMusic(file){if(customMusicUrl)URL.revokeObjectURL(customMusicUrl);customMusicUrl=URL.createObjectURL(file);customMusic.src=customMusicUrl;$('#musicStatus').textContent='Загружен файл: '+file.name}
readMusicFile().then(file=>{if(file){useCustomMusic(file);$('#musicStatus').textContent='Твоя музыка загружена и сохранена в этом браузере.'}});
$('#uploadMusic').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('audio/'))return showToast('Выбери аудиофайл');try{await saveMusicFile(file);useCustomMusic(file);if(musicOn){await customMusic.play().catch(()=>{});clearInterval(musicTimer)}showToast('Музыка сохранена для этого браузера')}catch{showToast('Не удалось сохранить файл. Попробуй аудио поменьше.')}};
$('#removeMusic').onclick=async()=>{try{await clearMusicFile();customMusic.pause();customMusic.removeAttribute('src');customMusic.load();if(customMusicUrl)URL.revokeObjectURL(customMusicUrl);customMusicUrl=null;$('#musicStatus').textContent='Снова используется встроенная зимняя мелодия.';if(musicOn)music();showToast('Загруженная музыка удалена')}catch{showToast('Не удалось удалить музыку')}};
function tone(freq,dur,vol=.04,type='sine'){if(!audioCtx)return;let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g);g.connect(master);o.start();o.stop(audioCtx.currentTime+dur)}
function music(){let seq=[523,659,784,659,587,698,880,698,523,659,784,1046];let i=0;musicTimer=setInterval(()=>{tone(seq[i%seq.length],.42,.028,'triangle');if(i%3===0)tone(seq[i%seq.length]/2,.55,.012,'sine');i++},420)}
$('#soundToggle').onclick=async()=>{musicOn=!musicOn;if(musicOn){if(customMusic.src){try{await customMusic.play();clearInterval(musicTimer)}catch{musicOn=false;showToast('Нажми ещё раз, чтобы включить музыку');return}}else{if(!audioCtx){audioCtx=new(window.AudioContext||window.webkitAudioContext)();master=audioCtx.createGain();master.gain.value=.6;master.connect(audioCtx.destination)}await audioCtx.resume();music()}$('#soundToggle').textContent='♫ ЗВУК: ВКЛ'}else{customMusic.pause();clearInterval(musicTimer);$('#soundToggle').textContent='♫ ЗВУК: ВЫКЛ'}};
document.addEventListener('click',e=>{if(e.target.closest('button,a')&&audioCtx&&musicOn)tone(740,.08,.012,'square')});const tip=document.createElement('div');tip.className='santa-tip';tip.textContent='ХО-ХО-ХО! С Новым годом!';document.body.append(tip);$$('button,a').forEach(b=>b.addEventListener('mouseenter',()=>{tip.classList.add('show');setTimeout(()=>tip.classList.remove('show'),850)}));
// Snowfall canvas
(()=>{let c=$('#snowCanvas'),ctx=c.getContext('2d'),flakes=[];function size(){c.width=innerWidth*devicePixelRatio;c.height=innerHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);flakes=Array.from({length:Math.min(150,Math.floor(innerWidth/7))},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*2.4+.5,v:Math.random()*1.3+.4,w:Math.random()*1.1-.55}))}function draw(){ctx.clearRect(0,0,innerWidth,innerHeight);ctx.fillStyle='rgba(255,255,255,.8)';for(let f of flakes){ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();f.x+=f.w+.35;f.y+=f.v;if(f.y>innerHeight+5){f.y=-5;f.x=Math.random()*innerWidth}if(f.x>innerWidth+5)f.x=-5}requestAnimationFrame(draw)}addEventListener('resize',size);size();draw()})();
localStorage.setItem('fpVisits',String((+(localStorage.getItem('fpVisits')||0))+1));syncAdmin();updateAdminPanel();renderNews();renderReviews();loadBackgroundImage();initAuth();
