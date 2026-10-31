/* Navegação e espaço lateral. Conteúdo e ações continuam no cofre autenticado. */
(() => {
  'use strict';
  let selected=null,returnFocus=null,overviewScroll=0;
  const blockedForms=new Set();
  function lockOverviewForms(){for(const form of document.querySelectorAll('#view form'))if(!form.inert){form.inert=true;blockedForms.add(form);}}
  const allowed=()=>window.RetornoMentor?.canNavigate()!==false;
  const mainTitle=()=>sections.find(s=>s[0]===(location.hash.slice(1).split('/')[0]||'hoje'))?.[2]||'Hoje';
  function stage(){
    let node=$('system-stage');if(node)return node;
    node=document.createElement('div');node.id='system-stage';$('view').before(node);node.append($('view'));
    const panel=document.createElement('section');panel.id='system-case';panel.hidden=true;panel.setAttribute('aria-label','Assunto em foco');
    panel.innerHTML='<div class="system-case-bar"><strong>Assunto em foco</strong><button type="button" id="system-close-case" aria-label="Fechar assunto e voltar à visão geral">Fechar ×</button></div><div id="system-context-actions"></div><div id="system-case-content"></div>';
    node.append(panel);$('system-close-case').onclick=()=>closeCase();return node;
  }
  function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
  function actionLinks(t){
    const links=[];const sources=t.sources||[],meeting=safeLink(t.schedule?.url);
    if(meeting)links.push({label:'Abrir reunião registrada',url:meeting,hint:'Link salvo neste assunto'});
    else if(t.type==='videoconferencia')links.push({label:'Criar link no Google Meet',url:'https://meet.google.com/new',hint:'Abre o Meet; depois registre o link na agenda'});
    if(sources.some(s=>s.type==='whatsapp')){
      const phone=sources.map(s=>s.chatJid?.match(/^(\d{8,15})@s\.whatsapp\.net$/)?.[1]).find(Boolean);
      const mobile=matchMedia('(max-width: 700px)').matches;
      links.push({label:phone?'Abrir conversa no WhatsApp':mobile?'Abrir aplicativo WhatsApp':'Abrir WhatsApp e escolher conversa',url:phone?'https://wa.me/'+phone:mobile?'whatsapp://':'https://web.whatsapp.com/',hint:phone?'Conversa pelo número registrado':'O identificador privado da fonte não é um número de telefone'});
    }
    if(sources.some(s=>s.type==='outlook'))links.push({label:'Abrir Outlook',url:'https://outlook.live.com/mail/0/',hint:'Atalho para sua caixa; selecione a conversa'});
    return links;
  }
  function contextActions(t){
    const bar=$('system-context-actions');bar.replaceChildren();
    for(const [label,pane,target]of [['Agendar próximo passo','plan','#mentor-next-at'],['Registrar retorno','memory','#mentor-entry']]){
      const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{
        if(!allowed())return;document.querySelector(`[data-mentor-pane="${pane}"]`)?.click();
        const field=document.querySelector(target);if(field){const details=field.closest('details');if(details)details.open=true;field.focus();}
      };bar.append(b);
    }
    for(const l of actionLinks(t)){const a=document.createElement('a');a.className='button';a.textContent=l.label+' ↗';a.href=l.url;a.target='_blank';a.rel='noopener noreferrer';a.title=l.hint;bar.append(a);}
    if(bar.querySelector('a')){const hint=document.createElement('small');hint.textContent='Atalhos abrem o serviço. Envios e convites dependem da sua ação.';bar.append(hint);}
  }
  function select(t){
    stage();const changed=selected!==t.id;if(!selected){returnFocus=document.activeElement;overviewScroll=window.scrollY;}
    selected=t.id;document.body.classList.add('system-case-open');$('system-case').hidden=false;
    $('title').textContent=mainTitle();contextActions(t);markSelected();lockOverviewForms();
    if(changed)requestAnimationFrame(()=>{if(selected!==t.id)return;const heading=$('system-case-content').querySelector('h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}$('system-case').scrollTop=0;if(matchMedia('(max-width:1099px)').matches)window.scrollTo({top:0,behavior:'instant'});});
    return $('system-case-content');
  }
  function markSelected(){document.querySelectorAll('#view [data-open]').forEach(b=>{if(b.dataset.open===selected)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});}
  function closeCase(focus=true){
    if(!allowed())return false;selected=null;document.body.classList.remove('system-case-open');
    for(const form of blockedForms)form.inert=false;blockedForms.clear();
    const panel=$('system-case');if(panel){panel.hidden=true;$('system-case-content').replaceChildren();$('system-context-actions').replaceChildren();}
    $('title').textContent=mainTitle();markSelected();
    if(focus){if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});window.scrollTo({top:overviewScroll,behavior:'instant'});}return true;
  }
  function search(){
    if($('system-search-form'))return;
    const form=document.createElement('form');form.id='system-search-form';form.setAttribute('role','search');
    form.innerHTML='<label for="system-search">Encontre um assunto</label><div class="system-search-line"><input id="system-search" type="search" autocomplete="off" placeholder="Buscar assunto, pessoa ou contexto…" aria-controls="system-search-results"><button type="submit">Buscar</button></div><div id="system-search-results" hidden></div>';
    $('sync').after(form);const input=$('system-search'),results=$('system-search-results');
    const populate=()=>{
      const q=input.value.trim().toLocaleLowerCase('pt-BR');results.replaceChildren();results.hidden=!q;if(!q)return;
      const matches=tasks.filter(t=>[t.title,t.context,t.area].join(' ').toLocaleLowerCase('pt-BR').includes(q));
      const status=document.createElement('small');status.setAttribute('role','status');status.textContent=matches.length?matches.length+' assuntos encontrados':'Nenhum assunto encontrado';results.append(status);
      for(const t of matches.slice(0,12)){const b=document.createElement('button');b.type='button';b.dataset.open=t.id;b.textContent=t.title+' · '+(statuses[t.status]||t.status);b.onclick=()=>{if(!allowed())return;results.hidden=true;editTask(t.id);};results.append(b);}
      if(matches.length>12){const small=document.createElement('small');small.textContent='Refine a busca para localizar outros resultados.';results.append(small);}
    };
    input.oninput=populate;form.onsubmit=e=>{e.preventDefault();populate();};
    form.addEventListener('keydown',e=>{if(e.key==='Escape'){results.hidden=true;e.stopPropagation();}if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('button')?.focus();}});
  }
  const oldBind=bind;
  bind=function(){oldBind();if(ready){stage();search();markSelected();if(selected)lockOverviewForms();}};
  const oldNew=$('new').onclick;
  $('new').onclick=e=>{if(!allowed())return;if(selected&&!closeCase(false))return;oldNew(e);};
  document.addEventListener('click',e=>{
    if(!selected)return;
    const navigation=e.target.closest('a[href^="#"],[data-open],[data-new],[data-money],[data-note],[data-note-edit],[data-finance],[data-meeting],#new');
    if(!navigation)return;
    if(!allowed()){e.preventDefault();e.stopImmediatePropagation();return;}
    if(!navigation.matches('[data-open]'))closeCase(false);
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selected&&!$('detail').open){e.preventDefault();closeCase();}});
  window.addEventListener('hashchange',()=>{if(selected&&allowed())closeCase(false);});
  window.RetornoShell={caseSurface:select,closeCase,actionLinks,safeLink};
  if(ready){stage();search();}
})();
