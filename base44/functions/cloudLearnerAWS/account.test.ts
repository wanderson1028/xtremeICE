import bootstrap from "../../../docs/aws-learner-access-bootstrap.json" with {type:"json"};
import { ACCOUNT, requireAccount } from "./model.ts";
import { EXECUTION_ROLE_ARN } from "./accessConfig.ts";
function check(value:unknown){if(!value)throw new Error("Learner account isolation assertion failed");}
Deno.test("bootstrap and runtime target the user-owned account and a separate app identity",()=>{
 check(ACCOUNT==="935838375949");
 requireAccount(ACCOUNT);
 let mismatch=false;try{requireAccount("699121763776");}catch(e:any){mismatch=e.name==="AWS_ACCOUNT_MISMATCH";}check(mismatch);
 check(EXECUTION_ROLE_ARN==="arn:aws:iam::935838375949:role/DesignStudioLearnerCloudFormationRole");
 check(bootstrap.Rules.CorrectAccount.Assertions[0].Assert["Fn::Equals"][1]===ACCOUNT);
 check(bootstrap.Resources.AppUser.Properties.UserName==="design-studio-learner-pilot");
 check(JSON.stringify(bootstrap.Resources.AppUserAccess.Properties.Users)==='[{"Ref":"AppUser"}]');
 check(!JSON.stringify(bootstrap).includes("699121763776"));
 check(!JSON.stringify(bootstrap).includes("base-64-user1"));
 check(!Object.values(bootstrap.Resources).some(r=>r.Type==="AWS::IAM::AccessKey"));
 check(!("LoginProfile" in bootstrap.Resources.AppUser.Properties));
 const actions=bootstrap.Resources.AppUserAccess.Properties.PolicyDocument.Statement.flatMap(s=>s.Action);
 check(!actions.some(a=>/^iam:(Create|Put|Attach|Update)/.test(a)));
});
