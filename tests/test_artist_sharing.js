const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ID='12345678-1234-1234-1234-123456789abc';
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
 const container=new Node('div'),requests=[],copies=[],shares=[];
 const song={id:ID,status:'approved',title:'Dashboard title',song_id:'wrong-id'};
 let answer={song_id:ID,title:'Public title',artist_name:'Public artist'};
 const context={console,URL,URLSearchParams,window:{},document:{createElement:t=>new Node(t),getElementById:()=>container},navigator:{clipboard:{async writeText(v){copies.push(v);}},async share(v){shares.push(v);}},KOLO_API:{async get(path){requests.push(path);if(answer instanceof Error)throw answer;return answer;}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('frontend/js/sharing.js','utf8'),context);
 const source=fs.readFileSync('frontend/js/artist.js','utf8');vm.runInContext(source.slice(source.indexOf('function loadArtistSongs('),source.indexOf('function loadArtistSales(')),context);
 const buttons=()=>container.all().filter(n=>n.className==='artist-share-toggle');
 context.loadArtistSongs([song,{...song,status:'pending'},{...song,status:'rejected'},{...song,status:'unknown'},{...song,id:'invalid'},{...song,song_available:false}]);
 assert.equal(buttons().length,1);
 let button=buttons()[0];await button.click();
 assert.deepEqual(requests,[`/marketplace/song/${ID}`]);assert.equal(button.attrs['aria-expanded'],'true');
 let root=container.all().find(n=>n.className==='kolo-sharing');
 const canonical=`https://kolo-music.vercel.app/song.html?id=${ID}`;
 assert.equal(new URL(root.querySelector('[data-share="facebook"]').href).searchParams.get('u'),canonical);
 assert(new URL(root.querySelector('[data-share="whatsapp"]').href).searchParams.get('text').includes('Public title'));
 await root.querySelector('[data-share="copy"]').click();assert.deepEqual(copies,[canonical]);
 await root.querySelector('[data-share="native"]').click();assert.equal(shares[0].url,canonical);
 root.events.keydown({key:'Escape'});assert(root.hidden&&button.focused);
 for(let i=0;i<3;i++){context.loadArtistSongs([song]);assert.equal(buttons().length,1);await buttons()[0].click();}
 assert.equal(requests.length,4);
 answer=Object.assign(Error('Gone'),{status:404});context.loadArtistSongs([song]);button=buttons()[0];await button.click();
 root=container.all().find(n=>n.className==='kolo-sharing');assert(root.hidden);assert.equal(button.attrs['aria-expanded'],'false');
 answer={song_id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',title:'Wrong song'};await button.click();assert(root.hidden);
 const html=fs.readFileSync('frontend/artist.html','latin1');assert(html.indexOf('js/sharing.js')<html.indexOf('js/artist.js'));
 console.log('PASS: approved-only cards, song.id, public availability/mismatch checks, shared social URLs, copy/native sharing, Escape and refresh without duplicate handlers. Only public metadata GETs occurred.');
})().catch(e=>{console.error(e);process.exitCode=1});
