const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ID='12345678-1234-1234-1234-123456789abc',OTHER='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
class Node {
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.events={};this.hidden=false;}
 set innerHTML(v){this.children=[];} appendChild(n){this.children.push(n);return n;}
 setAttribute(k,v){this.attrs[k]=v;} removeAttribute(k){delete this[k];delete this.attrs[k];}
 addEventListener(k,v){assert(!this.events[k],'Duplicate handler');this.events[k]=v;}
 contains(n){return this.children.includes(n)||this.children.some(c=>c.contains(n));}
 querySelector(s){const name=/data-share="([^"]+)"/.exec(s)[1];return this.all().find(n=>n.attrs['data-share']===name);}
 all(){return this.children.flatMap(n=>[n,...n.all()]);} focus(){this.focused=true;} select(){this.selected=true;}
 click(){return this.events.click?.();}
}

(async()=>{
 const container=new Node('div');const actions=new Node('div'),info=new Node('div');container.appendChild(actions);container.appendChild(info);
 const original=container.querySelector.bind(container);container.querySelector=s=>s==='.gallery-actions'?actions:s==='.kolo-gallery-info'?info:original(s);
 const timers=new Map();let seq=0,copied,shared,answer={song_id:ID,title:'Public song',artist_name:'Artist'};const requests=[];
 const c={console,URL,URLSearchParams,window:{location:{}},document:{createElement:t=>new Node(t),addEventListener(){},querySelectorAll(){return[];}},navigator:{clipboard:{async writeText(v){copied=v;}},async share(v){shared=v;}},setInterval(fn,ms){assert.equal(ms,5000);timers.set(++seq,fn);return seq;},clearInterval(id){timers.delete(id);},KOLO_API:{async get(p){requests.push(p);if(answer instanceof Error)throw answer;return typeof answer==='function'?answer():answer;}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('frontend/js/sharing.js','utf8'),c);vm.runInContext(fs.readFileSync('frontend/js/gallery.js','latin1'),c);
 c.startKoloGallery();c.startKoloGallery();assert.equal(timers.size,1);
 c.attachKoloGallerySharing(container,{song_id:ID,title:'Displayed'});
 const button=actions.children[0];await button.click();assert.equal(timers.size,0);
 const root=info.children.find(n=>n.className==='kolo-sharing');const canonical='https://kolo-music.vercel.app/song.html?id='+ID;
 assert.equal(new URL(root.querySelector('[data-share="facebook"]').href).searchParams.get('u'),canonical);
 assert(new URL(root.querySelector('[data-share="whatsapp"]').href).searchParams.get('text').includes(canonical));
 await root.querySelector('[data-share="copy"]').click();assert.equal(copied,canonical);
 await root.querySelector('[data-share="native"]').click();assert.equal(shared.url,canonical);
 c.startKoloGallery();assert.equal(timers.size,0);root.events.keydown({key:'Escape'});assert(root.hidden&&button.focused);assert.equal(timers.size,1);
 let resolve;answer=()=>new Promise(r=>{resolve=r;});const pending=button.click();assert.equal(timers.size,0);
 // Rapid navigation invalidates the captured request before it completes.
 c.nextKoloGallerySong();resolve({song_id:ID,title:'Old response'});await pending;assert(root.hidden);assert.equal(timers.size,1);
 answer={song_id:OTHER,title:'Wrong song'};await button.click();assert(root.hidden);assert.equal(timers.size,1);
 answer=Object.assign(Error('Gone'),{status:404});await button.click();assert(root.hidden);assert.equal(timers.size,1);
 const before=actions.children.length;for(const song of [{song_id:'invalid'},{song_id:ID,status:'pending'},{song_id:ID,song_available:false}])c.attachKoloGallerySharing(container,song);assert.equal(actions.children.length,before);
 for(let i=0;i<3;i++){c.startKoloGallery();c.closeKoloGallerySharing();}assert.equal(timers.size,1);
 assert(requests.every(p=>p==='/marketplace/song/'+ID));
 const html=fs.readFileSync('frontend/index.html','latin1');assert(html.indexOf('js/sharing.js')<html.indexOf('js/gallery.js'));assert(html.includes('css/sharing.css'));
 console.log('PASS: anonymous gallery sharing, approved UUIDs, social URLs, copy/native sharing, pause/resume, rapid changes, stale metadata and single timer.');
})().catch(e=>{console.error(e);process.exitCode=1});