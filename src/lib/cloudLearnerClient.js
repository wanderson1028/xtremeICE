import { base44 } from "@/api/base44Client";
export const learnerCall=async(action,fields={})=>(await base44.functions.invoke("cloudLearnerAWS",{action,...fields})).data;
export const learnerError=e=>[e?.response?.data?.error,e?.response?.data?.error_code,e?.response?.data?.detail].filter(Boolean).join(": ")||e.message;
