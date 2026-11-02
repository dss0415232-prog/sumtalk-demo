/* GitHub Pages용 연결 코드: 서버 없이 브라우저 안에서 Python(Pyodide)으로 같은 엔진을 실행합니다.
   /api/*, /quote/* 요청을 가로채 브라우저 안의 엔진으로 처리합니다. 화면 코드(app.js, admin.js)는 서버 버전과 동일합니다. */
(function(){
'use strict';
var origFetch=window.fetch.bind(window), py=null, ready=null, ov=null;
function overlay(msg){
  if(!ov){ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(245,242,234,.96);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;color:#1f4d36;text-align:center;padding:20px';
    ov.innerHTML='<div style="font-size:42px">🌲</div><div id="bgmsg" style="font-size:17px;font-weight:700;margin-top:10px"></div><div id="bgsub" style="font-size:13px;color:#666;margin-top:8px">처음 한 번만 10~20초 걸립니다. 잠시만 기다려 주세요.</div>';
    (document.body||document.documentElement).appendChild(ov)}
  document.getElementById('bgmsg').textContent=msg}
function loadScript(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=function(){no(new Error('로드 실패: '+src))};document.head.appendChild(s)})}
function mk(pyodide,path){var parts=path.split('/'),cur='';for(var i=0;i<parts.length-1;i++){cur+='/'+parts[i];try{pyodide.FS.mkdir(cur)}catch(e){}}}
function init(){
  if(ready)return ready;
  ready=(async function(){
    overlay('숲톡 민원AI를 준비하고 있어요…');
    await loadScript('pyodide/pyodide.js');
    var pyodide=await loadPyodide({indexURL:'pyodide/'});
    overlay('엔진을 불러오는 중…');
    await pyodide.loadPackage('sqlite3');
    var bundle=await (await origFetch('py_bundle.json')).json();
    Object.keys(bundle).forEach(function(p){var full='/app/'+p;mk(pyodide,'app/'+p);pyodide.FS.writeFile(full,bundle[p])});
    overlay('데이터를 준비하는 중…');
    pyodide.runPython("import sys, os\nsys.path.insert(0,'/app')\nsys.path.insert(0,'/app/tools')\nos.environ['SUMTALK_DB']='/tmp/sumtalk.db'\nimport static_api\nstatic_api.startup()");
    py=pyodide.pyimport('static_api');
    if(ov){ov.remove();ov=null}
    return true})();
  ready.catch(function(e){overlay('불러오지 못했습니다. 새로고침해 주세요. ('+e.message+')');document.getElementById('bgsub').textContent='인터넷 연결과 브라우저(Chrome·Edge 최신 버전)를 확인해 주세요.'});
  return ready}
function toResp(r){var o=JSON.parse(r);var b=o.body.replace(/"\/img\//g,'"img/');
  return new Response(b,{status:o.status,headers:{'Content-Type':o.type==='html'?'text/html; charset=utf-8':'application/json; charset=utf-8'}})}
window.fetch=function(url,opts){
  var u=typeof url==='string'?url:(url&&url.url)||'';
  if(/^\/(api|quote)\//.test(u)){
    return init().then(function(){opts=opts||{};var h=opts.headers||{};
      var r=py.handle((opts.method||'GET').toUpperCase(),u,opts.body||'',h.Authorization||h.authorization||'');return toResp(r)})}
  return origFetch.apply(this,arguments)};
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[href^="/quote/"]');if(!a)return;
  e.preventDefault();var w=window.open('','_blank');
  window.fetch(a.getAttribute('href')).then(function(r){return r.text()}).then(function(t){if(w){w.document.open();w.document.write(t);w.document.close()}})},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
