// Separate, private complaints API. Do NOT embed secrets in GitHub Pages.
// Bindings: DB(D1), PII_KEY(base64 32 bytes secret), ACCESS_TEAM_DOMAIN, ACCESS_AUD,
// ALLOW_ORIGIN, TURNSTILE_SECRET(secret), LIMITS(KV), RETENTION_DAYS(optional).
const json = (data, status=200, extra={}) => new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
function cors(origin,env){return origin===env.ALLOW_ORIGIN?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, GET, PATCH, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Cf-Access-Jwt-Assertion','Vary':'Origin'}:{'Vary':'Origin'};}
async function key(env){const b=Uint8Array.from(atob(env.PII_KEY||''),c=>c.charCodeAt(0));if(b.length!==32)throw Error('PII_KEY must be 32 bytes');return crypto.subtle.importKey('raw',b,'AES-GCM',false,['encrypt','decrypt']);}
async function encrypt(data,env){const iv=crypto.getRandomValues(new Uint8Array(12));const v=new TextEncoder().encode(JSON.stringify(data));const b=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env),v));return JSON.stringify({iv:Array.from(iv),ct:Array.from(b)});}
async function decrypt(blob,env){const o=JSON.parse(blob);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(o.iv)},await key(env),new Uint8Array(o.ct));return JSON.parse(new TextDecoder().decode(plain));}
const parseJwt=(token)=>{const p=token.split('.');if(p.length!==3)throw Error('invalid token');return {parts:p,header:JSON.parse(atob(p[0].replace(/-/g,'+').replace(/_/g,'/'))),payload:JSON.parse(atob(p[1].replace(/-/g,'+').replace(/_/g,'/')))};};
async function staff(req,env){const token=req.headers.get('Cf-Access-Jwt-Assertion');if(!token)throw Error('UNAUTHORIZED');const j=parseJwt(token);if(j.header.alg!=='RS256')throw Error('UNAUTHORIZED');const domain=String(env.ACCESS_TEAM_DOMAIN||'').replace(/\/$/,'');if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(domain))throw Error('ACCESS_TEAM_DOMAIN invalid');const resp=await fetch(domain+'/cdn-cgi/access/certs');if(!resp.ok)throw Error('Access certificate unavailable');const certs=await resp.json();const jwk=(certs.keys||[]).find(x=>x.kid===j.header.kid&&x.kty==='RSA');if(!jwk)throw Error('UNAUTHORIZED');const k=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);const sig=Uint8Array.from(atob(j.parts[2].replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0));const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',k,sig,new TextEncoder().encode(j.parts[0]+'.'+j.parts[1]));const p=j.payload,now=Math.floor(Date.now()/1000);if(!ok||p.exp<=now||p.nbf>now||p.iss!==domain||!(Array.isArray(p.aud)?p.aud.includes(env.ACCESS_AUD):p.aud===env.ACCESS_AUD)||!p.email)throw Error('UNAUTHORIZED');const u=await env.DB.prepare('SELECT email,department,role,active FROM staff WHERE email=?').bind(p.email.toLowerCase()).first();if(!u||!u.active)throw Error('FORBIDDEN');return u;}
const body=async(req)=>{const size=Number(req.headers.get('Content-Length')||'0');if(size>20000)throw Error('요청 크기 초과');return await req.json();};
const hasRole=(u,...roles)=>roles.includes(u.role);
const mayRead=(u,r)=>u.role==='admin'||(u.role==='manager'&&r.department===u.department)||(r.assignee===u.email);
async function audit(env,id,actor,action,detail=''){await env.DB.prepare('INSERT INTO audit(complaint_id,actor,action,detail,at) VALUES(?,?,?,?,?)').bind(id,actor,action,detail,new Date().toISOString()).run();}
async function limit(req,env){if(!env.LIMITS)throw Error('LIMITS binding missing');const ip=req.headers.get('CF-Connecting-IP')||'unknown';const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+new Date().toISOString().slice(0,13)));const v=Array.from(new Uint8Array(raw)).slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('');const n=Number(await env.LIMITS.get('submit:'+v)||0);if(n>=4)return false;await env.LIMITS.put('submit:'+v,String(n+1),{expirationTtl:3600});return true;}
async function captcha(token,req,env){if(!env.TURNSTILE_SECRET)throw Error('Turnstile secret missing');const data=new URLSearchParams({secret:env.TURNSTILE_SECRET,response:String(token||''),remoteip:req.headers.get('CF-Connecting-IP')||''});const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:data});const j=await r.json();return j.success===true;}
const PUBLIC_FIELDS=['category','summary','name','phone','email','method','consent','turnstile'];
export default {async scheduled(event,env,ctx){
  // Only activate after an approved institutional retention policy is configured.
  const days=Number(env.RETENTION_DAYS||0);if(!Number.isInteger(days)||days<1)return;
  const cutoff=new Date(Date.now()-days*86400000).toISOString();
  await env.DB.prepare("DELETE FROM audit WHERE complaint_id IN (SELECT id FROM complaints WHERE created_at < ?)").bind(cutoff).run();
  await env.DB.prepare("DELETE FROM complaints WHERE created_at < ?").bind(cutoff).run();
}, async fetch(req,env){const url=new URL(req.url),origin=req.headers.get('Origin')||'',corsH=cors(origin,env);const out=(v,s=200)=>json(v,s,corsH);try{
if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsH});
if(url.pathname==='/api/public/complaints'&&req.method==='POST'){
if(origin!==env.ALLOW_ORIGIN)return out({error:'허용되지 않은 출처'},403);
if(!await limit(req,env))return out({error:'접수 요청이 많습니다. 잠시 후 재시도해 주세요.'},429);
const x=await body(req);if(!await captcha(x.turnstile,req,env))return out({error:'자동접수 방지 인증에 실패했습니다.'},400);
if(x.consent!==true||typeof x.summary!=='string'||x.summary.trim().length<10||x.summary.length>3000||typeof x.name!=='string'||x.name.trim().length<2||x.name.length>80||!['일반','불편','칭찬','제안','단체상담'].includes(x.category)||!['전화','문자','이메일'].includes(x.method))return out({error:'필수 항목을 확인해 주세요.'},400);
if((x.method==='이메일'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email||''))||(x.method!=='이메일'&&!/^[0-9+\- ]{8,20}$/.test(x.phone||'')))return out({error:'연락 방법과 연락처를 확인해 주세요.'},400);
const id=crypto.randomUUID(),date=new Date().toISOString();const encrypted=await encrypt({summary:x.summary.trim(),name:x.name.trim(),phone:String(x.phone||'').slice(0,30),email:String(x.email||'').slice(0,150),method:x.method},env);
await env.DB.prepare('INSERT INTO complaints(id,category,status,department,assignee,pii,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,x.category,'접수','미배정',null,encrypted,date,date).run();await audit(env,id,'public','created','category='+x.category);
return out({ok:true,receipt:id,message:'민원이 접수되었습니다. 접수번호를 보관해 주세요.'},201);
}
if((url.pathname==='/staff.html'||url.pathname==='/staff.js')&&req.method==='GET') {
  // Cloudflare Access application MUST cover these two paths before Workers execution.
  if(!env.ASSETS)return out({error:'staff assets binding missing'},503);
  return env.ASSETS.fetch(req);
}
if(!url.pathname.startsWith('/api/staff/'))return out({error:'Not found'},404);
// Require the Access application to cover all /api/staff/* routes. Never allow public staff endpoints.
const u=await staff(req,env);
if(url.pathname==='/api/staff/me'&&req.method==='GET')return out({email:u.email,department:u.department,role:u.role});
if(url.pathname==='/api/staff/complaints'&&req.method==='GET'){
const rows=await env.DB.prepare('SELECT id,category,status,department,assignee,created_at,updated_at FROM complaints WHERE (?="admin") OR (?="manager" AND department=?) OR assignee=? ORDER BY created_at DESC LIMIT 100').bind(u.role,u.role,u.department,u.email).all();return out({items:rows.results||[]});}
const match=url.pathname.match(/^\/api\/staff\/complaints\/([0-9a-f-]{36})(?:\/(assign|status|history))?$/);if(!match)return out({error:'Not found'},404);
const r=await env.DB.prepare('SELECT * FROM complaints WHERE id=?').bind(match[1]).first();if(!r)return out({error:'접수번호 없음'},404);
if(!mayRead(u,r))return out({error:'권한 없음'},403);
if(req.method==='GET'&&!match[2]){await audit(env,r.id,u.email,'viewed');return out({id:r.id,category:r.category,status:r.status,department:r.department,assignee:r.assignee,created_at:r.created_at,updated_at:r.updated_at,detail:await decrypt(r.pii,env)});}
if(req.method==='GET'&&match[2]==='history'){const h=await env.DB.prepare('SELECT actor,action,detail,at FROM audit WHERE complaint_id=? ORDER BY at DESC LIMIT 100').bind(r.id).all();return out({items:h.results||[]});}
if(req.method==='PATCH'&&match[2]==='assign'){
if(!hasRole(u,'admin','manager'))return out({error:'배정 권한 없음'},403);
const x=await body(req),target=String(x.assignee||'').trim().toLowerCase();const person=await env.DB.prepare('SELECT email,department,active FROM staff WHERE email=?').bind(target).first();if(!person||!person.active)return out({error:'직원을 찾을 수 없습니다.'},400);
if(u.role==='manager'&&person.department!==u.department)return out({error:'타 부서 배정 권한 없음'},403);
await env.DB.prepare('UPDATE complaints SET assignee=?,department=?,updated_at=? WHERE id=?').bind(target,person.department,new Date().toISOString(),r.id).run();await audit(env,r.id,u.email,'assigned',target);return out({ok:true});}
if(req.method==='PATCH'&&match[2]==='status'){
const x=await body(req);if(!['접수','확인중','처리완료'].includes(x.status))return out({error:'잘못된 상태'},400);
await env.DB.prepare('UPDATE complaints SET status=?,updated_at=? WHERE id=?').bind(x.status,new Date().toISOString(),r.id).run();await audit(env,r.id,u.email,'status',x.status);return out({ok:true});}
return out({error:'지원하지 않는 요청'},405);
}catch(e){if(e.message==='UNAUTHORIZED')return out({error:'직원 로그인 필요'},401);if(e.message==='FORBIDDEN')return out({error:'등록되지 않은 직원'},403);if(['PII_KEY must be 32 bytes','LIMITS binding missing','Turnstile secret missing','ACCESS_TEAM_DOMAIN invalid'].includes(e.message))return out({error:'서버 보안 설정을 확인해야 합니다.'},503);return out({error:'요청을 처리하지 못했습니다.'},500);}}};
