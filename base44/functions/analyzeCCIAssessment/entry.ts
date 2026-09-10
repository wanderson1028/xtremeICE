import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

const BASELINE=650, MIN=300, MAX=850, VERSION="CFRS-ASSESS-2026.8";
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
  const apiImport=user.role==="admin"&&b.api_import?.provider==="vpentest"?b.api_import:null;
  for(const k of ["business_name","business_address","poc_name"])if(!String(b[k]||"").trim())return Response.json({error:`${k.replaceAll("_"," ")} is required`},{status:400});
  const reportFiles=(b.report_files||[]).filter((f:any)=>f?.file_url);
  const evidenceFiles=(b.evidence_files||[]).filter((f:any)=>f?.file_url).map((f:any)=>({...f,category:"evidence"}));
  const files=[...reportFiles,...evidenceFiles];
  if(!reportFiles.length&&!apiImport)return Response.json({error:"Upload at least one assessment report, or import a vPenTest assessment"},{status:400});
  const allowed=/\.(pdf|doc|docx|xls|xlsx|csv|txt|json|log|xml)$/i;
  if(files.some((f:any)=>!allowed.test(String(f.name||""))))return Response.json({error:"Supported formats are PDF, Word, Excel, CSV, TXT, JSON, LOG, and XML"},{status:400});
  const orgId=user.role==="admin"&&b.organization_id?String(b.organization_id):String(user.organization_id||`individual:${user.id}`);
  let revisionOf:any=null;
  if(b.revision_of_id){
   const matches=await base44.asServiceRole.entities.CCIAssessment.filter({id:String(b.revision_of_id)});
   revisionOf=matches[0];
   if(!revisionOf||String(revisionOf.organization_id)!==orgId)return Response.json({error:"The selected assessment cannot be revised for this organization"},{status:403});
  }
  const reportFingerprint=apiImport?`vpentest:${apiImport.company_id}:${apiImport.assessment_id}`:files.map((f:any)=>`${f.category}:${f.name}:${f.size||0}:${f.last_modified||0}`).sort().join("|");
  const extractionTargets=apiImport?files:(revisionOf?files.filter((f:any)=>f.new_upload===true):files);
  if(revisionOf&&!extractionTargets.length&&!apiImport)return Response.json({error:"No new evidence or replacement report was provided"},{status:400});
  const prior=await base44.asServiceRole.entities.CCIAssessment.filter({organization_id:orgId,report_fingerprint:reportFingerprint,calculation_version:VERSION,status:"completed"});
  if(prior[0])return Response.json({success:true,assessment:prior[0],reused:true});
  const importedFindings=(apiImport?.findings||[]).filter((f:any)=>f?.title);
  const extracted:any[]=apiImport?[{category:"technical_report",name:`vPenTest · ${apiImport.assessment_name||apiImport.assessment_id}`,report_date:apiImport.assessment_date||"",vulnerability_findings:[],pentest_findings:importedFindings,attack_evidence:importedFindings.filter((f:any)=>f.mitre_technique_id||f.status).map((f:any)=>({name:f.title,status:/success|exploited|confirmed/i.test(String(f.status||""))?"successful":"attempted",evidence:f.evidence||"Imported vPenTest finding",affected_asset:f.asset||"",mitre_technique_id:f.mitre_technique_id||"",mitre_technique_name:f.mitre_technique_name||"",mitre_tactic:f.mitre_tactic||""})),warnings:apiImport.warnings||[]}]:[];
  for(const file of extractionTargets){
   const category=String(file.category||"report");
   const isActivity=category==="activity_report";
   const isVulnerability=category==="vulnerability_report";
   const isEvidence=category==="evidence";
   const result=await base44.integrations.Core.ExtractDataFromUploadedFile({
    file_url:file.file_url,
    json_schema:{type:"object",properties:{
     report_date:{type:"string",description:"Engagement, scan, assessment, or report date in YYYY-MM-DD format. Search the entire document."},
     vulnerability_findings:{type:"array",description:isVulnerability?"Every unique vulnerability finding in this scanner report. Do not omit medium findings.":"Only explicit vulnerability findings; do not duplicate summary prose.",items:{type:"object",properties:{
      id:{type:"string"},title:{type:"string"},severity:{type:"string"},asset:{type:"string"},evidence:{type:"string"}
     },required:["title","severity"]}},
     pentest_findings:{type:"array",description:category==="technical_report"?"Every unique penetration-test finding. This report is authoritative.":"Only explicit penetration-test findings not merely repeated summary language.",items:{type:"object",properties:{
      id:{type:"string"},title:{type:"string"},severity:{type:"string"},asset:{type:"string"},evidence:{type:"string"},external_management_exposed:{type:"boolean",description:"True only if Internet-accessible remote administration is documented"}
     },required:["title","severity"]}},
     attack_evidence:{type:"array",description:isActivity?"Every security test or attack performed, including discovery, scanning, enumeration, vulnerability import and exploit attempts. A launched/completed module is attempted, not successful. Include MITRE ATT&CK tactic and technique mapping where supported by the described action.":isEvidence?"Extract each explicit test event or observed security outcome from this supporting evidence. Mark successful only when the artifact directly proves access, execution, credential compromise, privilege gain, lateral movement, persistence, data access/exfiltration, or control bypass. Never reproduce passwords, tokens, keys, hashes, patient data, or other sensitive values.":"Attack activity explicitly documented in this report. Never infer success.",items:{type:"object",properties:{
      name:{type:"string",description:"Plain-language attack or test name"},attack_correlation_type:{type:"string",description:"Attack family or correlated behavior, such as Ransomware, Spearphishing, Credential Attack, Web Application Attack, Network Reconnaissance, Vulnerability Discovery, Exploitation, Privilege Escalation, Lateral Movement, Data Exfiltration, Persistence, Command and Control, Denial of Service, Malware Execution, Cloud Attack, or Wireless Attack"},attack_vector:{type:"string",description:"How the activity reaches or tests the target, for example Network, Web Application, Authentication, Email, Endpoint, Wireless, Cloud, Supply Chain, Physical, or Discovery/Reconnaissance"},mitre_technique_id:{type:"string",description:"MITRE ATT&CK technique ID such as T1046; blank only when no defensible mapping exists"},mitre_technique_name:{type:"string"},mitre_tactic:{type:"string"},status:{type:"string",enum:["attempted","successful"],description:"Successful only when evidence proves exploitation, unauthorized access, execution, credential compromise, privilege gain, lateral movement, persistence, data access/exfiltration, or control bypass. Scanning, enumeration, discovery, module launch/completion, and vulnerability findings remain attempted."},affected_asset:{type:"string",description:"Company system, host, account, application, or data affected"},outcome:{type:"string",description:"What the test demonstrably achieved; do not infer success"},business_relevance:{type:"string",description:"Brief company-specific security or operational significance grounded in the report"},evidence:{type:"string"}
     },required:["name","status","evidence"]}},
     summary:{type:"string"},warnings:{type:"array",items:{type:"string"}}
    }}
   });
   if(result.status==="success"&&result.output)extracted.push({category,name:file.name,...result.output});
  }
  const extractedFileCount=extracted.length-(apiImport?1:0);
  if(extractedFileCount!==extractionTargets.length)return Response.json({error:`Only ${extractedFileCount} of ${extractionTargets.length} selected report file(s) could be extracted. No score was issued because partial evidence could create an inaccurate rating. Verify the vPenTest report is complete and try again.`},{status:422});
  const previousV=revisionOf?.vulnerability_findings||[], previousP=revisionOf?.pentest_findings||[], previousAttacks=revisionOf?.attack_evidence||[];
  const rawV=[...previousV,...extracted.flatMap(d=>(d.vulnerability_findings||[]).map((f:any)=>({...f,source_report:d.name})))].filter((f:any)=>f.title&&f.severity);
  const newP=extracted.filter(d=>d.category==="technical_report").flatMap(d=>(d.pentest_findings||[]).map((f:any)=>({...f,source_report:d.name}))).filter((f:any)=>f.title&&f.severity);
  const fallbackNewP=extracted.flatMap(d=>(d.pentest_findings||[]).map((f:any)=>({...f,source_report:d.name}))).filter((f:any)=>f.title&&f.severity);
  const rawP=[...previousP,...(newP.length?newP:fallbackNewP)];
  const vf=uniq(rawV), pf=uniq(rawP);
  const attackRows=[...previousAttacks,...extracted.flatMap(d=>(d.attack_evidence||[]).map((q:any)=>({...q,source_report:d.name})))].filter((q:any)=>q.name&&q.evidence);
  const assessment_dates:any={...(revisionOf?.assessment_dates||{})};
  for(const d of extracted)if(d.report_date){
   if(d.category==="vulnerability_report")assessment_dates.vulnerability_assessment=d.report_date;
   else if(!assessment_dates.penetration_test)assessment_dates.penetration_test=d.report_date;
  }
  const x:any={
   vulnerability_findings:vf,pentest_findings:pf,attack_evidence:attackRows,assessment_dates,
   executive_summary:`Assessment Intelligence identified ${vf.length} vulnerability finding(s), ${pf.length} penetration-test finding(s), and ${attackRows.length} documented attack activity record(s).`,
   coverage_summary:`${reportFiles.length} assessment report(s) and ${evidenceFiles.length} supporting evidence file(s) are included; ${extractionTargets.length} newly submitted file(s) were analyzed in this run.`,
   warnings:extracted.flatMap(d=>d.warnings||[])
  };
  if(!vf.length&&!pf.length&&!attackRows.length)return Response.json({error:"The reports were readable, but no findings or attack activity could be extracted. No score was issued; review the report contents or upload text-searchable versions."},{status:422});
  const vc={critical:0,high:0,medium:0,low:0,informational:0};
  for(const f of vf){const s=sev(f.severity); if(s in vc)(vc as any)[s]++;}
  if(!vf.length)for(const k of Object.keys(vc))(vc as any)[k]=Number(x.vulnerability_counts?.[k]||0);
  const vDed={critical:25,high:15,medium:5,low:2,informational:0};
  const pDed={critical:30,high:18,medium:10,low:4,informational:0};
  const vItems=Object.entries(vc).map(([severity,count])=>({label:`${count} ${severity} vulnerabilities`,points:-Number(count)*(vDed as any)[severity]})).filter(i=>i.points);
  const pItems=pf.map((f:any)=>({label:`${f.title||"Pentest finding"} (${sev(f.severity)})`,points:-(pDed as any)[sev(f.severity)]||0,source:f.source_report}));
  const publicAdmin=pf.some((f:any)=>f.external_management_exposed===true);
  if(publicAdmin)pItems.push({label:"Publicly exposed remote administration",points:-12,source:"Validated control exposure"});
  const correlate=(r:any)=>{const s=`${r.name||""} ${r.mitre_technique_name||""} ${r.evidence||""}`.toLowerCase();if(/ransom|encrypt.*impact/.test(s))return"Ransomware";if(/spear.?phish|phish/.test(s))return"Spearphishing";if(/password|credential|brute.?force|spray/.test(s))return"Credential Attack";if(/sql injection|cross.?site|xss|web application/.test(s))return"Web Application Attack";if(/privilege|elevat/.test(s))return"Privilege Escalation";if(/lateral/.test(s))return"Lateral Movement";if(/exfil|data theft/.test(s))return"Data Exfiltration";if(/persist/.test(s))return"Persistence";if(/command and control|c2|c&c/.test(s))return"Command and Control";if(/denial|ddos|dos attack/.test(s))return"Denial of Service";if(/malware|payload|shellcode/.test(s))return"Malware Execution";if(/exploit/.test(s))return"Exploitation";if(/vulnerab/.test(s))return"Vulnerability Discovery";if(/scan|discover|enumerat|nmap|traceroute|dns|whois/.test(s))return"Network Reconnaissance";if(/cloud/.test(s))return"Cloud Attack";if(/wireless|wifi|wi-fi/.test(s))return"Wireless Attack";return"Security Testing";};
  const attacks=uniq(x.attack_evidence||[]).map((r:any)=>{const text=`${r.name||""} ${r.outcome||""} ${r.evidence||""}`;const discovery=/scan|discover|enumerat|recon|nmap|traceroute|dns|whois|vulnerabilit/i.test(text);const compromise=/unauthorized access|access gained|shell obtained|compromised|credential.*captured|privilege.*(gained|escalat)|lateral movement.*(achieved|successful)|exfiltrat|code execution|control bypass|exploit.*successful/i.test(text);return{...r,attack_correlation_type:r.attack_correlation_type||correlate(r),status:String(r.status).toLowerCase()==="successful"&&(!discovery||compromise)?"successful":"attempted"};});
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
  const currentAssessmentScore=Math.round(clamp(BASELINE+vAdj+pAdj,MIN,MAX));
  const priorHistory=(await base44.asServiceRole.entities.CCIAssessment.filter({organization_id:orgId})).filter((row:any)=>row.status==="completed").sort((a:any,b:any)=>new Date(b.analyzed_at||b.created_date||0).getTime()-new Date(a.analyzed_at||a.created_date||0).getTime()).slice(0,7);
  const historySamples=[{score:currentAssessmentScore,date:new Date(),label:"Current assessment"},...priorHistory.map((row:any)=>({score:Number(row.scoring_breakdown?.rating?.current_assessment_score??row.final_score??BASELINE),date:new Date(row.analyzed_at||row.created_date||0),label:row.report_fingerprint||row.id}))].filter((sample:any)=>Number.isFinite(sample.score)&&!Number.isNaN(sample.date.getTime())&&(Date.now()-sample.date.getTime())<=730*86400000);
  const weightedSamples=historySamples.map((sample:any,index:number)=>({...sample,weight:index===0?1:Math.pow(.65,index)*Math.exp(-Math.max(0,Date.now()-sample.date.getTime())/(365*86400000))}));
  const weightTotal=weightedSamples.reduce((sum:number,sample:any)=>sum+sample.weight,0)||1;
  const weightedBase=weightedSamples.reduce((sum:number,sample:any)=>sum+sample.score*sample.weight,0)/weightTotal;
  const priorSamples=weightedSamples.slice(1),priorWeight=priorSamples.reduce((sum:number,sample:any)=>sum+sample.weight,0);
  const priorAverage=priorWeight?priorSamples.reduce((sum:number,sample:any)=>sum+sample.score*sample.weight,0)/priorWeight:currentAssessmentScore;
  const trendAdjustment=priorSamples.length?Math.round(clamp((currentAssessmentScore-priorAverage)*.15,-20,20)):0;
  const finalScore=Math.round(clamp(weightedBase+trendAdjustment,MIN,MAX));
  const dates=Object.values(x.assessment_dates||{}).map(validDate).filter(Boolean) as Date[];
  const oldest=dates.length?new Date(Math.min(...dates.map(d=>d.getTime()))):null;
  const ageDays=oldest?Math.floor((Date.now()-oldest.getTime())/86400000):null;
  const confidence=ageDays===null?"unknown":ageDays>365?"expired":ageDays>305?"expiring":"current";
  const current=confidence==="current"||confidence==="expiring";
  const allItems=[...vItems.map(i=>({...i,category:"Vulnerability Assessment"})),...pItems.map(i=>({...i,category:"Penetration Test"}))];
  const primary=[...allItems].sort((a,b)=>a.points-b.points)[0]?.label||"No scored deductions";
  const storedReportFiles=reportFiles.map(({new_upload,...f}:any)=>f), storedEvidenceFiles=evidenceFiles.map(({new_upload,...f}:any)=>f);
  const record={organization_id:orgId,business_name:String(b.business_name).trim(),business_address:String(b.business_address).trim(),poc_name:String(b.poc_name).trim(),poc_email:String(b.poc_email||"").trim(),poc_phone:String(b.poc_phone||"").trim(),source_mode:apiImport?"api":"upload",status:"completed",report_fingerprint:reportFingerprint,report_files:storedReportFiles,evidence_files:storedEvidenceFiles,evidence_count:storedEvidenceFiles.length,revision_of_id:revisionOf?.id||"",revision_number:revisionOf?Number(revisionOf.revision_number||1)+1:1,assessment_dates:x.assessment_dates||{},vulnerability_counts:vc,vulnerability_findings:vf,pentest_findings:pf,attack_evidence:attacks,vulnerability_score:vulnerabilityScore,penetration_test_score:pentestScore,baseline_score:BASELINE,final_score:finalScore,rating_band:band(finalScore),score_change:finalScore-BASELINE,data_confidence:confidence,confidence_message:confidence==="expired"?`Expired: oldest scored report is ${ageDays} days old. A new scan is required.`:confidence==="unknown"?"Unknown: report dates could not be verified.":confidence==="expiring"?`Current but expires soon: oldest report is ${ageDays} days old.`:`Current: all scored reports are within one year (${ageDays} days).`,is_current_rating:current,scoring_breakdown:{vulnerability:{starting_score:100,items:vItems,final_score:vulnerabilityScore,rubric:vDed},penetration_test:{starting_score:100,items:pItems,final_score:pentestScore,rubric:pDed},rating:{baseline:BASELINE,vulnerability_adjustment:vAdj,penetration_test_adjustment:pAdj,current_assessment_score:currentAssessmentScore,history_weighted_base:Math.round(weightedBase),trend_adjustment:trendAdjustment,assessment_count:weightedSamples.length,history_weights:weightedSamples.map((sample:any)=>({label:sample.label,score:sample.score,weight:Number(sample.weight.toFixed(3)),date:sample.date.toISOString()})),formula:"Recency-weighted assessment history + bounded trend adjustment"}},executive_summary:String(x.executive_summary||""),primary_deduction:primary,coverage_summary:String(x.coverage_summary||""),warnings:x.warnings||[],calculation_version:VERSION,analyzed_at:new Date().toISOString()};
  const created=await base44.asServiceRole.entities.CCIAssessment.create(record);
  if(current){
   const rows=await base44.asServiceRole.entities.CCISecurityRating.filter({organization_id:orgId});
   const rating={organization_id:orgId,organization_name:record.business_name,vulscan_score:vulnerabilityScore,vpentest_score:pentestScore,vulscan_source:"api",vpentest_source:"api",baseline_score:BASELINE,final_score:finalScore,rating_band:record.rating_band,score_change:record.score_change,factors:record.scoring_breakdown.rating,calculation_version:VERSION,calculated_at:record.analyzed_at,external_references:{cci_assessment_id:created.id,source_mode:apiImport?"api":"upload",vpentest_company_id:apiImport?.company_id||"",vpentest_assessment_id:apiImport?.assessment_id||""}};
   if(rows[0])await base44.asServiceRole.entities.CCISecurityRating.update(rows[0].id,rating);else await base44.asServiceRole.entities.CCISecurityRating.create(rating);
  }
  return Response.json({success:true,assessment:{id:created.id,...record}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:500});}
});