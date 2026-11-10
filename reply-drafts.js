// Unsigned editor drafts: memory only, never IndexedDB or the sync queue.
export class ReplyDrafts {
 constructor(){this.owner=null;this.items=new Map();}
 key(user,note,response='new'){if(this.owner!==user){this.clear();this.owner=user;}return JSON.stringify([note,response||'new']);}
 get(user,note,response){return this.items.get(this.key(user,note,response));}
 put(user,note,response,value){this.items.set(this.key(user,note,response),structuredClone(value));}
 remove(user,note,response){this.items.delete(this.key(user,note,response));}
 clear(){this.items.clear();this.owner=null;}
}
