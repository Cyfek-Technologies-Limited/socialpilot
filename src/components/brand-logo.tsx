import Image from 'next/image';
import Link from 'next/link';

export function BrandLogo({small=false,className=''}:{small?:boolean;className?:string}){
 return <Link href="/" className={`wordmark soville-brand ${small?'small':''} ${className}`} aria-label="Soville home"><span className="soville-mark"><Image src="/branding/soville-mark.png" alt="" width={small?26:36} height={small?26:36}/></span><span className="soville-name">soville</span></Link>;
}
