export const channelReferenceHelp='Use a YouTube @handle, channel link such as https://www.youtube.com/@creator, or UC channel ID.';
export function parseChannelReference(value:string):{id:string}|{forHandle:string}|{forUsername:string}|null {
 const input=value.trim();
 if(/^UC[\w-]{22}$/.test(input))return {id:input};
 if(/^@[\p{L}\p{N}\p{M}._-]{3,30}$/u.test(input))return {forHandle:input};
 try{
  const url=new URL(/^https?:\/\//i.test(input)?input:'https://'+input);
  if(!['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname)||!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port)return null;
  const path=url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if(path[0]?.startsWith('@'))return parseChannelReference(path[0]);
  if(path[0]==='channel'&&/^UC[\w-]{22}$/.test(path[1]||''))return {id:path[1]};
  if(path[0]==='user'&&/^[\w.-]{1,100}$/.test(path[1]||''))return {forUsername:path[1]};
 }catch{return null;}
 return null;
}
