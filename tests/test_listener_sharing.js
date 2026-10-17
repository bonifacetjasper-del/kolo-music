const fs=require('fs'),vm=require('vm'),assert=require('assert');
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

(async()=>{const box=new Node('div'),message=new Node('p'),ID='12345678-1234-1234-1234-123456789abc';let purchases=0,available=true;const song={song_id:ID,title:'Song'};
const c={console,assert,URL,URLSearchParams,SCREAM_PRICE:50,window:{},navigator:{clipboard:{async writeText(v){assert(v.endsWith(ID));}}},document:{createElement:t=>new Node(t),getElementById:id=>id==='discoverMusicContainer'?box:message},prepareSong(){purchases++;},KOLO_API:{async get(p){if(p==='/songs/discover')return{songs:[song]};if(!available)throw Error('Gone');return song;}}};vm.createContext(c);vm.runInContext(fs.readFileSync('frontend/js/sharing.js','utf8'),c);const s=fs.readFileSync('frontend/js/listener.js','utf8');vm.runInContext(s.slice(s.indexOf('async function loadDiscoverMusic('),s.indexOf('function prepareSong(')),c);
for(let i=0;i<3;i++){await c.loadDiscoverMusic();const buttons=box.all().filter(n=>n.className==='discover-share-toggle');assert.equal(buttons.length,1);await buttons[0].click();const root=box.all().find(n=>n.className==='kolo-sharing');await root.querySelector('[data-share="copy"]').click();assert.equal(purchases,0);root.events.keydown({key:'Escape'});assert(root.hidden);box.all().find(n=>n.className==='play-song-btn').click();assert.equal(purchases,1);purchases=0;}
available=false;await c.loadDiscoverMusic();await box.all().find(n=>n.className==='discover-share-toggle').click();assert(box.all().find(n=>n.className==='kolo-sharing').hidden);
const html=fs.readFileSync('frontend/song.html','utf8'),js=fs.readFileSync('frontend/js/song.js','utf8');for(const v of ['scream-button','download-button','purchase-options'])assert(!html.includes(v));for(const v of ['KOLO_PURCHASE','startPurchase','prepareDownload'])assert(!js.includes(v));console.log('PASS: Discover sharing, refresh, unavailable songs, preserved purchase action, no public-page purchases');})().catch(e=>{console.error(e);process.exitCode=1});