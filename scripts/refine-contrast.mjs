import {readFileSync,writeFileSync} from 'node:fs';
const path='src/app/globals.css';let css=readFileSync(path,'utf8');
// Keep pale surfaces while ensuring muted text remains legible on them.
css=css.replace(/(?<![-\w])color:(#[0-9a-fA-F]{6})(?![0-9a-fA-F])/g,(all,hex)=>{
 const values=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const lum=values.reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);if(lum<125||hex.toLowerCase()==='#ffffff')return all;
 const scale=125/lum;return 'color:#'+values.map(n=>Math.round(n*scale).toString(16).padStart(2,'0')).join('');
});writeFileSync(path,css);
