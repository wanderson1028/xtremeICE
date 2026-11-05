export const REGION = "us-east-1";
export const ACCOUNT = "935838375949";
export const MANAGED_BY = "ExtremeICE-DesignStudio-Learner";
export function requireAccount(observed: string) {
 if (observed !== ACCOUNT) throw Object.assign(new Error("Dedicated learner AWS account mismatch"), {name:"AWS_ACCOUNT_MISMATCH"});
}
