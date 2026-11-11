export let emojiCatalog={groups:[],entries:[]};
export async function loadEmojiCatalog(){const r=await fetch('./emoji-catalog.json');if(!r.ok)throw Error('表情目录暂时无法加载');const data=await r.json();validateCatalog(data);emojiCatalog=data;}
export function validateCatalog(data){if(data?.version!==1||!Array.isArray(data.groups)||!Array.isArray(data.entries))throw Error('表情目录无效');const ids=new Set(),moods=new Set(),groups=new Set(data.groups.map(g=>g.id));for(const e of data.entries){if(!e.id||ids.has(e.id)||!Number.isInteger(e.mood)||e.mood<15||e.mood>38||moods.has(e.mood)||!groups.has(e.group))throw Error('表情编号无效');ids.add(e.id);moods.add(e.mood);}return data;}
export function filterEmojis(catalog,names,group='all',query='',favorites=new Set()){const q=query.trim().toLocaleLowerCase();return catalog.entries.filter(e=>(group==='all'||group==='fav'&&favorites.has(e.id)||e.group===group)&&(!q||[names[e.mood],...(e.aliases||[]),catalog.groups.find(g=>g.id===e.group)?.name||''].some(s=>s.toLocaleLowerCase().includes(q))));}
const KEY='lovenotes-emoji-favorites-v1';let memory=[];
export function readFavorites(){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');memory=Array.isArray(value)?value.filter(x=>typeof x==='string'):[];}catch{}return new Set(memory);}
export function writeFavorites(value){memory=[...value];try{localStorage.setItem(KEY,JSON.stringify(memory));}catch{}}
