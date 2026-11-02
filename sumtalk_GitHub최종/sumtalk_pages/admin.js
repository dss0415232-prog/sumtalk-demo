(function(){
'use strict';
var token=null,real=false,tab='dash';
var $=function(s){return document.querySelector(s)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function api(p,d){var o={headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'}};if(d){o.method='POST';o.body=JSON.stringify(d)}return fetch(p,o).then(function(r){if(r.status===401){location.reload()}return r.json()})}
$('#go').onclick=function(){fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('#pw').value})}).then(function(r){return r.json()}).then(function(r){if(r.ok){token=r.token;$('#login').style.display='none';$('#app').style.display='block';init()}else $('#lerr').textContent=r.error})};
$('#pw').addEventListener('keydown',function(e){if(e.key==='Enter')$('#go').click()});
var TABS=[['dash','대시보드'],['inq','상담 요청함'],['learn','질문 축적'],['faq','FAQ 승인'],['voc','5개년 VoC 분석'],['mail','발송함']];
function init(){var t=$('#tabs');TABS.forEach(function(x){var b=el('button',x[0]===tab?'on':'',x[1]);b.onclick=function(){tab=x[0];[].forEach.call(t.children,function(c){c.classList.remove('on')});b.classList.add('on');show()};t.appendChild(b)});show()}
function show(){var v=$('#view');v.innerHTML='';({dash:dash,inq:inq,learn:learn,faq:faq,voc:voc,mail:mail})[tab](v)}
function kpi(l,n,sub,hero){var k=el('div','kpi'+(hero?' hero-k':''));k.appendChild(el('div','n',n));k.appendChild(el('div','l',l));if(sub)k.appendChild(el('div','l',sub));return k}
function bars(title,rows,labelKey,valKey,note){var p=el('div','panel');p.appendChild(el('h3',null,title));var max=Math.max.apply(null,rows.map(function(r){return r[valKey]}).concat([1]));
  rows.forEach(function(r){var d=el('div','bar');d.appendChild(el('span',null,r[labelKey]));var b=el('div','b');var i=el('i');i.style.width=(100*r[valKey]/max)+'%';b.appendChild(i);d.appendChild(b);d.appendChild(el('span',null,r[valKey]));p.appendChild(d)});
  if(note)p.appendChild(el('div','hint',note));return p}
function dash(v){
  var bar=el('div');bar.style.cssText='display:flex;gap:10px;align-items:center;margin-bottom:10px';
  var b=el('button','btn sec',real?'모의 로그 포함 보기':'이 화면에서 시연한 데이터만 보기');b.onclick=function(){real=!real;show()};bar.appendChild(b);v.appendChild(bar);
  api('/api/admin/stats?real='+(real?1:0)).then(function(s){
    var n=el('div','disc',s.mock_notice);n.style.marginBottom='12px';v.appendChild(n);
    api('/api/admin/llm').then(function(l){var d=el('div','hint','LLM: '+(l.enabled?(l.provider+' / '+l.model+' · 호출 '+l.calls+' (성공 '+l.ok+', 실패 '+l.fail+')'+(l.last_error?' · 최근 오류: '+l.last_error:'')):'미연결(근거 원문 답변 모드)')+' · LLM 작성 답변 '+s.llm_answers+'건 / 원문 답변 '+s.template_answers+'건');d.style.marginBottom='8px';n.after(d)});
    var g=el('div','grid g4');
    g.appendChild(kpi('AI 1차 응답으로 담당자 연결 없이 해결된 비율',s.ai_resolved_pct+'%',s.ai_resolved+'건 / 전체 '+s.total+'건',true));
    g.appendChild(kpi('담당자 전환율',s.converted_pct+'%',s.converted+'건'));
    g.appendChild(kpi('AI 답변 성공률(질문 기준)',s.ai_success_pct+'%','질문 '+s.turns+'건'));
    g.appendChild(kpi('단체예약 문의',s.group+'건'));
    g.appendChild(kpi('평균 처리시간',s.avg_hours==null?'-':s.avg_hours+'시간','접수→연락완료(모의 포함)'));
    g.appendChild(kpi('이용자 만족도(도움됨)',s.satisfaction_pct+'%','응답 '+s.feedback_n+'건'));
    g.appendChild(kpi('축적된 FAQ(승인 완료)',s.faq_approved+'건','승인 대기 '+s.faq_pending+'건 · 답변 못 한 질문 '+s.unanswered_open+'묶음'));
    g.appendChild(kpi('축적 FAQ가 직원 없이 답한 횟수',s.faq_uses+'회','질문이 쌓일수록 늘어나는 AI 1차 응답'));
    g.appendChild(kpi('처리 대기',s.pending+'건','접수·확인중'));
    g.appendChild(kpi('직원보호·반복문의 감지',s.protect+' / '+s.repeat+'건','폭언·위협 표현 / 반복 문의'));
    v.appendChild(g);v.appendChild(el('div','hint','추정 절감: 약 '+s.saved_minutes_assumed+'분 — '+s.assumption));
    var g2=el('div','grid g2');g2.style.marginTop='14px';
    var p=el('div','panel');p.appendChild(el('h3',null,'최근 14일 문의 추이 (초록: AI 해결 / 주황: 담당자 전환)'));var cols=el('div','cols');var mx=Math.max.apply(null,s.daily.map(function(d){return d.n}).concat([1]));
    s.daily.forEach(function(d){var c=el('div','c');var a=el('i','a');a.style.height=(100*d.ai/mx)+'px';var o=el('i','v');o.style.height=(100*d.conv/mx)+'px';c.appendChild(o);c.appendChild(a);c.appendChild(document.createTextNode(d.d.slice(5)));c.title=d.d+' 전체 '+d.n;cols.appendChild(c)});p.appendChild(cols);g2.appendChild(p);
    g2.appendChild(bars('반복질문 TOP 10',s.top,'title','n','같은 근거 답변으로 즉시 안내된 횟수'));
    g2.appendChild(bars('민원 유형별',s.categories,'c','n'));
    g2.appendChild(bars('담당부서별 문의량',s.departments,'name','n'));
    v.appendChild(g2)})}
function inq(v){
  var f=el('div');f.style.cssText='display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap';
  var st=el('select');['','접수','확인중','연락완료'].forEach(function(x){var o=el('option',null,x||'전체 상태');o.value=x;st.appendChild(o)});
  var kd=el('select');[['','전체 유형'],['consult','일반 상담'],['group','단체예약']].forEach(function(x){var o=el('option',null,x[1]);o.value=x[0];kd.appendChild(o)});
  st.style.width=kd.style.width='auto';var rl=el('label');var rc=el('input');rc.type='checkbox';rc.checked=real;rl.appendChild(rc);rl.appendChild(document.createTextNode(' 직접 시연한 건만'));rl.style.alignSelf='center';
  f.appendChild(st);f.appendChild(kd);f.appendChild(rl);v.appendChild(f);var box=el('div','grid g2');box.style.gridTemplateColumns='minmax(0,1.3fr) minmax(0,1fr)';v.appendChild(box);
  var list=el('div','panel'),det=el('div','panel');det.appendChild(el('div','hint','왼쪽에서 상담 요청을 선택하세요.'));box.appendChild(list);box.appendChild(det);
  function load(){api('/api/admin/inquiries?status='+encodeURIComponent(st.value)+'&kind='+kd.value+'&real='+(rc.checked?1:0)).then(function(rows){list.innerHTML='';
    var t=el('table','list');t.innerHTML='<tr><th>접수</th><th>유형/분류</th><th>내용</th><th>상태</th></tr>';
    rows.forEach(function(r){var tr=el('tr','click');var f1=el('td',null,r.ts.slice(5,16));tr.appendChild(f1);var c2=el('td');c2.appendChild(el('span','tag',r.kind==='group'?'단체':'상담'));c2.appendChild(document.createTextNode(' '+r.category));if(r.flags){c2.appendChild(el('div','tag warn',r.flags.length>26?r.flags.slice(0,26)+'…':r.flags))}tr.appendChild(c2);
      tr.appendChild(el('td',null,(r.summary||'').slice(0,50)));var c4=el('td');c4.appendChild(el('span','tag'+(r.status==='접수'?' warn':''),r.status));tr.appendChild(c4);tr.onclick=function(){detail(r)};t.appendChild(tr)});
    list.appendChild(t);if(!rows.length)list.appendChild(el('div','hint','접수된 상담 요청이 없습니다. 국민용 화면에서 상담 요청을 만들어 보세요.'))})}
  function detail(r){det.innerHTML='';det.appendChild(el('h3',null,r.id+' · '+(r.kind==='group'?'단체예약 상담':'상담 요청')));var d=el('dl','detail');
    function row(k,x){if(x==null||x==='')return;d.appendChild(el('dt',null,k));d.appendChild(el('dd',null,x))}
    row('담당 업무',r.dept_name);row('민원 분류',r.category);row('민원 내용(고객 요약)',r.summary);row('AI가 안내한 내용',r.ai_answer);row('추가 확인이 필요한 내용',r.needs_check);
    row('희망 연락 방법',r.method);row('희망 연락 일시',r.time_pref);row('성함',r.contact_name);row('전화',r.phone_masked);row('이메일',r.contact_email);row('기타 요청사항',r.memo);
    if(r.payload&&Object.keys(r.payload).length){var s='';Object.keys(r.payload).forEach(function(k){var x=r.payload[k];if(x!=null&&x!=='')s+=k+': '+(Array.isArray(x)?x.join(', '):x)+'\n'});row('단체예약 조건',s)}
    row('감지 표시',r.flags);det.appendChild(d);
    var bt=el('div');bt.style.cssText='display:flex;gap:6px;margin-top:12px;flex-wrap:wrap';['접수','확인중','연락완료'].forEach(function(s){var b=el('button','btn'+(r.status===s?'':' sec'),s);b.onclick=function(){api('/api/admin/status',{id:r.id,status:s}).then(function(){r.status=s;load();detail(r)})};bt.appendChild(b)});det.appendChild(bt);
    det.appendChild(el('div','hint','담당자는 위 내용을 확인한 뒤 고객에게 처음부터 다시 묻지 않고 후속 연락합니다.'))}
  st.onchange=kd.onchange=rc.onchange=load;load()}
function learn(v){
  v.appendChild(el('div','disc','AI가 근거를 찾지 못한 질문(개인정보는 자동으로 가려 저장)이 비슷한 것끼리 묶여 많이 들어온 순으로 나옵니다. 직원이 답변을 작성해 올리면 고객지원팀 담당자가 승인하고, 승인 즉시 다음 질문부터 AI가 그 답변을 사용합니다.'));
  var box=el('div','grid g2');box.style.cssText='grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);margin-top:12px';v.appendChild(box);
  var list=el('div','panel'),det=el('div','panel');box.appendChild(list);box.appendChild(det);det.appendChild(el('div','hint','왼쪽에서 질문을 선택하면 답변 작성 칸이 열립니다.'));
  var depts=[];
  function load(){api('/api/admin/unanswered').then(function(d){depts=d.depts;list.innerHTML='';list.appendChild(el('h3',null,'답변 못 한 질문 ('+d.items.length+'묶음)'));
    var t=el('table','list');t.innerHTML='<tr><th>횟수</th><th>질문</th><th>담당</th></tr>';
    d.items.forEach(function(c){var tr=el('tr','click');tr.appendChild(el('td',null,c.count+'회'));var q=el('td',null,c.question);if(c.mock){q.appendChild(el('span','tag',' 시연용'))}tr.appendChild(q);tr.appendChild(el('td',null,c.dept_name.split('(')[0]));tr.onclick=function(){form(c)};t.appendChild(tr)});
    list.appendChild(t);if(!d.items.length)list.appendChild(el('div','hint','답변 못 한 질문이 없습니다. 국민용 화면에서 FAQ에 없는 질문을 해 보세요.'))})}
  function field(lbl,node){var f=el('div','fld');f.appendChild(el('label','t',lbl));f.appendChild(node);return f}
  function form(c){det.innerHTML='';det.appendChild(el('h3',null,'FAQ 초안 작성 · 같은 질문 '+c.count+'회'));
    var q=el('textarea');q.rows=2;q.value=c.question;var ex=el('textarea');ex.rows=3;ex.value=c.samples.slice(1).join('\n');ex.placeholder='비슷한 표현(줄바꿈으로 구분)';
    var a=el('textarea');a.rows=6;a.placeholder='고객에게 보일 답변을 작성하세요. 확인되지 않은 내용은 쓰지 마세요.';
    var dp=el('select');depts.forEach(function(x){var o=el('option',null,x.name);o.value=x.id;if(x.id===c.dept)o.selected=true;dp.appendChild(o)});
    var kw=el('input');kw.type='text';kw.value=c.keywords.join(';');var au=el('input');au.type='text';au.placeholder='작성자(선택)';
    det.appendChild(field('질문',q));det.appendChild(field('비슷한 표현',ex));det.appendChild(field('답변',a));det.appendChild(field('담당 업무',dp));det.appendChild(field('키워드(;로 구분)',kw));det.appendChild(field('작성자',au));
    var err=el('div','err');var b=el('button','btn','승인 요청으로 올리기');b.onclick=function(){api('/api/admin/faq/draft',{question:q.value,examples:ex.value,answer:a.value,dept:dp.value,keywords:kw.value,author:au.value}).then(function(r){if(r.ok){det.innerHTML='';det.appendChild(el('div','hint','FAQ 초안 '+r.id+'을(를) 올렸습니다. 「FAQ 승인」 탭에서 고객지원팀 담당자가 승인하면 반영됩니다.'));load()}else err.textContent=r.error})};
    det.appendChild(b);det.appendChild(err);det.appendChild(el('div','hint','전화번호·이메일 등 개인정보는 저장 시 자동으로 가려집니다.'))}
  load()}
function faq(v){
  api('/api/admin/faq').then(function(d){var p=el('div','panel');p.appendChild(el('h3',null,'FAQ 승인 · 반영 현황'));
    p.appendChild(el('div','hint','승인은 고객지원팀 담당자가 합니다. 승인하면 즉시 지식베이스에 반영되어 다음 질문부터 AI가 이 답변을 사용합니다. 승인하지 않은 초안은 사용되지 않습니다.'));
    if(!d.items.length)p.appendChild(el('div','hint','아직 등록된 FAQ가 없습니다. 「질문 축적」 탭에서 답변을 작성해 올려 보세요.'));
    d.items.forEach(function(r){var c=el('div','panel');c.style.margin='10px 0';c.appendChild(el('h3',null,r.title));
      var meta=el('div','hint',r.id+' · '+r.dept_name+' · 작성 '+(r.author||'-')+' '+r.ts.slice(0,16)+(r.approver?' · 승인/반려 '+r.approver+' '+(r.decided_ts||'').slice(0,16):''));c.appendChild(meta);
      c.appendChild(el('span','tag'+(r.status==='대기'?' warn':''),r.status));if(r.status==='승인')c.appendChild(el('span','tag','AI가 사용한 횟수 '+r.uses+'회'));
      var a=el('textarea');a.rows=4;a.value=r.answer;a.style.cssText='width:100%;margin-top:8px';if(r.status!=='대기')a.readOnly=true;c.appendChild(a);
      if(r.status==='대기'||r.status==='승인'){var row=el('div');row.style.cssText='display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center';var ap=el('input');ap.type='text';ap.placeholder='승인자(고객지원팀 담당자)';ap.style.width='220px';row.appendChild(ap);
        var pw=null;if(d.approver_pw_required){pw=el('input');pw.type='password';pw.placeholder='승인 비밀번호';pw.style.width='140px';row.appendChild(pw)}
        var err=el('span','err');
        function dec(x){return function(){api('/api/admin/faq/decide',{id:r.id,decision:x,approver:ap.value,approver_pw:pw?pw.value:'',answer:r.status==='대기'?a.value:''}).then(function(res){if(res.ok)show();else err.textContent=res.error})}}
        if(r.status==='대기'){var b1=el('button','btn','승인(즉시 반영)');b1.onclick=dec('승인');row.appendChild(b1)}
        var b2=el('button','btn sec',r.status==='승인'?'승인 취소(사용 중지)':'반려');b2.onclick=dec('반려');row.appendChild(b2);row.appendChild(err);c.appendChild(row)}
      p.appendChild(c)});v.appendChild(p)})}
function voc(v){
  api('/api/admin/voc').then(function(d){
    var n=el('div','disc','5개년 VoC 관리대장(2023~2026.10.2 기준)에서 집계한 통계입니다. 원문 의견과 개인정보는 이 시제품에 포함되지 않았습니다. 2025·2026년은 기재 건수가 적은 해(2026년은 10월 2일까지)로 단순 비교에 주의하세요. 이 자료는 설문 의견(VoC)이며 전화·게시판 문의 이력이 아닙니다.');v.appendChild(n);
    var ys=Object.keys(d.years).sort();var p=el('div','panel');p.style.margin='12px 0';p.appendChild(el('h3',null,'연도별 의견 현황'));
    var t=el('table','list');t.innerHTML='<tr><th>연도</th><th>의견 기재</th><th>칭찬</th><th>개선·불편</th><th>프로그램</th><th>시설</th><th>객실</th><th>식사</th></tr>';
    ys.forEach(function(y){var o=d.years[y],c=o['분류별']||{};var tr=el('tr');[y,o['의견_기재건수'],o['칭찬'],o['개선·불편_의견'],c['프로그램']||0,c['시설']||0,(c['객실']||0),c['식사']||0].forEach(function(x){tr.appendChild(el('td',null,x))});t.appendChild(tr)});p.appendChild(t);v.appendChild(p);
    var agg={};ys.forEach(function(y){var th=d.years[y]['주제별(키워드중복가능)'];Object.keys(th).forEach(function(k){agg[k]=(agg[k]||0)+th[k]})});
    var rows=Object.keys(agg).map(function(k){return {k:k,n:agg[k]}}).sort(function(a,b){return b.n-a.n});
    var g=el('div','grid g2');g.appendChild(bars('반복되는 불편·개선 주제 (4개년 합계, 키워드 기준)',rows,'k','n','한 의견이 여러 주제에 해당할 수 있음. 숲톡 지식베이스·FAQ 우선 보강 대상 선정에 활용.'));
    var q=el('div','panel');q.appendChild(el('h3',null,'활용 방식'));q.appendChild(el('div',null,'· 반복 주제 → FAQ·근거 답변 우선 작성\n· 불편 유형 → 담당 업무 자동 분류 규칙(벌레·방역/객실설비/식사 등)\n· 칭찬 의견 → 만족 요인 분석(이 시제품은 제외)\n· 원문은 기관 내부에서만 비식별 처리 후 활용'));q.style.whiteSpace='pre-wrap';g.appendChild(q);v.appendChild(g)})}
function mail(v){api('/api/admin/outbox').then(function(rows){var p=el('div','panel');p.appendChild(el('h3',null,'이메일 발송 기록 (SMTP 미설정 시 outbox 폴더에 .eml 저장)'));var t=el('table','list');t.innerHTML='<tr><th>시각</th><th>받는 사람</th><th>제목</th><th>방식</th><th>상태</th></tr>';rows.forEach(function(r){var tr=el('tr');[r.ts,r.to_addr,r.subject,r.mode,r.status].forEach(function(x){tr.appendChild(el('td',null,x))});t.appendChild(tr)});p.appendChild(t);if(!rows.length)p.appendChild(el('div','hint','발송 기록이 없습니다.'));v.appendChild(p)})}
})();
