import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    label: "Deploy Service Mesh (Istio)",
    command: "istioctl install --set profile=demo -y && kubectl label namespace default istio-injection=enabled",
    expectedOutput: "Istio installed | Namespace default labeled for sidecar injection | Envoy proxies will be injected automatically",
    hint: "Install Istio and enable automatic sidecar proxy injection in the default namespace.",
    securityInsight: "A service mesh enforces Zero Trust by making every service-to-service call go through a proxy. The proxy handles mTLS, policy enforcement, and telemetry — the application itself doesn't need to implement any of this.",
  },
  {
    label: "Enforce Mutual TLS (mTLS)",
    command: "kubectl apply -f - <<EOF\napiVersion: security.istio.io/v1beta1\nkind: PeerAuthentication\nmetadata:\n  name: default\n  namespace: default\nspec:\n  mtls:\n    mode: STRICT\nEOF",
    expectedOutput: "PeerAuthentication/default created | mTLS mode: STRICT | All unencrypted traffic will be rejected",
    hint: "Apply a PeerAuthentication policy to enforce STRICT mTLS across the entire namespace.",
    securityInsight: "STRICT mTLS means every service must present a valid certificate to communicate. This eliminates spoofing and eavesdropping between services — even if an attacker gains access to the internal network.",
  },
  {
    label: "Apply Micro-Segmentation Policy",
    command: "kubectl apply -f - <<EOF\napiVersion: security.istio.io/v1beta1\nkind: AuthorizationPolicy\nmetadata:\n  name: frontend-to-backend\nspec:\n  selector:\n    matchLabels:\n      app: backend\n  rules:\n  - from:\n    - source:\n        principals: [\"cluster.local/ns/default/sa/frontend\"]\n    to:\n    - operation:\n        methods: [\"GET\", \"POST\"]\nEOF",
    expectedOutput: "AuthorizationPolicy/frontend-to-backend created | Only frontend service account may call backend | Methods: GET, POST only",
    hint: "Create an Istio AuthorizationPolicy so only the frontend service can call the backend.",
    securityInsight: "Micro-segmentation is the core Zero Trust control. By explicitly defining which identities can talk to which services and via which methods, you contain lateral movement even after a workload compromise.",
  },
  {
    label: "Verify Denied Traffic",
    command: "kubectl exec -it $(kubectl get pod -l app=attacker -o jsonpath='{.items[0].metadata.name}') -- curl http://backend:8080/api/data",
    expectedOutput: "RBAC: access denied | HTTP 403 Forbidden | Source principal does not match policy",
    hint: "Attempt to call the backend from an unauthorized pod and confirm the request is denied.",
    securityInsight: "A 403 from Istio (not the application) means the policy enforcement layer blocked the request before it reached the service. This is the 'verify explicitly' principle of Zero Trust in action.",
  },
  {
    label: "Enable Observability",
    command: "istioctl dashboard kiali & kubectl -n istio-system port-forward svc/jaeger 16686:16686 &",
    expectedOutput: "Kiali dashboard: http://localhost:20001 | Jaeger tracing: http://localhost:16686 | Service graph loaded",
    hint: "Launch the Kiali service map and Jaeger distributed tracing dashboards.",
    securityInsight: "Zero Trust requires continuous monitoring — 'never trust, always verify' extends to traffic visibility. Kiali provides a live service map showing all mTLS connections, and Jaeger traces individual requests for anomaly detection.",
  },
];

export default function LabZeroTrust() {
  return (
    <LabRunner
      title="Zero Trust Architecture"
      difficulty="Expert"
      duration={90}
      category="Security"
      tags={["Istio", "mTLS", "Kubernetes", "Micro-segmentation", "Zero Trust", "RBAC"]}
      objectives={[
        "Deploy Istio service mesh with automatic sidecar proxy injection",
        "Enforce strict mutual TLS authentication between all services",
        "Implement micro-segmentation with Istio AuthorizationPolicy",
        "Verify that unauthorized service-to-service calls are denied",
        "Enable observability with Kiali and Jaeger for continuous monitoring",
      ]}
      prerequisites={["Kubernetes fundamentals", "Understanding of TLS/PKI", "Basic networking concepts"]}
      steps={steps}
    />
  );
}