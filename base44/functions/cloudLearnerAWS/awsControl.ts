import { XMLParser } from "npm:fast-xml-parser";
import { REGION } from "./model.ts";
const parser=new XMLParser({ignoreAttributes:true,parseTagValue:false});
const enc=(s:string)=>encodeURIComponent(s).replace(/[!'()*]/g,c=>"%"+c.charCodeAt(0).toString(16).toUpperCase());
const bytes=(s:string)=>new TextEncoder().encode(s);
const hex=(a:Uint8Array)=>Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("");
export async function hash(s:string){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes(s))));}
async function mac(k:string|Uint8Array,s:string){const key=await crypto.subtle.importKey("raw",typeof k==="string"?bytes(k):k as any,{name:"HMAC",hash:"SHA-256"},false,["sign"]);return new Uint8Array(await crypto.subtle.sign("HMAC",key,bytes(s)));}
function form(v:any,p="",out:Record<string,string>={}){
 for(const [key,value] of Object.entries(v)){if(value==null)continue;const path=p?p+"."+key:key;
 if(Array.isArray(value))value.forEach((item,i)=>{const q=path+".member."+(i+1);if(typeof item==="object")form(item,q,out);else out[q]=String(item);});
 else if(typeof value==="object")form(value,path,out);else out[path]=String(value);}
 return out;
}
export async function aws(service:"cloudformation"|"ssm",action:string,input:any){
 const access=Deno.env.get("AWS_LEARNER_ACCESS_KEY_ID"),secret=Deno.env.get("AWS_LEARNER_SECRET_ACCESS_KEY"),session=Deno.env.get("AWS_LEARNER_SESSION_TOKEN");
 if(!access||!secret)throw new Error("AWS_KEYS_MISSING");
 const query=service==="cloudformation"?form({Action:action,Version:"2010-05-15",...input}):null;
 const body=query?Object.keys(query).sort().map(k=>enc(k)+"="+enc(query[k])).join("&"):JSON.stringify(input);
 const host=service+"."+REGION+".amazonaws.com",stamp=new Date().toISOString().replace(/[:-]|\.\d{3}/g,""),date=stamp.slice(0,8);
 const headers:Record<string,string>={"content-type":query?"application/x-www-form-urlencoded; charset=utf-8":"application/x-amz-json-1.1",host,"x-amz-date":stamp};
 if(!query)headers["x-amz-target"]="AmazonSSM."+action;
 if(session)headers["x-amz-security-token"]=session;
 const names=Object.keys(headers).sort(),signed=names.join(";");
 const canonical="POST\n/\n\n"+names.map(k=>k+":"+headers[k].trim()+"\n").join("")+"\n"+signed+"\n"+await hash(body);
 const scope=date+"/"+REGION+"/"+service+"/aws4_request";
 let key=await mac("AWS4"+secret,date);key=await mac(key,REGION);key=await mac(key,service);key=await mac(key,"aws4_request");
 headers.authorization="AWS4-HMAC-SHA256 Credential="+access+"/"+scope+", SignedHeaders="+signed+", Signature="+hex(await mac(key,"AWS4-HMAC-SHA256\n"+stamp+"\n"+scope+"\n"+await hash(canonical)));
 const response=await fetch("https://"+host+"/",{method:"POST",headers,body,signal:AbortSignal.timeout(25000)});
 const raw=await response.text();let parsed:any;
 try{parsed=query?parser.parse(raw):JSON.parse(raw);}catch{throw new Error("AWS_RESPONSE_INVALID");}
 if(!response.ok){const detail=query?parsed.ErrorResponse?.Error:parsed;const code=String(detail?.Code||detail?.__type||"AWS_HTTP_"+response.status).split("#").pop()!;throw Object.assign(new Error(String(detail?.Message||detail?.message||code).slice(0,300)),{name:code});}
 return query?parsed[action+"Response"]?.[action+"Result"]||{}:parsed;
}
export const list=(value:any):any[]=>value==null?[]:Array.isArray(value)?value:[value];
