import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

const BASELINE=600, MIN=-500, MAX=1000, VERSION="CFRS-ASSESS-2026.11";
const clamp=(n:number,a=0,b=100)=>Math.min(b,Math.max(a,n));
const sev=(s:unknown)=>String(s||"informational").toLowerCase();
const band=(n:number)=>n>=900?"Exceptional":n>=750?"Strong":n>=600?"Good":n>=450?"Fair":n>=250?"Poor":n>=1?"Critical":n>=-249?"Distressed":"Extreme Risk";
const postureAdjustment=(score:number,positive:number,negative:number)=>score>=70?((score-70)/30)*positive:-((70-score)/70)*negative;
const normalizedFindingKey=(f:any)=>String(f.id||f.title||f.name||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const validDate=(v:unknown)=>{const d=new Date(String(v||""));return Number.isNaN(d.getTime())?null:d;};
const evidenceDate=(row:any)=>{const direct=validDate(row?.source_assessment_date);if(direct)return direct;const dates=Object.values(row?.assessment_dates||{}).map(validDate).filter(Boolean) as Date[];return dates.length?new Date(Math.max(...dates.map(d=>d.getTime()))):validDate(row?.analyzed_at||row?.created_date)||new Date(0);};
const uniq=(rows:any[])=>Array.from(new Map((rows||[]).map((r:any)=>[String(r.id||r.title||r.name||JSON.stringify(r)).toLowerCase(),r])).values());

Deno.serve(async(req)=>{
 try{
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user)return Response.json({error:"Unauthorized"},{status:401});
  const b=await req.json();
  const apiImport=user.role==="admin"&&b.api_import?.provider==="vpentest"?b.api_import:null;
  const backgroundFinalize=user.role==="admin"&&b.background_finalize===true&&Boolean(b.revision_of_id);
  if(!String(b.business_name||"").trim())return Response.json({error:"Business name is required"},{status:400});
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
  const reportFingerprint=backgroundFinalize&&revisionOf?revisionOf.report_fingerprint:(apiImport?`vpentest:${apiImport.company_id}:${apiImport.assessment_id}`:files.map((f:any)=>`${f.category}:${f.name}:${f.size||0}:${f.last_modified||0}`).sort().join("|"));
  // vPenTest API imports already contain normalized findings and activities. Keep report URLs for audit/drill-down, but do not re-download and AI-extract the same PDFs during the request.
  const extractionTargets=apiImport?[]:(revisionOf?files.filter((f:any)=>f.new_upload===true):files);
  if(revisionOf&&!extractionTargets.length&&!apiImport&&!backgroundFinalize)return Response.json({error:"No new evidence or replacement report was provided"},{status:400});
  const prior=await base44.asServiceRole.entities.CCIAssessment.filter({organization_id:orgId,report_fingerprint:reportFingerprint,calculation_version:VERSION,status:"completed"});
  if(prior[0]&&!backgroundFinalize)return Response.json({success:true,assessment:prior[0],reused:true});
  const importedFindings=(apiImport?.findings||[]).filter((f:any)=>f?.title);
  const isVulScan=(f:any)=>/vulscan|vulnerability\s*(assessment|scan)|scanner/i.test(`${f.source||""} ${f.assessment_type||""} ${f.category||""}`);
  const importedVulnerabilities=importedFindings.filter(isVulScan), importedPentestFindings=importedFindings.filter((f:any)=>!isVulScan(f));
  const importedActivities=(apiImport?.activities||[]).filter((a:any)=>a?.name&&a?.evidence);
  const findingActivities=importedFindings.filter((f:any)=>f.mitre_technique_id||f.status).map((f:any)=>({name:f.title,status:/success|exploited|confirmed/i.test(String(f.status||""))?"successful":"attempted",evidence:f.evidence||"Imported vPenTest finding",affected_asset:f.asset||"",mitre_technique_id:f.mitre_technique_id||"",mitre_technique_name:f.mitre_technique_name||"",mitre_tactic:f.mitre_tactic||""}));
  const extracted:any[]=[...(apiImport?[{category:"technical_report",name:`vPenTest · ${apiImport.assessment_name||apiImport.assessment_id}`,report_date:apiImport.assessment_date||"",vulnerability_findings:importedVulnerabilities,pentest_findings:importedPentestFindings,attack_evidence:[...importedActivities,...findingActivities],warnings:apiImport.warnings||[]}]:[]),...(backgroundFinalize&&Array.isArray(b.pre_extracted)?b.pre_extracted:[])];
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
  const extractedFileCount=extracted.length-(apiImport?1:0)-(backgroundFinalize&&Array.isArray(b.pre_extracted)?b.pre_extracted.length:0);
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
   coverage_summary:apiImport?`${reportFiles.length} source report link(s) retained for audit and drill-down; scoring used ${importedFindings.length} structured finding(s) and ${importedActivities.length} structured activity record(s) from the vPenTest API.`:`${reportFiles.length} assessment report(s) and ${evidenceFiles.length} supporting evidence file(s) are included; ${extractionTargets.length} newly submitted file(s) were analyzed in this run.`,
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
   {match:/unauthorized|initial access|shell|foothold/i,label:"Unauthorized access achieved",points:75},
   {match:/privilege|admin|root/i,label:"Privileged access achieved",points:110},
   {match:/lateral/i,label:"Lateral movement achieved",points:80},
   {match:/data access|exfil|sensitive/i,label:"Sensitive data accessed or exfiltrated",points:120},
   {match:/persist/i,label:"Persistence established",points:60},
   {match:/ransom|encrypt.*impact/i,label:"Ransomware impact demonstrated",points:150}
  ];
  const outcomeItems=outcomeRules.filter(rule=>successes.some((a:any)=>rule.match.test(`${a.name||""} ${a.outcome||""} ${a.evidence||""}`))).map(rule=>({label:rule.label,points:-rule.points,category:"Validated Attack Outcome"}));
  const validatedAttackPenalty=Math.min(400,outcomeItems.reduce((sum,item)=>sum+Math.abs(item.points),0));
  const vulnerabilityScore=clamp(100+vItems.reduce((s,i)=>s+i.points,0));
  const pentestScore=clamp(100+pItems.reduce((s,i)=>s+i.points,0));
  const allOrganizationRows=(await base44.asServiceRole.entities.CCIAssessment.filter({organization_id:orgId})).filter((row:any)=>row.status==="completed"&&row.report_fingerprint!==reportFingerprint);
  const priorFindingKeys=new Set(allOrganizationRows.flatMap((row:any)=>[...(row.vulnerability_findings||[]),...(row.pentest_findings||[])].map(normalizedFindingKey).filter(Boolean)));
  const repeatItems=[...vf,...pf].filter((f:any)=>priorFindingKeys.has(normalizedFindingKey(f))).map((f:any)=>({label:`Repeated unresolved finding: ${f.title||f.name}`,points:-(sev(f.severity)==="critical"?20:sev(f.severity)==="high"?10:sev(f.severity)==="medium"?5:0),category:"Repeat Finding"})).filter((item:any)=>item.points<0);
  const repeatFindingPenalty=Math.min(150,repeatItems.reduce((sum,item)=>sum+Math.abs(item.points),0));
  const concentratedExposureCount=[...vf,...pf].filter((f:any)=>["critical","high"].includes(sev(f.severity))).length+successes.length;
  const exposureConcentrationPenalty=concentratedExposureCount>=8?100:concentratedExposureCount>=5?60:concentratedExposureCount>=3?30:0;
  const explicitlyResolved=[...vf,...pf].filter((f:any)=>/resolved|remediated|closed|fixed/i.test(String(f.status||""))).length;
  const remediationAdjustment=explicitlyResolved?Math.round(clamp(explicitlyResolved/Math.max(1,vf.length+pf.length),0,1)*150):0;
  const vAdj=Math.round(postureAdjustment(vulnerabilityScore,150,300)), pAdj=Math.round(postureAdjustment(pentestScore,200,350));
  const currentAssessmentScore=Math.round(clamp(BASELINE+vAdj+pAdj+remediationAdjustment-validatedAttackPenalty-repeatFindingPenalty-exposureConcentrationPenalty,MIN,MAX));
  const priorRows=allOrganizationRows.filter((row:any)=>row.calculation_version===VERSION).sort((a:any,b:any)=>evidenceDate(b).getTime()-evidenceDate(a).getTime());
  const priorHistory=Array.from(new Map(priorRows.map((row:any)=>[row.report_fingerprint||row.id,row])).values());
  const currentEvidenceDate=validDate(apiImport?.assessment_date)||evidenceDate({assessment_dates:x.assessment_dates,analyzed_at:new Date().toISOString()});
  const historySamples=[{score:currentAssessmentScore,date:currentEvidenceDate,label:"Current assessment"},...priorHistory.map((row:any)=>({score:Number(row.scoring_breakdown?.rating?.current_assessment_score??row.final_score??BASELINE),date:evidenceDate(row),label:row.report_fingerprint||row.id}))].filter((sample:any)=>Number.isFinite(sample.score)&&!Number.isNaN(sample.date.getTime())).sort((a:any,b:any)=>b.date.getTime()-a.date.getTime());
  const weightedSamples=historySamples.map((sample:any,index:number)=>({...sample,weight:index===0?1:Math.pow(.65,index)*Math.exp(-Math.max(0,Date.now()-sample.date.getTime())/(365*86400000))}));
  const weightTotal=weightedSamples.reduce((sum:number,sample:any)=>sum+sample.weight,0)||1;
  const weightedBase=weightedSamples.reduce((sum:number,sample:any)=>sum+sample.score*sample.weight,0)/weightTotal;
  const latestScore=weightedSamples[0]?.score??currentAssessmentScore;
  const priorSamples=weightedSamples.slice(1),priorWeight=priorSamples.reduce((sum:number,sample:any)=>sum+sample.weight,0);
  const priorAverage=priorWeight?priorSamples.reduce((sum:number,sample:any)=>sum+sample.score*sample.weight,0)/priorWeight:latestScore;
  const trendAdjustment=priorSamples.length?Math.round(clamp((latestScore-priorAverage)*.25,-100,100)):0;
  const finalScore=Math.round(clamp(weightedBase+trendAdjustment,MIN,MAX));
  const dates=Object.values(x.assessment_dates||{}).map(validDate).filter(Boolean) as Date[];
  const oldest=dates.length?new Date(Math.min(...dates.map(d=>d.getTime()))):null;
  const ageDays=oldest?Math.floor((Date.now()-oldest.getTime())/86400000):null;
  const confidence=ageDays===null?"unknown":"current";
  const current=!priorHistory.length||currentEvidenceDate.getTime()>=evidenceDate(priorHistory[0]).getTime();
  const factorItems=[...outcomeItems,...repeatItems,...(exposureConcentrationPenalty?[{label:`Concentrated high-risk exposure (${concentratedExposureCount} factors)`,points:-exposureConcentrationPenalty,category:"Exposure Concentration"}]:[]),...(remediationAdjustment?[{label:"Verified remediation credit",points:remediationAdjustment,category:"Remediation"}]:[])];
  const allItems=[...vItems.map(i=>({...i,category:"Vulnerability Assessment"})),...pItems.map(i=>({...i,category:"Penetration Test"})),...factorItems];
  const primary=[...allItems].sort((a,b)=>a.points-b.points)[0]?.label||"No scored deductions";
  const storedReportFiles=reportFiles.map(({new_upload,...f}:any)=>f), storedEvidenceFiles=evidenceFiles.map(({new_upload,...f}:any)=>f);
  const record={organization_id:orgId,source_assessment_date:currentEvidenceDate.toISOString(),business_name:String(b.business_name).trim(),business_address:String(b.business_address||"").trim(),poc_name:String(b.poc_name||"").trim(),poc_email:String(b.poc_email||"").trim(),poc_phone:String(b.poc_phone||"").trim(),source_mode:apiImport?"api":(revisionOf?.source_mode||"upload"),status:"completed",evidence_analysis_status:backgroundFinalize?"completed":(apiImport&&reportFiles.length?"queued":"not_required"),evidence_analysis_progress:backgroundFinalize?100:(apiImport&&reportFiles.length?0:100),evidence_analysis_message:backgroundFinalize?`Full evidence analysis completed across ${b.pre_extracted?.length||0} document(s).`:(apiImport&&reportFiles.length?"Structured API score issued; full document analysis queued.":"Assessment evidence analysis completed."),report_fingerprint:reportFingerprint,report_files:storedReportFiles,evidence_files:storedEvidenceFiles,evidence_count:storedEvidenceFiles.length,revision_of_id:revisionOf?.id||"",revision_number:revisionOf?Number(revisionOf.revision_number||1)+1:1,assessment_dates:x.assessment_dates||{},vulnerability_counts:vc,vulnerability_findings:vf,pentest_findings:pf,attack_evidence:attacks,vulnerability_score:vulnerabilityScore,penetration_test_score:pentestScore,baseline_score:BASELINE,final_score:finalScore,rating_band:band(finalScore),score_change:finalScore-BASELINE,data_confidence:confidence,confidence_message:confidence==="unknown"?"Report dates could not be verified; the result remains in history with reduced recency weight.":`Historical evidence retained: the oldest scored report is ${ageDays} days old and remains part of the recency-weighted CFRS history.`,is_current_rating:current,scoring_breakdown:{vulnerability:{starting_score:100,items:vItems,final_score:vulnerabilityScore,rubric:vDed},penetration_test:{starting_score:100,items:pItems,final_score:pentestScore,rubric:pDed},rating:{baseline:BASELINE,scale_min:MIN,scale_max:MAX,vulnerability_adjustment:vAdj,penetration_test_adjustment:pAdj,remediation_adjustment:remediationAdjustment,validated_attack_penalty:validatedAttackPenalty,repeat_finding_penalty:repeatFindingPenalty,exposure_concentration_penalty:exposureConcentrationPenalty,current_assessment_score:currentAssessmentScore,history_weighted_base:Math.round(weightedBase),trend_adjustment:trendAdjustment,assessment_count:weightedSamples.length,history_weights:weightedSamples.map((sample:any)=>({label:sample.label,score:sample.score,weight:Number(sample.weight.toFixed(3)),date:sample.date.toISOString()})),formula:"600 baseline + posture and remediation adjustments - validated attack, repeat finding, and concentration penalties; then recency-weighted history + bounded trend"}},executive_summary:String(x.executive_summary||""),primary_deduction:primary,coverage_summary:String(x.coverage_summary||""),warnings:x.warnings||[],calculation_version:VERSION,analyzed_at:new Date().toISOString()};
  const created=backgroundFinalize&&revisionOf?await base44.asServiceRole.entities.CCIAssessment.update(revisionOf.id,{...record,revision_of_id:revisionOf.revision_of_id||"",revision_number:revisionOf.revision_number||1}):await base44.asServiceRole.entities.CCIAssessment.create(record);
  if(current){
   const rows=await base44.asServiceRole.entities.CCISecurityRating.filter({organization_id:orgId});
   const rating={organization_id:orgId,organization_name:record.business_name,vulscan_score:vulnerabilityScore,vpentest_score:pentestScore,vulscan_source:"api",vpentest_source:"api",baseline_score:BASELINE,final_score:finalScore,rating_band:record.rating_band,score_change:record.score_change,factors:record.scoring_breakdown.rating,calculation_version:VERSION,calculated_at:record.analyzed_at,external_references:{cci_assessment_id:created.id,source_mode:apiImport?"api":"upload",vpentest_company_id:apiImport?.company_id||"",vpentest_assessment_id:apiImport?.assessment_id||""}};
   if(rows[0])await base44.asServiceRole.entities.CCISecurityRating.update(rows[0].id,rating);else await base44.asServiceRole.entities.CCISecurityRating.create(rating);
  }
  return Response.json({success:true,assessment:{id:created.id,...record}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:500});}
});