import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

const BASELINE=650, MIN=300, MAX=850, VERSION="CCI-ASSESS-2026.2";
const clamp=(n:number,a=0,b=100)=>Math.min(b,Math.max(a,n));
const sev=(s:unknown)=>String(s||"informational").toLowerCase();
const band=(n:number)=>n>=800?"Exceptional":n>=740?"Strong":n>=670?"Good":n>=600?"Fair":n>=500?"High Risk":"Critical";
const adjust=(score:number,pos:number,neg:number)=>score>=65?((score-65)/35)*pos:((score-65)/65)*neg;
const validDate=(v:unknown)=>{const d=new Date(String(v||""));return Number.isNaN(d.getTime())?null:d;};
const uniq=(rows:any[])=>Array.from(new Map((rows||[]).map((r:any)=>[String(r.id||r.title||r.name||JSON.stringify(r)).toLowerCase(),r])).values());

Deno.serve(async(req)=>{
 try{
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user)return Response.json({error:"Unauthorized"},{status:401});
  const b=await req.json();
  for(const k of ["business_name","business_address","poc_name"])if(!String(b[k]||"").trim())return Response.json({error:`${k.replaceAll("_"," ")} is required`},{status:400});
  const files=(b.report_files||[]).filter((f:any)=>f?.file_url);
  if(!files.length)return Response.json({error:"Upload at least one assessment report"},{status:400});
  const allowed=/\.(pdf|doc|docx|xls|xlsx|csv)$/i;
  if(files.some((f:any)=>!allowed.test(String(f.name||""))))return Response.json({error:"Supported report formats are PDF, Word, Excel, and CSV"},{status:400});
  const prompt=`Act as a cybersecurity assessment evidence analyst. Review the attached reports for ${b.business_name}. Reconcile duplicates across executive, technical, activity, and vulnerability reports. The technical report is authoritative for penetration-test findings; an executive summary must not create duplicate findings. Activity logs prove an attack was attempted, but mark an attack successful ONLY when a report explicitly proves unauthorized access, execution, privilege, lateral movement, persistence, or data access. Never infer success from a module being launched or completed. Return concise evidence-grounded JSON. Dates must be ISO YYYY-MM-DD when available. Severity is critical, high, medium, low, or informational.
Required output: vulnerability_counts {critical,high,medium,low,informational}; vulnerability_findings [{id,title,severity,asset,evidence,source_report}]; pentest_findings [{id,title,severity,asset,evidence,source_report,external_management_exposed:boolean}]; attack_evidence [{name,status:"attempted"|"successful",evidence,source_report}]; assessment_dates {vulnerability_assessment,penetration_test}; executive_summary; coverage_summary; warnings. Do not calculate scores.`;
  const result=await base44.integrations.Core.InvokeLLM({
   prompt, model:"claude_sonnet_4_6", file_urls:files.map((f:any)=>f.file_url),
   response_json_schema:{type:"object",properties:{
    vulnerability_counts:{type:"object"},vulnerability_findings:{type:"array",items:{type:"object"}},
    pentest_findings:{type:"array",items:{type:"object"}},attack_evidence:{type:"array",items:{type:"object"}},
    assessment_dates:{type:"object"},executive_summary:{type:"string"},coverage_summary:{type:"string"},
    warnings:{type:"array",items:{type:"string"}}
   }}
  });
  const x=result.response||result;
  const vf=uniq(x.vulnerability_findings||[]), pf=uniq(x.pentest_findings||[]);
  const vc={critical:0,high:0,medium:0,low:0,informational:0};
  for(const f of vf){const s=sev(f.severity); if(s in vc)(vc as any)[s]++;}
  if(!vf.length)for(const k of Object.keys(vc))(vc as any)[k]=Number(x.vulnerability_counts?.[k]||0);
  const vDed={critical:25,high:15,medium:5,low:2,informational:0};
  const pDed={critical:30,high:18,medium:10,low:4,informational:0};
  const vItems=Object.entries(vc).map(([severity,count])=>({label:`${count} ${severity} vulnerabilities`,points:-Number(count)*(vDed as any)[severity]})).filter(i=>i.points);
  const pItems=pf.map((f:any)=>({label:`${f.title||"Pentest finding"} (${sev(f.severity)})`,points:-(pDed as any)[sev(f.severity)]||0,source:f.source_report}));
  const publicAdmin=pf.some((f:any)=>f.external_management_exposed===true);
  if(publicAdmin)pItems.push({label:"Publicly exposed remote administration",points:-12,source:"Validated control exposure"});
  const attacks=uniq(x.attack_evidence||[]).map((r:any)=>({...r,status:String(r.status).toLowerCase()==="successful"?"successful":"attempted"}));
  const successes=attacks.filter((r:any)=>r.status==="successful");
  const outcomeRules=[
   {match:/unauthorized|initial access|shell|foothold/i,label:"Unauthorized access achieved",points:-15},
   {match:/privilege|admin|root/i,label:"Privileged access achieved",points:-25},
   {match:/lateral/i,label:"Lateral movement achieved",points:-15},
   {match:/data access|exfil|sensitive/i,label:"Sensitive data accessed or exfiltrated",points:-20},
   {match:/persist/i,label:"Persistence established",points:-10}
  ];
  for(const r of outcomeRules)if(successes.some((a:any)=>r.match.test(String(a.name)+" "+String(a.evidence))))pItems.push({label:r.label,points:r.points,source:"Verified attack outcome"});
  const vulnerabilityScore=clamp(100+vItems.reduce((s,i)=>s+i.points,0));
  const pentestScore=clamp(100+pItems.reduce((s,i)=>s+i.points,0));
  const vAdj=Math.round(adjust(vulnerabilityScore,110,190)), pAdj=Math.round(adjust(pentestScore,90,160));
  const finalScore=Math.round(clamp(BASELINE+vAdj+pAdj,MIN,MAX));
  const dates=Object.values(x.assessment_dates||{}).map(validDate).filter(Boolean) as Date[];
  const oldest=dates.length?new Date(Math.min(...dates.map(d=>d.getTime()))):null;
  const ageDays=oldest?Math.floor((Date.now()-oldest.getTime())/86400000):null;
  const confidence=ageDays===null?"unknown":ageDays>365?"expired":ageDays>305?"expiring":"current";
  const current=confidence==="current"||confidence==="expiring";
  const orgId=user.role==="admin"&&b.organization_id?String(b.organization_id):String(user.organization_id||`individual:${user.id}`);
  const allItems=[...vItems.map(i=>({...i,category:"Vulnerability Assessment"})),...pItems.map(i=>({...i,category:"Penetration Test"}))];
  const primary=[...allItems].sort((a,b)=>a.points-b.points)[0]?.label||"No scored deductions";
  const record={organization_id:orgId,business_name:String(b.business_name).trim(),business_address:String(b.business_address).trim(),poc_name:String(b.poc_name).trim(),poc_email:String(b.poc_email||"").trim(),poc_phone:String(b.poc_phone||"").trim(),source_mode:"upload",status:"completed",report_files:files,assessment_dates:x.assessment_dates||{},vulnerability_counts:vc,vulnerability_findings:vf,pentest_findings:pf,attack_evidence:attacks,vulnerability_score:vulnerabilityScore,penetration_test_score:pentestScore,baseline_score:BASELINE,final_score:finalScore,rating_band:band(finalScore),score_change:finalScore-BASELINE,data_confidence:confidence,confidence_message:confidence==="expired"?`Expired: oldest scored report is ${ageDays} days old. A new scan is required.`:confidence==="unknown"?"Unknown: report dates could not be verified.":confidence==="expiring"?`Current but expires soon: oldest report is ${ageDays} days old.`:`Current: all scored reports are within one year (${ageDays} days).`,is_current_rating:current,scoring_breakdown:{vulnerability:{starting_score:100,items:vItems,final_score:vulnerabilityScore,rubric:vDed},penetration_test:{starting_score:100,items:pItems,final_score:pentestScore,rubric:pDed},rating:{baseline:BASELINE,vulnerability_adjustment:vAdj,penetration_test_adjustment:pAdj,formula:"650 + Vulnerability Assessment adjustment + Penetration Test adjustment"}},executive_summary:String(x.executive_summary||""),primary_deduction:primary,coverage_summary:String(x.coverage_summary||""),warnings:x.warnings||[],calculation_version:VERSION,analyzed_at:new Date().toISOString()};
  const created=await base44.asServiceRole.entities.CCIAssessment.create(record);
  if(current){
   const rows=await base44.asServiceRole.entities.CCISecurityRating.filter({organization_id:orgId});
   const rating={organization_id:orgId,organization_name:record.business_name,vulscan_score:vulnerabilityScore,vpentest_score:pentestScore,vulscan_source:"api",vpentest_source:"api",baseline_score:BASELINE,final_score:finalScore,rating_band:record.rating_band,score_change:record.score_change,factors:record.scoring_breakdown.rating,calculation_version:VERSION,calculated_at:record.analyzed_at,external_references:{cci_assessment_id:created.id,source_mode:"upload"}};
   if(rows[0])await base44.asServiceRole.entities.CCISecurityRating.update(rows[0].id,rating);else await base44.asServiceRole.entities.CCISecurityRating.create(rating);
  }
  return Response.json({success:true,assessment:{id:created.id,...record}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:500});}
});