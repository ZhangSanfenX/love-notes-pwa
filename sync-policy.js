export function indexRevision(items){return JSON.stringify(items.map(n=>[n.id,n.scope,n.version,n.responseRevision||0,!!n.deleted,n.owner,n.author,n.username]).sort((a,b)=>a[0].localeCompare(b[0])));}
export function syncDelay(journal,failures=0){return Math.min(300000,(journal?20000:60000)*2**Math.min(4,Math.max(0,failures)));}
