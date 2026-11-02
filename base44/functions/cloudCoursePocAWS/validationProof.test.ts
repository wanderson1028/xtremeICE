import { CHECKS, digest, readProbe, validationTasks, validValidationTasks, validationUserData } from "./validationProof.ts";
const run = "0123456789abcdef01234567", nonce = "0123456789abcdef0123456789abcdef";
function eq(a: unknown,b: unknown) { if (a !== b) throw new Error(`Expected ${b}, received ${a}`); }
Deno.test("accepts correlated pass and fail but ignores wrong run and nonce", async () => {
 const hash = await digest(nonce);
 const text = `boot\nDSV1:${run}:${nonce}:present_file:pass\nDSV1:${run}:${nonce}:missing_file:fail\n`;
 eq(await readProbe(text,run,hash,"present_file"),true);
 eq(await readProbe(text,run,hash,"missing_file"),false);
 eq(await readProbe(text,run,await digest("wrong"),"present_file"),null);
 eq(await readProbe(text,"ffffffffffffffffffffffff",hash,"present_file"),null);
});
Deno.test("rejects conflicting, truncated, unknown, and oversized evidence", async () => {
 const hash = await digest(nonce), line = `DSV1:${run}:${nonce}:present_file:pass`;
 eq(await readProbe(line+"\n"+line,run,hash,"present_file"),true);
 eq(await readProbe(line+"\n"+line.replace(":pass",":fail"),run,hash,"present_file"),null);
 eq(await readProbe(line.slice(0,-1),run,hash,"present_file"),null);
 eq(await readProbe(line,run,hash,"other"),null);
 eq(await readProbe("x".repeat(2_000_001),run,hash,"present_file"),null);
});
Deno.test("generated bash produces real passing and failing file evidence", async () => {
 const folder = await Deno.makeTempDir({dir:"/tmp",prefix:"aws-validation-test-"});
 try {
   const output = folder+"/console.log";
   const script = validationUserData(run,nonce).replaceAll("/var/tmp/design-studio-poc",folder+"/fixture")
     .replace("shutdown -h +105",":").replaceAll("> /dev/console",">> "+output);
   const result = await new Deno.Command("bash",{args:["-c",script],stdout:"piped",stderr:"piped"}).output();
   eq(result.code,0);
   const text = await Deno.readTextFile(output), hash = await digest(nonce);
   eq(await readProbe(text,run,hash,"present_file"),true);
   eq(await readProbe(text,run,hash,"missing_file"),false);
 } finally { await Deno.remove(folder,{recursive:true}); }
});
Deno.test("only the exact fixed task set can compile", () => {
 const template: any = {lab_content:{tasks:validationTasks()}};
 eq(validValidationTasks(template),true);
 template.lab_content.tasks[0].validation_criteria[0].runtime_validator.path="/etc/shadow";
 eq(validValidationTasks(template),false);
 let rejected = false; try { validationUserData("bad;echo injected",nonce); } catch { rejected=true; } eq(rejected,true);
 for(const c of CHECKS) eq(validationUserData(run,nonce).includes(c.path),true);
});
