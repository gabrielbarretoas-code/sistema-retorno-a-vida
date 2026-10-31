/* Orientação por regras sobre dados autenticados. Nenhum dado pessoal integra este arquivo. */
(() => {
  'use strict';
  const VALUES=['Deus','Família','Saúde','Provimento','Sucesso','Paz de Espírito'];
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const short=(value,max=220)=>String(value||'').length>max?String(value).slice(0,max-1)+'…':String(value||'');
  const closed=t=>['concluida','descartada'].includes(t.status);
  const date=value=>value?new Date(value.length===10?value+'T23:59:59.999-03:00':value):null;
  const displayDate=value=>value&&value.length===10?new Date(value+'T12:00:00-03:00').toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):fmt(value);
  const validDate=value=>date(value)&&Number.isFinite(date(value).getTime());
  const profile=()=>records.find(r=>r.id==='mentoria-perfil')?.data||{};
  const navigation=()=>records.find(r=>r.id==='system-navigation')?.data||{};
  const memo=t=>records.find(r=>r.kind==='note'&&r.data?.category==='mentor-plan'&&r.data.taskId===t.id);
  const nowMinutes=(now=new Date())=>{const parts=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);return Number(parts.find(p=>p.type==='hour').value)*60+Number(parts.find(p=>p.type==='minute').value);};
  const protectedMorning=now=>nowMinutes(now)>=330&&nowMinutes(now)<540;
  const personal=t=>['familiar','familia','saude','espiritual'].includes(normalize(t.area));
  const safeHref=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
  let dirty=false,dirtySection=null,caseId=null;
  const shaConstants=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function sha256(text){
    const bytes=new TextEncoder().encode(text),buffer=new Uint8Array(Math.ceil((bytes.length+9)/64)*64),view=new DataView(buffer.buffer);buffer.set(bytes);buffer[bytes.length]=128;view.setUint32(buffer.length-4,bytes.length*8);view.setUint32(buffer.length-8,Math.floor(bytes.length/0x20000000));
    const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],ro=(x,n)=>(x>>>n)|(x<<(32-n)),w=new Int32Array(64);
    for(let block=0;block<buffer.length;block+=64){for(let i=0;i<16;i++)w[i]=view.getInt32(block+i*4);for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(ro(x,7)^ro(x,18)^(x>>>3))+w[i-7]+(ro(y,17)^ro(y,19)^(y>>>10)))|0;}let [a,b,c,d,e,f,g,k]=h;for(let i=0;i<64;i++){const t1=(k+(ro(e,6)^ro(e,11)^ro(e,25))+((e&f)^(~e&g))+shaConstants[i]+w[i])|0,t2=((ro(a,2)^ro(a,13)^ro(a,22))+((a&b)^(a&c)^(b&c)))|0;k=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}[a,b,c,d,e,f,g,k].forEach((v,i)=>h[i]=(h[i]+v)|0);}
    return h.map(n=>(n>>>0).toString(16).padStart(8,'0')).join('');
  }
  const contextFields=['id','title','area','status','context','nextStep','uncertainties','due','schedule','responsible','sources','documents','links','feedback'];
  const canonical=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  const contextCases=t=>records.filter(r=>r.kind==='note'&&r.data?.category==='contextual-case-report'&&(r.data.case?.taskIds||[]).includes(t.id)).sort((a,b)=>a.id.localeCompare(b.id));
  function contextFingerprint(t){
    const payload=Object.fromEntries(contextFields.map(k=>[k,t[k]??null])),cases=contextCases(t);
    if(cases.length)payload.contextualCaseSources=cases.map(r=>({id:r.id,...Object.fromEntries(['person','fields','case','paymentEvents','claims','documents','contextUpdates','sources','distinctions','audioAnalysisRecordIds'].map(k=>[k,r.data[k]??null])),analyses:records.filter(a=>(r.data.audioAnalysisRecordIds||[]).includes(a.id)).sort((a,b)=>a.id.localeCompare(b.id)).map(a=>({id:a.id,mediaSha256:a.data.mediaSha256??null,machineTranscription:a.data.machineTranscription??null,reviewedTranscript:a.data.reviewedTranscript??null}))}));
    return 'sha256:'+sha256(canonical(payload));
  }

  function analyze(t,p={},saved={},now=new Date()){
    const words=normalize([t.title,t.context,t.nextStep,t.type].join(' '));
    const financial=normalize(t.area)==='financeiro'||/\b(pagamento|pagar|boleto|divida|cobranca)\b/.test(words);
    const meeting=/visita|reuniao|comparecer|chegar.{0,20}antes|videoconferencia/.test(words)||['presencial','videoconferencia','chamada'].includes(t.type);
    const due=validDate(t.due)?date(t.due):null,scheduled=validDate(t.schedule?.start)?date(t.schedule.start):null;
    const expired=(scheduled&&scheduled<now)||(meeting&&due&&due<now);
    const fingerprint=contextFingerprint(t),interpretation=saved.interpretation,interpreted=!!interpretation&&!!t.updatedAt&&(interpretation.contextFingerprint?interpretation.contextFingerprint===fingerprint:interpretation.taskUpdatedAt===t.updatedAt)&&(!interpretation.validUntil||new Date(interpretation.validUntil)>now);
    const planCurrent=saved.taskContextFingerprint?saved.taskContextFingerprint===fingerprint:!saved.taskUpdatedAt||saved.taskUpdatedAt===t.updatedAt;
    const choice=planCurrent?saved:{};
    const next=validDate(choice.nextAt)?date(choice.nextAt):null;
    let lane='now',label='Agir com intenção',why=[],action=t.nextStep||'Definir uma ação pequena a partir do contexto registrado.',question='',medium='sistema';
    let outcome='Próximo passo executado e resultado registrado.',steps=[];
    if(closed(t))lane='closed';
    else if(expired){
      lane='review';label='Conferir o desfecho';
      why.push('O horário registrado já passou. A orientação precisa considerar o que aconteceu depois.');
      action='Verificar se o compromisso aconteceu e registrar o resultado; se não aconteceu e ainda fizer sentido, reagendar.';
      question='O compromisso foi realizado? Qual foi o desfecho ou o novo horário confirmado?';
      outcome='Desfecho confirmado e próximo passo atualizado, ou reagendamento registrado.';
      steps=['Conferir se o compromisso foi realizado','Registrar desfecho e o que ficou decidido','Se necessário, confirmar um novo horário'];
    }else if(t.status==='aguardando'){
      lane='waiting';label='Acompanhar sem antecipar';
      why.push('O assunto está aguardando retorno ou entrega; não compete com uma ação executável agora.');
      action=(due&&due>now)?'Acompanhar o retorno ou a entrega no prazo registrado, sem tratar como atraso antes da data.':'Conferir se o retorno já chegou e definir quando acompanhar novamente.';
      question='Qual retorno ou entrega falta para destravar o assunto?';
      outcome='Retorno recebido e conferido, com a dependência resolvida.';
      steps=['Identificar a dependência e o responsável','Conferir o prazo já registrado','Registrar o retorno antes de mudar o estado'];
    }else if(financial){
      label=t.status==='proposta'?'Conferir antes de assumir':'Decidir com base e capacidade';
      action=t.status==='proposta'?'Conferir a alegação no documento ou canal oficial antes de reconhecer obrigação, negociar ou pagar.':'Conferir se já houve pagamento, validar a obrigação e a capacidade financeira antes de decidir a providência.';
      question=t.status==='proposta'?'Qual documento ou canal oficial confirma a obrigação e sua situação atual?':'Já existe pagamento ou comprovante? A obrigação e a capacidade PF/PJ estão confirmadas?';
      why.push(t.status==='proposta'?'É uma proposta de conferência, não uma dívida comprovada.':'O compromisso registrado exige conferir desfecho e capacidade antes de orientar pagamento.');
      outcome='Situação conciliada e decisão fundamentada registrada; comprovante quando houver ação realizada.';
      steps=['Conferir documento, titularidade e situação atual','Verificar pagamentos anteriores e separar PF/PJ','Avaliar capacidade e opções sem assumir compromisso novo','Registrar decisão e evidência do desfecho'];
      medium='portal';
    }else if(/seguranca|login|acesso desconhecido/.test(words)){
      label='Proteger e verificar';action='Conferir a atividade diretamente nas configurações oficiais do serviço, sem usar links recebidos.';
      question='O acesso é reconhecido nas configurações oficiais?';medium='portal';
      why.push('Há um sinal de proteção a conferir; o registro não comprova invasão.');
      outcome='Atividade reconhecida ou medida de proteção confirmada e registrada.';
      steps=['Abrir o serviço pelo endereço habitual','Conferir sessões e atividade','Registrar o que foi reconhecido e a providência efetiva'];
    }else{
      steps=String(action).split(/;\s*|\.\s+(?=[A-ZÁÉÍÓÚ])/).filter(Boolean).slice(0,4);
      if(steps.length<2)steps.push('Registrar o resultado e o que ainda depende de outra pessoa');
      if(t.uncertainties)question='Para este próximo passo, falta esclarecer: '+short(t.uncertainties,240);
    }
    if(!closed(t)&&!expired&&t.status!=='aguardando'){
      if(due&&due>now){lane='next';why.push('Há um prazo registrado à frente: preparar a próxima ação antes dele.');}
      else if(due&&due<now){why.push('Há um prazo passado no registro: confirmar a situação atual, sem presumir consequência.');if(!financial){lane='review';action='Conferir o desfecho e a validade do próximo passo registrado antes de retomar este assunto.';}}
    }
    if(interpreted&&!closed(t)){
      action=interpretation.action||action;outcome=interpretation.outcome||outcome;
      why=interpretation.why?.length?[...interpretation.why]:why;steps=interpretation.steps?.length?interpretation.steps:steps;
      medium=interpretation.medium||medium;question=interpretation.question||question;
      lane=interpretation.lane||lane;label='Interpretação contextual disponível';
      // An appointment that elapsed after the interpretation still needs a fresh outcome.
      if(expired&&interpretation.lane!=='review'){lane='review';action='Conferir o desfecho do compromisso e atualizar o plano antes de executar instruções de horário passadas.';}
    }
    if(!closed(t)&&choice.disposition==='later'&&next&&next>now){lane='review';why.unshift('Você decidiu reavaliar este assunto em '+displayDate(choice.nextAt)+'.');}
    if(!closed(t)&&choice.disposition==='waiting'){lane='waiting';why.unshift('Seu plano salvo mantém este assunto em acompanhamento.');}
    if(!closed(t)&&protectedMorning(now)&&!personal(t)&&lane==='now'){lane='next';why.unshift('Entre 05h30 e 09h00, o bloco de fé, família e saúde está protegido.');}
    if(t.priority===1)why.push('Prioridade alta já registrada na base; não determina, sozinha, a ordem do seu dia.');
    if(p.focusArea&&normalize(p.focusArea)===normalize(t.area))why.push('Esta área foi escolhida por você para o momento.');
    if(choice.why)why.unshift('Decisão registrada: '+choice.why);
    if(!why.length)why.push('Há um próximo passo disponível no contexto; a escolha pode ser ajustada à sua capacidade.');
    if(!expired&&choice.action)action=choice.action;
    if(choice.outcome)outcome=choice.outcome;
    if(choice.medium)medium=choice.medium;
    const contextReviewPending=!closed(t)&&contextCases(t).length>0&&!interpreted&&!(choice.action&&planCurrent);
    if(contextReviewPending){lane='review';label='Revisão do contexto pela IA';action='A IA precisa conciliar as informações deste contexto antes de orientar uma nova ação.';question='';steps=['Aguardar a revisão das fontes já disponíveis pela IA'];why.unshift('Há um contexto relacionado que ainda não foi conciliado nesta orientação.');}
    const effort=p.energy==='baixa'?10:Number(p.minutes)||15;
    let score=(t.priority===1?25:t.priority===2?12:3)+(personal(t)?8:0)+(p.focusArea===t.area?18:0);
    if(due&&due>now)score+=Math.max(0,20-Math.ceil((due-now)/86400000)*3);
    if(financial)score-=8;
    if(t.status==='proposta')score-=5;
    if(choice.disposition==='focus')score+=30;
    if(interpreted)score+=Math.min(25,Math.max(0,Number(interpretation.attention)||0));
    return {lane,label,why,action,outcome,question,medium,steps,financial,expired,score,effort,
      interpretationState:interpretation?(interpreted?'Interpretação disponível · falta evidência do resultado':'Contexto mudou · interpretação anterior precisa de revisão'):'Sem interpretação individual · roteiro inicial por regras',
      interpretation:interpreted?interpretation:null,planCurrent,contextReviewPending,
      automation:interpreted&&interpretation.automation?interpretation.automation:financial?'Leitura, organização e preparação podem ser assistidas no projeto. Pagamento exige decisão e execução autorizadas.':
      t.status==='aguardando'?'Acompanhamento pode ser preparado; nenhum lembrete ou cobrança externa é ativado por esta tela.':
      'Triagem e preparação podem ser assistidas pelos conectores do projeto. Esta tela não executa mensagens ou integrações externas.'};
  }

  function ranked(){
    const p=profile(),rows=tasks.filter(t=>!closed(t)).map(t=>({task:t,advice:analyze(t,p,memo(t)?.data||{})}));
    rows.sort((a,b)=>b.advice.score-a.advice.score||(a.task.due||'9999').localeCompare(b.task.due||'9999'));
    const now=rows.filter(r=>r.advice.lane==='now'),chosen=[],limit=p.energy==='baixa'?1:3;
    // Reserve room for different dimensions instead of letting a large financial queue dominate.
    for(const r of now){if(chosen.length===limit)break;if(chosen.length&&chosen.some(c=>c.task.area===r.task.area))continue;chosen.push(r);}
    for(const r of now){if(chosen.length===limit)break;if(!chosen.includes(r))chosen.push(r);}
    return {rows,chosen};
  }
  const laneName={now:'Agora',next:'Próximo prazo',waiting:'Aguardar',review:'Rever ou adiar'};
  function contextAlert(t,a=analyze(t,profile(),memo(t)?.data||{})){
    if(closed(t))return null;
    const reply=(t.feedback||[]).filter(f=>f.kind==='context-update').at(-1);
    const sourceDates=[...(t.sources||[]).map(s=>s.date),...(t.feedback||[]).map(f=>f.date)].filter(validDate).sort((a,b)=>date(a)-date(b));
    const missing=a.contextReviewPending||a.expired||t.status==='aguardando'||t.status==='proposta'||!!String(t.uncertainties||'').trim()||!t.context||!sourceDates.length||(memo(t)?.data.interpretation&&!a.interpretation);
    if(!missing)return null;
    const pending=!!reply&&!a.interpretation,futureWaiting=t.status==='aguardando'&&validDate(t.due)&&date(t.due)>new Date();
    const question=futureWaiting?'Acompanhamento previsto para '+displayDate(t.due)+'. Há algum fato novo que altere o retorno ou a entrega?':a.interpretation?.question||(a.expired?'O compromisso '+short(t.title,100)+' foi realizado? Qual desfecho ou novo horário foi confirmado?':t.status==='aguardando'?'Sobre '+short(t.title,100)+': o retorno ou a entrega já aconteceu? O que ainda depende de outra pessoa?':t.status==='proposta'?'Qual documento ou retorno no canal oficial confirma '+short(t.title,110)+'?':'O próximo passo “'+short(t.nextStep||t.title,140)+'” já foi realizado? Qual resultado ou dependência ficou registrado?');
    return {pending,question,reply,sourceReviewPending:!a.interpretation?.sourceReview?.complete,lastDate:sourceDates.at(-1)||null,lastState:statuses[t.status]||t.status,
      reason:pending?'Sua informação já está gravada. A orientação anterior perdeu validade e aguarda reconciliação com esse novo contexto.':futureWaiting?'O prazo registrado ainda não chegou. Este acompanhamento não exige cobrança ou nova resposta antes dele, salvo mudança de contexto.':a.expired?'O horário passou e o desfecho ainda não está confirmado.':t.status==='aguardando'?'Falta confirmar o retorno ou a entrega, respeitando o prazo registrado.':t.status==='proposta'?'O registro contém uma informação a conferir; falta confirmação por documento ou retorno posterior.':'O estado ainda precisa ser reconciliado com as fontes disponíveis. A revisão da IA vem antes de solicitar uma nova resposta sua.'};
  }
  function contextBlock(t,a){
    const c=contextAlert(t,a);if(!c)return '';
    return `<section class="panel mentor-context-alert" aria-label="Conferência de contexto"><p class="eyebrow">${c.pending?'RESPOSTA SALVA · REVISÃO PENDENTE':c.sourceReviewPending?'A IA PRECISA CONFERIR AS FONTES':'CONTEXTO A CONFERIR'}</p><p class="mentor-context-status">${esc(c.lastState)} · ${c.lastDate?displayDate(c.lastDate):'Data não confirmada'}</p><p>${esc(c.reason)}</p><details><summary>${c.pending?'Ver resposta ou acrescentar informação':'Ver a dúvida e registrar informação'}</summary><h3>${esc(c.question)}</h3><p>${esc(short(t.context||'Contexto ainda não registrado.',260))}</p>${c.pending?`<p class="mentor-reply"><strong>Resposta salva</strong><br>${esc(c.reply.text)}</p>`:'<p class="muted">Primeiro, a IA confere as fontes. Responda se já souber o desfecho; a falta de informação não significa emergência.</p>'}<form id="mentor-context-form"><label for="mentor-context-reply">O que aconteceu?</label><textarea id="mentor-context-reply" required minlength="5" maxlength="3000"></textarea><p class="muted">Sua resposta fica neste assunto, sem alterar a conclusão.</p><button type="submit">Guardar resposta</button><p id="mentor-context-error" class="form-error" role="alert"></p></form></details></section>`;
  }
  const whyList=a=>`<ul class="mentor-reasons">${a.why.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`;
  function rowCard({task:t,advice:a},featured=false){
    return `<article class="mentor-card ${featured?'mentor-card-featured':''}"><div class="mentor-card-meta"><span class="tag">${esc(t.area)}</span><span>${esc(a.label)}</span></div><h3>${esc(t.title)}</h3><p class="mentor-card-action">${esc(a.action)}</p><small class="mentor-analysis-state">${a.interpretation?'Orientação contextual':'Roteiro inicial · revisão da IA pendente'}</small>${contextAlert(t,a)?'<small class="mentor-context-flag">Contexto a conferir</small>':''}<div class="mentor-card-foot"><span>${t.due?'Prazo registrado · '+displayDate(t.due):'Sem prazo confirmado'}</span><button type="button" data-open="${esc(t.id)}">Ver próximo passo →</button></div></article>`;
  }
  home=function(){
    const p=profile(),{rows,chosen}=ranked(),done=tasks.filter(t=>closed(t)&&t.status==='concluida'&&t.updatedAt&&new Date(t.updatedAt).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'})===today());
    const memories=records.filter(r=>r.data?.category==='mentor-plan'&&r.data.events?.length).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,3);
    const portal=safeHref(navigation().projectUrl),contextCount=rows.filter(r=>contextAlert(r.task,r.advice)).length;
    return `<section class="mentor-welcome"><div><p class="eyebrow">RETORNO À VIDA · DIREÇÃO E EXECUÇÃO</p><h2>O próximo passo,<br>com clareza.</h2><div class="mentor-values">${VALUES.map(v=>`<span>${v}</span>`).join('')}</div></div><div class="mentor-compass"><span>◎</span><strong>${tasks.filter(t=>!closed(t)).length} assuntos</strong><small>${done.length} conclusões registradas hoje</small></div></section>
    <details class="mentor-capacity panel"><summary>Ajustar meu dia</summary><div><p class="eyebrow">O SEU MOMENTO IMPORTA</p><h3>Um plano que caiba no dia.</h3><p>${p.updatedChoice?'Preferência salva no cofre privado.':'Ajuste e salve sua capacidade; esta escolha acompanha seus dispositivos.'}</p></div><form id="mentor-capacity-form"><label>Disposição<select id="mentor-energy">${options({'':'Não informada',baixa:'Preciso de leveza',estavel:'Posso avançar',alta:'Tenho disposição'},p.energy||'')}</select></label><label>Bloco disponível<select id="mentor-minutes">${options({'15':'15 minutos','30':'30 minutos','60':'60 minutos'},String(p.minutes||15))}</select></label><label>Área de atenção<select id="mentor-focus-area"><option value="">Equilibrar as áreas</option>${[...new Set(tasks.map(t=>t.area).filter(Boolean))].map(area=>`<option value="${esc(area)}" ${p.focusArea===area?'selected':''}>${esc(area)}</option>`).join('')}</select></label><button class="primary" type="submit">Aplicar ao meu dia</button><p class="mentor-error" id="mentor-profile-error" role="alert"></p></form></details>
    ${protectedMorning()?'<div class="mentor-morning"><strong>05h30–09h00 · Seu bloco pessoal está protegido.</strong><span>Fé, família e saúde têm espaço. As demandas de trabalho seguem organizadas para depois.</span></div>':''}
    <div class="mentor-section-head"><div><p class="eyebrow">ATÉ TRÊS FRENTES PARA COMEÇAR</p><h2>O que merece atenção agora</h2></div><a class="button" href="#demandas">Todos os assuntos →</a></div>
    <details class="mentor-method"><summary>Como estas orientações foram preparadas</summary><p>${rows.filter(r=>r.advice.interpretation).length} de ${rows.length} assuntos abertos têm interpretação individual válida para o contexto. Os demais são roteiros iniciais. Fontes e limites estão disponíveis em cada assunto.</p></details>
    <div class="mentor-context-summary"><strong>${contextCount} assuntos com contexto a conferir</strong><span>A IA confere primeiro as fontes disponíveis.</span><a class="button" href="#demandas">Revisar os assuntos</a></div>
    <div class="mentor-priorities">${chosen.map(r=>rowCard(r,true)).join('')||'<div class="panel"><h3>Há espaço para escolher com calma.</h3><p>Os assuntos disponíveis estão em acompanhamento, preparação ou revisão. Veja os próximos blocos.</p></div>'}</div>
    <div class="mentor-lanes">${['next','waiting','review'].map(lane=>{const list=rows.filter(r=>r.advice.lane===lane);return `<section class="mentor-lane"><div class="mentor-section-head"><h3>${laneName[lane]}</h3><span>${list.length}</span></div><p>${lane==='next'?'Preparar com antecedência, respeitando o momento.':lane==='waiting'?'Dependências e retornos, sem cobrança duplicada.':'Prazos passados e escolhas que precisam de novo contexto.'}</p>${list.slice(0,2).map(r=>rowCard(r)).join('')||'<small>Nenhum assunto neste grupo.</small>'}</section>`;}).join('')}</div>
    <div class="mentor-footer-grid"><section class="panel"><p class="eyebrow">MEMÓRIA QUE ORIENTA</p><h3>Decisões e aprendizados recentes</h3>${memories.map(r=>`<button class="mentor-memory-link" data-open="${esc(r.data.taskId)}"><strong>${esc(r.data.title)}</strong><span>${esc(short(r.data.events.at(-1).text,160))}</span><small>${displayDate(r.updatedAt)}</small></button>`).join('')||'<p>Ao registrar uma decisão ou aprendizado em um assunto, ele reaparece aqui com seu contexto.</p>'}</section><section class="panel"><p class="eyebrow">MEIOS REAIS, ALCANCE CLARO</p><h3>Preparar também é avançar.</h3><p>Planos, agenda de próximos passos, rascunhos e memória ficam no seu cofre. Conectores e execuções assistidas são tratados no projeto.</p><div class="actions"><a class="button" href="#agenda">Agenda</a><a class="button" href="#conexoes">Conexões</a>${portal?`<a class="button" href="${esc(portal)}" target="_blank" rel="noopener noreferrer">Ponto central ↗</a>`:''}</div></section></div>`;
  };

  async function recordId(taskId){
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(taskId));
    return 'mentoria-'+Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);
  }
  async function persistRecord(id,kind,patch,event,expectedRevision=0){
    const {record:old}=await api('records?id='+encodeURIComponent(id));
    if(event&&old?.data.events?.some(e=>e.id===event.id)){if(Object.keys(patch).some(k=>JSON.stringify(old.data[k])!==JSON.stringify(patch[k])))throw Error('A tentativa anterior foi gravada, mas seu texto mudou. Atualize e compare antes de salvar novamente.');await refresh();return old;}
    if((old?.revision||0)!==expectedRevision)throw Error('Este registro mudou em outro acesso. Seu texto foi preservado aqui; atualize e compare antes de salvar.');
    const data={...(old?.data||{}),...patch};
    if(event)data.events=[...(old?.data.events||[]),event];
    const result=await api('records',{record:{...(old||{id,kind}),data}});
    const {record:confirmed}=await api('records?id='+encodeURIComponent(id));
    if(!result.saved||!confirmed||confirmed.revision<result.record.revision||Object.keys(patch).some(k=>JSON.stringify(confirmed.data[k])!==JSON.stringify(patch[k]))||(event&&!confirmed.data.events?.some(e=>e.id===event.id)))throw Error('A leitura não confirmou este registro. Atualize antes de repetir.');
    await refresh();return confirmed;
  }
  const pendingEvents=new Map();
  const event=(type,text)=>{const key=caseId+'|'+type+'|'+text;if(!pendingEvents.has(key))pendingEvents.set(key,{id:uid('memoria'),type,text,date:new Date().toISOString()});return pendingEvents.get(key);};
  async function saveMemo(t,patch,entry){
    const id=memo(t)?.id||await recordId(t.id);
    const shown=memo(t),previous=shown?.data||{};
    if(patch.action){const fresh=await latestTask(t.id,t.updatedAt);if(fresh.updatedAt!==t.updatedAt)throw Error('O contexto deste assunto mudou. Atualize e revise a orientação antes de salvar o plano.');}
    const data={category:'mentor-plan',taskId:t.id,title:'Plano · '+t.title,...patch};
    if(patch.action){data.taskUpdatedAt=t.updatedAt;data.taskContextFingerprint=contextFingerprint(t);}
    data.text=[data.outcome||previous.outcome,data.action||previous.action,data.why||previous.why].filter(Boolean).join('\n\n');
    const confirmed=await persistRecord(id,'note',data,entry,shown?.revision||0);for(const [key,value] of pendingEvents)if(value.id===entry?.id)pendingEvents.delete(key);return confirmed;
  }
  async function latestTask(id,expectedUpdatedAt){
    const fresh=await api('tasks'),t=fresh.tasks.find(t=>t.id===id);
    if(!t)throw Error('O assunto não está mais disponível. Atualize a página.');if(expectedUpdatedAt&&t.updatedAt!==expectedUpdatedAt)throw Error('O assunto mudou em outro acesso. Seu texto foi preservado; atualize e revise antes de salvar.');return t;
  }
  const legacyEditTask=editTask,legacyAgenda=agenda,legacyBind=bind;
  editTask=function(id,type='tarefa'){
    if(!id)return legacyEditTask(id,type);
    const t=tasks.find(t=>t.id===id);if(!t)return toast('Assunto não encontrado na base atual.');
    openCase(t);
  };
  function openCase(t){
    dirty=false;dirtySection=null;caseId=t.id;
    const stored=memo(t)?.data||{},a=analyze(t,profile(),stored),saved=a.planCurrent?stored:{...stored,action:null,outcome:null,why:null,disposition:null},links=(t.links||[]).filter(l=>safeHref(l.url));
    $('title').textContent='Orientar e executar';
    $('view').innerHTML=`<section class="mentor-case"><div class="mentor-case-top"><button id="mentor-back" type="button">← Direção de hoje</button><span class="tag">${esc(t.area)}</span><span class="tag">${statuses[t.status]||esc(t.status)}</span><button id="mentor-details" type="button">Detalhes e arquivos</button></div><div class="mentor-case-title"><h2>${esc(t.title)}</h2><p>${closed(t)?"Histórico preservado":a.interpretation?"Orientação contextual · fontes nos detalhes":"Roteiro inicial · revisão da IA pendente"}</p></div><div class="mentor-case-tabs" role="tablist" aria-label="Espaço de orientação"><button type="button" data-mentor-pane="context" role="tab" aria-selected="true">Direção</button><button type="button" data-mentor-pane="plan" role="tab" aria-selected="false">Plano e ação</button><button type="button" data-mentor-pane="memory" role="tab" aria-selected="false">Memória</button></div>
    <div class="mentor-case-grid"><section class="mentor-context"><article class="panel mentor-advice"><p class="eyebrow">${closed(t)?'REGISTRO HISTÓRICO':'O QUE FAZER'}</p><h3>${closed(t)?'Assunto encerrado. Não repetir a ação.':esc(a.action)}</h3>${closed(t)?'<p>A conclusão registrada foi preservada.</p>':`<div class="mentor-next-step"><strong>Primeiro passo</strong><p>${esc(a.steps[0]||a.action)}</p></div><p><strong>Resultado esperado</strong><br>${esc(a.outcome)}</p>`}<details class="mentor-reason-details"><summary>${closed(t)?'Consultar orientação anterior':'Ver plano completo e justificativa'}</summary>${closed(t)?`<p>${esc(a.action)}</p>`:''}<h4>Por que este caminho</h4>${whyList(a)}${a.question?`<div class="mentor-question"><strong>Ponto a esclarecer</strong><p>${esc(a.question)}</p></div>`:''}${a.interpretation?`<p class="mentor-analysis-meta">Orientação de ${displayDate(a.interpretation.createdAt)}, ligada ao contexto registrado.</p>${a.interpretation.dependencies?.length?`<h4>Dependências</h4><ul>${a.interpretation.dependencies.map(d=>`<li>${esc(d)}</li>`).join('')}</ul>`:''}<p><strong>Critério de conclusão</strong><br>${esc(a.interpretation.evidence||a.outcome)}</p>`:''}<ol class="mentor-route">${a.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p class="muted">${esc(a.automation)}</p></details></article>${contextBlock(t,a)}<details class="panel mentor-source"><summary>Contexto, fontes e limites do registro</summary><p class="note-text">${esc(t.context||'Contexto ainda não registrado.')}</p>${t.uncertainties?`<h4>O que não está confirmado</h4><p>${esc(t.uncertainties)}</p>`:''}<h4>Próximo passo de origem</h4><p>${esc(t.nextStep||'Não registrado.')}</p><ul>${(t.sources||[]).map(s=>`<li>${esc(s.label||s.type||'Fonte registrada')}${s.date?' · '+displayDate(s.date):''}</li>`).join('')}</ul></details></section>
    <section class="mentor-plan"><details class="panel mentor-plan-editor"><summary>Ajustar meu plano</summary><form id="mentor-plan-form"><p class="eyebrow">SUA ESCOLHA, COM FUNDAMENTO</p><h3>Um plano executável</h3><label for="mentor-outcome">Resultado que encerra este assunto</label><textarea id="mentor-outcome" required maxlength="2000">${esc(saved.outcome||a.outcome)}</textarea><label for="mentor-action">Próxima ação possível</label><textarea id="mentor-action" required maxlength="3000">${esc(saved.action||a.action)}</textarea><label for="mentor-why">Por que escolher esse caminho</label><textarea id="mentor-why" required maxlength="2000">${esc(saved.why||a.why[0])}</textarea><div class="field-grid"><div><label for="mentor-disposition">Como tratar agora</label><select id="mentor-disposition">${options({focus:'Focar neste assunto',prepare:'Preparar próximo passo',waiting:'Acompanhar retorno',later:'Adiar com reavaliação'},saved.disposition||(a.lane==='waiting'?'waiting':a.lane==='now'?'focus':'prepare'))}</select></div><div><label for="mentor-medium">Meio da próxima ação</label><select id="mentor-medium">${options({sistema:'No sistema',telefone:'Ligação',mensagem:'Mensagem a preparar',email:'E-mail a preparar',portal:'Canal oficial',presencial:'Presencial'},saved.medium||a.medium)}</select></div></div><label for="mentor-next-at">Agendar o próximo passo ou reavaliação · opcional</label><input id="mentor-next-at" type="datetime-local" value="${esc(localDate(saved.nextAt))}"><p class="muted">Salvo na agenda do sistema. Nenhum convite externo é enviado.</p><p id="mentor-plan-error" class="form-error" role="alert"></p><button class="primary" type="submit">Salvar plano no cofre</button><p class="mentor-save-state">${!a.planCurrent?'Seu plano anterior foi preservado; o contexto mudou e precisa ser revisto.':memo(t)?'Registro privado conferido em '+displayDate(memo(t).updatedAt):'A sugestão só vira seu plano ao salvar.'}</p></form></details>
    <details class="panel mentor-tools"><summary>Preparar uma ação</summary><p>${esc(a.automation)}</p><div class="actions"><button id="mentor-prepare" type="button">Preparar texto</button><button id="mentor-automation" type="button">Registrar possibilidade de automação</button>${saved.nextAt?'<button id="mentor-ics" type="button">Baixar próximo passo .ics</button>':''}</div>${links.map(l=>`<a class="mentor-resource" href="${esc(safeHref(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.label||'Referência registrada')} ↗</a>`).join('')}<div id="mentor-draft-box" hidden><label for="mentor-draft">Texto preparado · revise antes de usar</label><textarea id="mentor-draft" maxlength="4000">${esc(saved.draft||'')}</textarea><div class="actions"><button id="mentor-draft-save" type="button">Guardar preparação</button><button id="mentor-copy" type="button">Copiar texto</button></div><small>Preparação local; nenhum envio é realizado.</small></div><p id="mentor-tool-error" class="form-error" role="alert"></p></details></section>
    <section class="mentor-memory"><section class="panel"><p class="eyebrow">EXECUÇÃO E ACOMPANHAMENTO</p><h3>Avanço que deixa evidência</h3>${(t.checklist||[]).length?`<div class="mentor-checklist">${t.checklist.map((s,i)=>`<label><input type="checkbox" data-mentor-step="${i}" ${s.done?'checked':''} ${closed(t)?'disabled':''}><span>${esc(s.text)}</span></label>`).join('')}</div>`:`<p>Você pode transformar o roteiro sugerido em checklist, sem marcar etapas como feitas.</p><button id="mentor-adopt-steps" type="button" ${closed(t)?'disabled':''}>Criar checklist deste roteiro</button>`}<p id="mentor-check-error" class="form-error" role="alert"></p></section><details class="panel mentor-memory-editor"><summary>Registrar andamento ou decisão</summary><form id="mentor-memory-form"><h3>Memória deste assunto</h3><label for="mentor-entry-type">O que este registro representa?</label><select id="mentor-entry-type">${options({decisao:'Decisão e fundamento',feito:'Ação realizada',retorno:'Retorno recebido',aprendizado:'Aprendizado para a próxima vez'},'decisao')}</select><label for="mentor-entry">O que aconteceu e o que isso muda?</label><textarea id="mentor-entry" required maxlength="3000" placeholder="Registre um fato, uma escolha ou um aprendizado deste assunto."></textarea><button type="submit">Guardar memória</button><p id="mentor-memory-error" class="form-error" role="alert"></p></form></details><section class="panel mentor-events">${(saved.events||[]).slice().reverse().slice(0,8).map(e=>`<article><span class="tag">${esc(e.type)}</span><p>${esc(e.text)}</p><small>${displayDate(e.date)}</small></article>`).join('')||'<p>As decisões e aprendizados salvos ficam aqui para orientar a próxima análise.</p>'}${(t.feedback||[]).slice(-3).reverse().map(f=>`<article><small>Andamento registrado · ${displayDate(f.date)}</small><p>${esc(f.text)}</p></article>`).join('')}</section>${!closed(t)?`<details class="panel mentor-conclusion"><summary>Concluir com evidência</summary><form id="mentor-proof-form"><p>Movimentar um estado não substitui resolver o assunto. Registre o resultado alcançado ou o comprovante disponível.</p><label for="mentor-proof">Qual evidência confirma a conclusão?</label><textarea id="mentor-proof" required minlength="10" maxlength="3000"></textarea><button type="submit" class="primary">Registrar evidência e concluir</button><p id="mentor-proof-error" class="form-error" role="alert"></p></form></details>`:'<div class="panel"><strong>Assunto encerrado na base.</strong><p>A orientação acima é contexto, não uma instrução para reabrir.</p></div>'}</section></div></section>`;
    const pane=name=>{document.querySelector('.mentor-case').dataset.pane=name;document.querySelectorAll('[data-mentor-pane]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mentorPane===name)));};
    document.querySelectorAll('[data-mentor-pane]').forEach(b=>b.onclick=()=>pane(b.dataset.mentorPane));pane('context');
    const canLeave=()=>{if(dirty){toast('Salve o plano ou a memória antes de trocar de área.');return false;}return true;};
    $('mentor-back').onclick=()=>{if(canLeave()){caseId=null;render();}};
    $('mentor-details').onclick=()=>{if(!canLeave())return;caseId=null;legacyEditTask(t.id);const top=document.querySelector('.execution-top');if(top){const b=document.createElement('button');b.type='button';b.textContent='Voltar à orientação';b.onclick=()=>{if($('workspace-save-state')?.classList.contains('unsaved'))return toast('Salve o andamento antes de voltar.');editTask(t.id);};top.append(b);}};
    const markDirty=section=>{dirty=true;dirtySection=section;for(const [name,id] of [['plan','mentor-plan-form'],['memory','mentor-memory-form'],['proof','mentor-proof-form'],['context','mentor-context-form']])if($(id))for(const field of $(id).elements)field.disabled=name!==section;$('mentor-draft').disabled=section!=='draft';};
    $('mentor-plan-form').oninput=()=>markDirty('plan');
    $('mentor-memory-form').oninput=()=>markDirty('memory');
    if($('mentor-proof-form'))$('mentor-proof-form').oninput=()=>markDirty('proof');
    if($('mentor-context-form')){
      $('mentor-context-form').oninput=()=>markDirty('context');
      $('mentor-context-form').onsubmit=e=>{e.preventDefault();if(!canWrite('context'))return;const text=$('mentor-context-reply').value.trim();if(text.length<5)return;const entry={...event('contexto',text),kind:'context-update',question:contextAlert(t,a)?.question,contextWas:t.updatedAt,source:'owner',author:'Usuário autenticado',origin:'context-alert'};guarded(e.submitter,'mentor-context-error',async()=>{const current=(await api('tasks')).tasks.find(x=>x.id===t.id);if(!current)throw Error('O assunto não está mais disponível.');if(!current.feedback?.some(f=>f.id===entry.id)){if(current.updatedAt!==t.updatedAt)throw Error('O assunto mudou em outro acesso. Sua resposta foi preservada; atualize e compare antes de salvar.');await saveTask({...current,feedback:[...(current.feedback||[]),entry]});}const confirmed=(await api('tasks')).tasks.find(x=>x.id===t.id);if(!confirmed?.feedback?.some(f=>f.id===entry.id))throw Error('A leitura não confirmou sua resposta. Atualize antes de repetir.');await refresh();for(const [key,value] of pendingEvents)if(value.id===entry.id)pendingEvents.delete(key);});};
    }
    const canWrite=section=>{if(dirty&&dirtySection!==section){toast('Salve primeiro o texto que está em edição.');return false;}return true;};
    const guarded=async(button,errorId,fn)=>{button.disabled=true;try{await fn();dirty=false;const current=tasks.find(x=>x.id===t.id);if(current)openCase(current);toast('Gravado e conferido no cofre privado.');}catch(error){const box=$(errorId);if(box)box.textContent=error.message;button.disabled=false;}};
    $('mentor-plan-form').onsubmit=e=>{e.preventDefault();if(!canWrite('plan'))return;const disposition=$('mentor-disposition').value,nextAt=$('mentor-next-at').value;if(disposition==='later'&&!nextAt){$('mentor-plan-error').textContent='Defina quando reavaliar para adiar com critério.';return;}const patch={outcome:$('mentor-outcome').value.trim(),action:$('mentor-action').value.trim(),why:$('mentor-why').value.trim(),disposition,medium:$('mentor-medium').value,nextAt:nextAt?iso(nextAt):null};if(!patch.outcome||!patch.action||!patch.why){$('mentor-plan-error').textContent='Preencha resultado, ação e fundamento.';return;}guarded(e.submitter,'mentor-plan-error',()=>saveMemo(t,patch,event('plano','Plano escolhido: '+patch.action+' · Fundamento: '+patch.why)));};
    $('mentor-memory-form').onsubmit=e=>{e.preventDefault();if(!canWrite('memory'))return;if(!$('mentor-entry').value.trim())return;guarded(e.submitter,'mentor-memory-error',()=>saveMemo(t,{},event($('mentor-entry-type').value,$('mentor-entry').value.trim())));};
    $('mentor-prepare').onclick=()=>{if(!canLeave())return;$('mentor-draft-box').hidden=false;if(!$('mentor-draft').value)$('mentor-draft').value='Gostaria de confirmar o andamento deste assunto: '+t.title+'. '+(a.question||'Qual é o próximo passo e o retorno esperado?');$('mentor-draft').focus();};
    $('mentor-draft').oninput=()=>markDirty('draft');
    $('mentor-draft-save').onclick=e=>{if(!canWrite('draft'))return;guarded(e.currentTarget,'mentor-tool-error',()=>saveMemo(t,{draft:$('mentor-draft').value},event('preparacao','Texto preparado e guardado; nenhum envio realizado.')));};
    $('mentor-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('mentor-draft').value);toast('Texto copiado. Nenhuma mensagem foi enviada.');}catch{$('mentor-draft').select();toast('Selecione e copie o texto preparado.');}};
    $('mentor-automation').onclick=e=>{if(!canLeave())return;guarded(e.currentTarget,'mentor-tool-error',()=>saveMemo(t,{},event('automacao-proposta',a.automation+' Possibilidade registrada para avaliação no projeto; nenhuma automação criada.')));};
    if($('mentor-ics'))$('mentor-ics').onclick=()=>ics({...t,title:saved.action||t.title,context:saved.why||t.context,schedule:{start:saved.nextAt}});
    if($('mentor-adopt-steps'))$('mentor-adopt-steps').onclick=e=>{if(!canLeave())return;guarded(e.currentTarget,'mentor-check-error',async()=>{const fresh=await latestTask(t.id,t.updatedAt);if(closed(fresh))throw Error('Este assunto foi encerrado em outro acesso.');if(fresh.checklist?.length)throw Error('Já existe um checklist. Atualize para preservar seus passos.');await saveTask({...fresh,checklist:a.steps.map(text=>({id:uid('passo'),text,done:false}))});});};
    document.querySelectorAll('[data-mentor-step]').forEach(box=>box.onchange=()=>{if(!canLeave()){box.checked=!box.checked;return;}guarded(box,'mentor-check-error',async()=>{const fresh=await latestTask(t.id,t.updatedAt),i=Number(box.dataset.mentorStep);if(closed(fresh))throw Error('Este assunto foi encerrado em outro acesso.');if(fresh.checklist?.[i]?.id!==t.checklist[i]?.id||fresh.checklist?.[i]?.text!==t.checklist[i]?.text)throw Error('O checklist mudou. Atualize antes de marcar.');await saveTask({...fresh,checklist:fresh.checklist.map((s,n)=>n===i?{...s,done:box.checked}:s)});});});
    if($('mentor-proof-form'))$('mentor-proof-form').onsubmit=e=>{e.preventDefault();if(!canWrite('proof'))return;const proof=$('mentor-proof').value.trim();if(proof.length<10)return;guarded(e.submitter,'mentor-proof-error',async()=>{const fresh=await latestTask(t.id,t.updatedAt);if(closed(fresh))throw Error('Este assunto já foi encerrado em outro acesso.');await saveTask({...fresh,status:'concluida',feedback:[...(fresh.feedback||[]),{date:new Date().toISOString(),text:'Evidência de conclusão: '+proof}]});});};
  }
  agenda=function(){
    const planned=records.filter(r=>r.data?.category==='mentor-plan'&&validDate(r.data.nextAt)&&tasks.some(t=>t.id===r.data.taskId&&!closed(t))).sort((a,b)=>a.data.nextAt.localeCompare(b.data.nextAt));
    return `<section class="panel"><p class="eyebrow">PRÓXIMOS PASSOS ESCOLHIDOS</p><h2>Tempo reservado para avançar</h2>${planned.map(r=>`<article class="mentor-agenda-item"><div><strong>${displayDate(r.data.nextAt)}</strong><p>${esc(r.data.action)}</p><small>${esc(r.data.why)}</small></div><button data-open="${esc(r.data.taskId)}">Abrir plano</button></article>`).join('')||'<p>Salve um horário no plano de um assunto para que seu próximo passo apareça aqui.</p>'}</section>`+legacyAgenda();
  };
  const oldPrinciples=principles;
  principles=function(){const base=oldPrinciples(),url=safeHref(navigation().documentsUrl);return base.replace('<a class="button" href="documento-fundador.md">Documento fundador e regras</a>',url?`<a class="button" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Fundamentos e documentos privados ↗</a>`:'<p class="muted">Os fundamentos vigentes permanecem no ponto central privado do projeto.</p>');};
  bind=function(){
    legacyBind();dirty=false;caseId=null;document.querySelectorAll('.mission-card [data-open]').forEach(button=>{const task=tasks.find(t=>t.id===button.dataset.open);if(task&&contextAlert(task)&&!button.querySelector('.mentor-context-flag')){const flag=document.createElement('small');flag.className='mentor-context-flag';flag.textContent='◌ Revisão do contexto pendente';button.append(flag);}});const profileRevision=records.find(r=>r.id==='mentoria-perfil')?.revision||0;
    if($('mentor-capacity-form'))$('mentor-capacity-form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;const patch={energy:$('mentor-energy').value,minutes:Number($('mentor-minutes').value),focusArea:$('mentor-focus-area').value,updatedChoice:new Date().toISOString()};try{await persistRecord('mentoria-perfil','profile',patch,null,profileRevision);toast('Capacidade salva e direção ajustada.');}catch(error){if($('mentor-profile-error'))$('mentor-profile-error').textContent=error.message;button.disabled=false;}};
  };
  document.addEventListener('click',e=>{if(dirty&&e.target.closest('a[href^="#"]')){e.preventDefault();e.stopImmediatePropagation();toast('Salve o plano ou a memória para preservar suas escolhas.');}},true);
  window.RetornoMentor={analyze,protectedMorning,safeHref,ranked,contextAlert,contextFingerprint,sha256};
  if(ready)render();
})();


