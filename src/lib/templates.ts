import sharp from 'sharp';
export const templateNames=['Educational tip','Product spotlight','Announcement','Offer','FAQ','Testimonial'] as const;
const escape=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export async function renderTemplate(input:{title:string;body:string;brand:string;color:string;template:string}) {
  const lines=(text:string,max:number)=>{const words=text.split(/\s+/);const result:string[]=[];let line='';for(const word of words){if((line+' '+word).length>max&&line){result.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)result.push(line);return result;};
  const title=lines(input.title,25).slice(0,4);const body=lines(input.body,43).slice(0,7);
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="1080" height="1080" fill="#f8fafc"/><rect x="48" y="48" width="984" height="984" rx="40" fill="${input.color}"/><circle cx="950" cy="110" r="200" fill="white" opacity=".08"/><text x="100" y="150" fill="white" font-family="sans-serif" font-size="26">${escape(input.template.toUpperCase())}</text>${title.map((l,i)=>`<text x="100" y="${290+i*78}" fill="white" font-family="sans-serif" font-weight="bold" font-size="62">${escape(l)}</text>`).join('')}${body.map((l,i)=>`<text x="100" y="${650+i*40}" fill="white" font-family="sans-serif" font-size="32">${escape(l)}</text>`).join('')}<text x="100" y="965" fill="white" font-family="sans-serif" font-size="28">${escape(input.brand)}</text></svg>`)).png().toBuffer();
}
