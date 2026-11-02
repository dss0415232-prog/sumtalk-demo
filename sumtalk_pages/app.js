(function(){
'use strict';
var sid=null, busy=false, started=false;
var $=function(s,r){return (r||document).querySelector(s)};
var chat=$('#chat'), input=$('#msg'), hero=$('#hero');
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function scroll(){window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})}
function won(n){return Number(n).toLocaleString('ko-KR')+'원'}
function addUser(t){var r=el('div','row me');r.appendChild(el('div','bubble',t));chat.appendChild(r);scroll()}
function blockTable(t){var w=el('div','tw');if(t.title)w.appendChild(el('div','tt',t.title));var sc=el('div','ts');var tb=el('table','dt');var th=el('tr');t.head.forEach(function(h){th.appendChild(el('th',null,h))});tb.appendChild(th);
  var num=t.head.map(function(h,i){return t.rows.length>0&&t.rows.every(function(r){return /(원|%|환급|공제)$/.test(r[i]||'')})});
  t.rows.forEach(function(r){var tr=el('tr');r.forEach(function(c,i){tr.appendChild(el('td',num[i]?'n':null,c))});tb.appendChild(tr)});sc.appendChild(tb);w.appendChild(sc);return w}
function addAI(m){var r=el('div','row ai');r.appendChild(el('div','avatar','🌲'));var b=el('div','bubble'+(m.blocks&&m.blocks.length?' rich':''),m.blocks&&m.blocks.length?null:m.text);
  if(m.blocks&&m.blocks.length){m.blocks.forEach(function(k){if(k.type==='table')b.appendChild(blockTable(k));else{var d=el('div','bt'+(k.muted?' muted':'')+(k.strong?' strong':''),k.text);b.appendChild(d)}})}
  if(m.sources&&m.sources.length){var s=el('div','src');m.sources.forEach(function(x){s.appendChild(el('span',null,'근거: '+x.title+(x.as_of?' · '+x.as_of:'')))});b.appendChild(s)}
  if(m.photos&&m.photos.length){var g=el('div','photos');m.photos.forEach(function(p){var f=el('figure');var i=el('img');i.src=p.src;i.alt=p.caption||'시설 사진';i.loading='lazy';f.appendChild(i);if(p.caption)f.appendChild(el('figcaption',null,p.caption));g.appendChild(f)});b.appendChild(g)}
  if(m.gen==='tour'){b.appendChild(el('div','genb','AI 참고 추천 · 치유원 공식 안내 아님'))}
  if(m.gen==='llm'){b.appendChild(el('div','genb','AI가 위 근거 자료만 바탕으로 작성한 답변입니다'))}
  r.appendChild(b);chat.appendChild(r)}
function clearInteractive(){chat.querySelectorAll('.chips,.card.form,.card.picker,.fb,.typing').forEach(function(n){n.remove()})}
function post(path,data){return fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(function(r){return r.json()})}
function send(value,label){
  if(busy)return;value=(value||'').trim();if(!value)return;
  if(/(?:01[016789][- ]?\d{3,4}[- ]?\d{4}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\d{6}[- ]?[1-4]\d{6})/.test(value)){addAI({text:'이 대화창에는 연락처·주민등록번호 등을 입력하지 마세요. 개인정보가 포함된 민원은 별도의 보안 접수 화면을 이용해 주세요.'});return;}
  if(!started){started=true;hero.style.display='none';$('#homeChips').style.display='none';$('#quickBar').classList.add('on');chat.style.paddingBottom='200px'}
  clearInteractive();addUser(label||value);busy=true;
  var t=el('div','row ai typing');t.appendChild(el('div','avatar','🌲'));t.appendChild(el('div','bubble','확인하고 있어요…'));chat.appendChild(t);scroll();
  post('/api/chat',{sid:sid,message:value,label:label}).then(function(r){t.remove();sid=r.sid;render(r)}).catch(function(){t.remove();addAI({text:'일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'})}).then(function(){busy=false;input.focus()});
}
function render(r){
  var u=r.ui;
  if(u.quote){addAI(r.messages[0]);renderQuote(u.quote);r.messages.slice(1).forEach(addAI)}else r.messages.forEach(addAI);
  if(u.form)renderForm(u.form);
  if(u.picker)renderPicker(u.picker);
  if(u.options&&u.options.length)renderChips(u.options,u.multi);
  if(u.feedback)renderFeedback();
  scroll();
}
function renderChips(opts,multi){
  var box=el('div','chips'),sel={};
  opts.forEach(function(o){
    var b=el('button','chip'+(o.value&&o.value.indexOf('act:consult')===0?' primary':''),o.label);b.type='button';
    var exclusive=/없음|안 함|필요 없/.test(o.label);
    b.onclick=function(){
      if(!multi||exclusive){send(o.value,o.label);return}
      if(sel[o.label]){delete sel[o.label];b.classList.remove('sel')}else{sel[o.label]=o.value;b.classList.add('sel')}
      done.disabled=Object.keys(sel).length===0};
    box.appendChild(b)});
  var done;
  if(multi){done=el('button','chip primary','선택 완료');done.type='button';done.disabled=true;done.onclick=function(){var ks=Object.keys(sel);send(ks.join(', '),ks.join(', '))};box.appendChild(done)}
  chat.appendChild(box)}

function pad2(n){return (n<10?'0':'')+n}
function t2m(t){var a=(t||'').split(':');return parseInt(a[0],10)*60+parseInt(a[1]||'0',10)}
function m2t(m){return pad2(Math.floor(m/60))+':'+pad2(m%60)}
function renderPicker(p){
  var c=el('div','card picker');
  var foot=el('div','pfoot');var done=el('button','chip primary','선택 완료');done.type='button';done.disabled=true;
  var none=null;
  if(p.none){none=el('button','chip',p.none.label);none.type='button';none.onclick=function(){send(p.none.value,p.none.label)}}
  var err=el('div','perr');
  if(p.type==='select'){
    var sel={};var sc=el('div','ts');var tb=el('table','dt pk');var th=el('tr');th.appendChild(el('th',null,''));
    p.head.forEach(function(h){th.appendChild(el('th',null,h))});tb.appendChild(th);
    p.rows.forEach(function(r){var tr=el('tr');var td=el('td','ck');var cb=el('input');cb.type='checkbox';td.appendChild(cb);tr.appendChild(td);
      r.cells.forEach(function(x,i){tr.appendChild(el('td',i===0?'nm':null,x))});
      function tog(){if(sel[r.value]){delete sel[r.value];tr.classList.remove('on');cb.checked=false}else{sel[r.value]=1;tr.classList.add('on');cb.checked=true}done.disabled=!Object.keys(sel).length}
      tr.onclick=function(e){if(e.target===cb){cb.checked=!cb.checked}tog()};tb.appendChild(tr)});
    sc.appendChild(tb);c.appendChild(sc);
    done.onclick=function(){var ks=Object.keys(sel);send(ks.join(', '),ks.join(', '))};
  } else if(p.type==='rooms'){
    var cnt={};var scr=el('div','ts');var tbr=el('table','dt pk');var thr=el('tr');thr.appendChild(el('th',null,'객실 수'));
    p.head.forEach(function(h){thr.appendChild(el('th',null,h))});tbr.appendChild(thr);
    var sum=el('div','rsum');
    function upR(){var t=0,n=0;p.rows.forEach(function(r){var c=cnt[r.value]||0;t+=c*r.capacity;n+=c});
      var ok=p.pax?t>=p.pax:true;sum.textContent='선택 객실 '+n+'실 · 정원 합계 '+t+'명'+(p.pax?' / 필요 인원 '+p.pax+'명'+(n&&!ok?' (부족: '+(p.pax-t)+'명)':''):'');sum.className='rsum'+(n&&!ok?' bad':'');done.disabled=n===0}
    p.rows.forEach(function(r){var tr=el('tr');var td=el('td','st');
      var minus=el('button','sb','−');minus.type='button';var v=el('span','sv','0');var plus=el('button','sb','+');plus.type='button';
      function set(n){n=Math.max(0,Math.min(99,n));if(n)cnt[r.value]=n;else delete cnt[r.value];v.textContent=n;tr.classList.toggle('on',n>0);upR()}
      minus.onclick=function(e){e.stopPropagation();set((cnt[r.value]||0)-1)};plus.onclick=function(e){e.stopPropagation();set((cnt[r.value]||0)+1)};
      td.appendChild(minus);td.appendChild(v);td.appendChild(plus);tr.appendChild(td);
      r.cells.forEach(function(x,i){tr.appendChild(el('td',i===0?'nm':null,x))});tbr.appendChild(tr)});
    scr.appendChild(tbr);c.appendChild(scr);c.appendChild(sum);upR();
    c.appendChild(el('div','hint','원하는 객실 유형 옆의 + 버튼으로 객실 수를 정하세요. 유형을 섞어서 선택할 수 있습니다.'));
    done.onclick=function(){var lab=[];p.rows.forEach(function(r){if(cnt[r.value])lab.push(r.value+' '+cnt[r.value]+'실')});send('roomplan:'+JSON.stringify(cnt),lab.join(', '))};
  } else if(p.type==='kids'){
    var kc={};var kb=el('div','kg');var ks=el('div','rsum');
    function upK(){var t=0;for(var k in kc)t+=kc[k];var over=p.pax&&t>p.pax;ks.textContent='어린이·영유아 합계 '+t+'명'+(p.pax?' / 전체 '+p.pax+'명 (성인 '+Math.max(0,p.pax-t)+'명)':'');ks.className='rsum'+(over?' bad':'');done.disabled=t===0||over}
    p.rows.forEach(function(r){var row=el('div','krow');var lab=el('div','kl');lab.appendChild(el('b',null,r.name));lab.appendChild(el('div','ksub',r.sub));row.appendChild(lab);
      var st=el('div','st');var minus=el('button','sb','−');minus.type='button';var v=el('span','sv','0');var plus=el('button','sb','+');plus.type='button';
      function set(n){n=Math.max(0,Math.min(999,n));if(n)kc[r.id]=n;else delete kc[r.id];v.textContent=n;upK()}
      minus.onclick=function(){set((kc[r.id]||0)-1)};plus.onclick=function(){set((kc[r.id]||0)+1)};
      st.appendChild(minus);st.appendChild(v);st.appendChild(plus);row.appendChild(st);kb.appendChild(row)});
    c.appendChild(kb);c.appendChild(ks);upK();
    done.onclick=function(){var lab=[];p.rows.forEach(function(r){if(kc[r.id])lab.push(r.name+' '+kc[r.id]+'명')});send('kids:'+JSON.stringify(kc),lab.join(', '))};
  } else if(p.type==='meal'){
    var plan={};var g=el('div','mg');
    p.days.forEach(function(d){plan[d.day]={};var row=el('div','mrow');row.appendChild(el('div','ml',d.label));var bs=el('div','mbs');
      d.meals.forEach(function(m){var b=el('button','chip',m.name);b.type='button';b.onclick=function(){var o=plan[d.day];if(o[m.id]){delete o[m.id];b.classList.remove('sel')}else{o[m.id]=1;b.classList.add('sel')}done.disabled=!anyMeal()};bs.appendChild(b)});
      row.appendChild(bs);g.appendChild(row)});
    function anyMeal(){return Object.keys(plan).some(function(k){return Object.keys(plan[k]).length})}
    c.appendChild(g);
    done.onclick=function(){var o={},lab=[];p.days.forEach(function(d){var ids=Object.keys(plan[d.day]);if(ids.length){o[d.day]=ids;lab.push(d.label+' '+d.meals.filter(function(m){return plan[d.day][m.id]}).map(function(m){return m.name}).join('·'))}});
      send('mealplan:'+JSON.stringify(o),lab.join(' / '))};
  } else if(p.type==='hall'){
    var bk={};var sc2=el('div','ts');var tb2=el('table','dt pk');var th2=el('tr');th2.appendChild(el('th',null,''));
    p.head.forEach(function(h){th2.appendChild(el('th',null,h))});tb2.appendChild(th2);
    var om=t2m(p.open),cm=t2m(p.close);
    p.rows.forEach(function(r){
      var tr=el('tr');var td=el('td','ck');var cb=el('input');cb.type='checkbox';td.appendChild(cb);tr.appendChild(td);
      r.cells.forEach(function(x,i){tr.appendChild(el('td',i===0?'nm':null,x))});tb2.appendChild(tr);
      var cr=el('tr','cfg');var cc=el('td');cc.colSpan=p.head.length+1;
      var dsel=el('select');for(var d=1;d<=p.days;d++){var o=el('option',null,(p.days===1?'당일':d+'일차'));o.value=d;dsel.appendChild(o)}
      var ssel=el('select');for(var m=om;m<cm;m+=30){var o2=el('option',null,m2t(m));o2.value=m2t(m);ssel.appendChild(o2)}ssel.value='10:00';
      var hsel=el('select');for(var h=1;h<=12;h++){var o3=el('option',null,h+'시간');o3.value=h;hsel.appendChild(o3)}hsel.value='2';
      var info=el('span','hi');
      function upd(){var e=t2m(ssel.value)+parseInt(hsel.value,10)*60;info.textContent='→ '+m2t(Math.min(e,24*60))+' 종료'+(e>cm?' (운영시간 '+p.close+' 초과)':'')}
      [['이용일',dsel],['시작',ssel],['이용 시간',hsel]].forEach(function(x){var l=el('label',null,x[0]+' ');l.appendChild(x[1]);cc.appendChild(l);x[1].onchange=upd});
      cc.appendChild(info);upd();cr.appendChild(cc);cr.style.display='none';tb2.appendChild(cr);
      bk[r.value]={on:false,dsel:dsel,ssel:ssel,hsel:hsel,name:r.name};
      tr.onclick=function(e){var b=bk[r.value];b.on=!b.on;cb.checked=b.on;tr.classList.toggle('on',b.on);cr.style.display=b.on?'':'none';done.disabled=!Object.keys(bk).some(function(k){return bk[k].on});err.textContent=''};
    });
    sc2.appendChild(tb2);c.appendChild(sc2);
    c.appendChild(el('div','hint','체크한 시설마다 이용일·시작 시각·이용 시간을 고르세요. 요금은 기본 2시간 + 추가 1시간 단위로 계산됩니다. (운영 '+p.open+'~'+p.close+')'));
    done.onclick=function(){var arr=[],lab=[];
      for(var k in bk){var b=bk[k];if(!b.on)continue;var st=b.ssel.value,hr=parseInt(b.hsel.value,10);
        if(t2m(st)+hr*60>cm){err.textContent=b.name+': 운영시간('+p.close+') 안에서 선택해 주세요.';return}
        arr.push({id:k,day:parseInt(b.dsel.value,10),start:st,hours:hr});
        lab.push(b.name+' '+(p.days===1?'':b.dsel.value+'일차 ')+st+'~'+m2t(t2m(st)+hr*60)+'('+hr+'시간)')}
      send('hallplan:'+JSON.stringify(arr),lab.join(' / '))};
  }
  c.appendChild(err);foot.appendChild(done);if(none)foot.appendChild(none);c.appendChild(foot);chat.appendChild(c)}
function renderFeedback(){var f=el('div','fb','이 답변이 도움이 되었나요?');
  [['👍 도움이 됐어요',1],['👎 아쉬워요',0]].forEach(function(x){var b=el('button',null,x[0]);b.onclick=function(){post('/api/feedback',{sid:sid,helpful:x[1]});f.textContent='의견 감사합니다.'};f.appendChild(b)});chat.appendChild(f)}
function renderQuote(q){
  var c=el('div','card quote');c.appendChild(el('h4',null,'예시 일정표 · 예상 견적 (시연용 모의 단가)'));
  if(q.summary)c.appendChild(el('div','hint',q.summary));
  q.schedule.forEach(function(d){c.appendChild(el('div',null,d.day+'일차 '+d.date)).style.fontWeight='700';var ul=el('ul','tl');d.items.forEach(function(i){var li=el('li');li.appendChild(el('b',null,i.time));li.appendChild(document.createTextNode(i.title));ul.appendChild(li)});c.appendChild(ul)});
  var t=el('table');t.innerHTML='<tr><th>항목</th><th>수량</th><th class=r>금액</th></tr>';
  q.lines.forEach(function(l){var tr=el('tr');var a=el('td',null,l.item);if(l.note){var n=el('div','hint',l.note);a.appendChild(n)}tr.appendChild(a);tr.appendChild(el('td',null,l.qty));tr.appendChild(el('td','r',(l.amount<0?'-':'')+won(Math.abs(l.amount))));t.appendChild(tr)});
  c.appendChild(t);
  var seen={},ph=el('div','photos');q.lines.forEach(function(l){if(l.photo&&!seen[l.photo]){seen[l.photo]=1;var f=el('figure');var i=el('img');i.src='img/'+l.photo;i.alt=l.item;f.appendChild(i);f.appendChild(el('figcaption',null,l.item));ph.appendChild(f)}});
  if(ph.children.length)c.appendChild(ph);
  var tot=el('div','total');tot.appendChild(el('span',null,'합계'));tot.appendChild(el('span',null,q.total_text+' (1인 약 '+q.per_person_text+')'));c.appendChild(tot);
  c.appendChild(el('div','disc',q.disclaimer));
  var a=el('a','btn sec','견적서 열기 / 인쇄(PDF 저장)');a.href='/quote/'+sid;a.target='_blank';a.style.cssText='display:inline-block;margin-top:10px;text-decoration:none';c.appendChild(a);
  chat.appendChild(c)}
function seg(name,vals,def){var d=el('div','seg');vals.forEach(function(v,i){var l=el('label');var r=el('input');r.type='radio';r.name=name;r.value=v;if(v===def||(!def&&i===0))r.checked=true;l.appendChild(r);l.appendChild(document.createTextNode(v));d.appendChild(l)});return d}
function fld(label,node,hint){var f=el('div','fld');f.appendChild(el('label','t',label));f.appendChild(node);if(hint)f.appendChild(el('div','hint',hint));return f}
function inp(type,ph,id){var i=el('input');i.type=type;i.placeholder=ph||'';if(id)i.id=id;return i}
function val(c,name){var r=c.querySelector('input[name='+name+']:checked');return r?r.value:''}
function renderForm(f){
  // Real personal information must never be passed to the browser-local Pyodide demo engine.
  var c=el('div','card form');
  c.appendChild(el('h4',null,'담당자 상담·민원 접수'));
  c.appendChild(el('div','hint','개인정보가 포함된 민원은 보안 접수 화면에서만 입력해 주세요. 기존 시연용 메모리 저장·이메일 전송은 사용하지 않습니다.'));
  var a=el('a','btn','보안 민원 접수 화면으로 이동');a.href='complaint.html';a.style.cssText='display:inline-block;margin-top:12px;text-decoration:none';c.appendChild(a);chat.appendChild(c);
}
// 초기 화면
var HOME=[['숙박요금','객실 요금이 얼마인가요?'],['프로그램','어떤 프로그램이 있나요?'],['단체예약','act:group'],['식사','식사 가격이 어떻게 되나요?'],['대관','세미나실 대관 가능한가요?'],['교통','오시는 길 알려주세요'],['이용방법','예약은 어떻게 하나요?'],['감면 기준','act:discount'],['주변 관광 추천','act:tour'],['민원·불편사항','불편사항 접수하고 싶어요']];
var hc=$('#homeChips');HOME.forEach(function(h){var b=el('button','chip',h[0]);b.type='button';b.onclick=function(){send(h[1],h[0])};hc.appendChild(b)});
var qb=$('#quickBar');HOME.forEach(function(h){var b=el('button','chip',h[0]);b.type='button';b.onclick=function(){send(h[1],h[0])};qb.appendChild(b)});
$('#form').addEventListener('submit',function(e){e.preventDefault();var v=input.value;input.value='';send(v)});
input.focus();
})();

fetch('/api/config').then(function(r){return r.json()}).then(function(c){if(!c.mock){var m=document.querySelector('.mock');if(m)m.style.display='none'}}).catch(function(){});
