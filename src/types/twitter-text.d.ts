declare module 'twitter-text' {
 export function parseTweet(text:string):{weightedLength:number;valid:boolean;permillage:number;validRangeStart:number;validRangeEnd:number};
 const twitterText:{parseTweet:typeof parseTweet};
 export default twitterText;
}
