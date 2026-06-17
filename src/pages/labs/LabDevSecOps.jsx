import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    label: "Run SAST with Semgrep",
    command: "semgrep --config=p/owasp-top-ten ./src/ --json | jq '.results[] | {file: .path, rule: .check_id, severity: .extra.severity}'",
    expectedOutput: "file: src/auth.js | rule: javascript.jwt.hardcoded-secret | severity: ERROR",
    hint: "Run a static analysis scan on the source code to find OWASP Top 10 vulnerabilities.",
    securityInsight: "SAST tools scan source code without execution. Catching hardcoded secrets, SQL injection sinks, and XSS patterns at commit time is 100x cheaper than finding them in production.",
  },
  {
    label: "Scan Dependencies with OWASP Dependency-Check",
    command: "dependency-check --project 'webapp' --scan ./package.json --format HTML --out ./reports/",
    expectedOutput: "Dependencies scanned: 47 | Vulnerabilities found: 3 | CVE-2023-44487 (CRITICAL): http2 package",
    hint: "Scan third-party packages for known CVEs using the OWASP Dependency-Check tool.",
    securityInsight: "Software Composition Analysis (SCA) identifies vulnerable third-party libraries. CVE-2023-44487 (HTTP/2 Rapid Reset) is a zero-day that affected nearly every major web framework in 2023.",
  },
  {
    label: "Build Docker Image & Scan with Trivy",
    command: "docker build -t webapp:latest . && trivy image webapp:latest --severity HIGH,CRITICAL --exit-code 1",
    expectedOutput: "webapp:latest | Total: 5 (HIGH: 3, CRITICAL: 2) | Exit code 1 — pipeline blocked",
    hint: "Build the container image and scan it with Trivy. A non-zero exit code will block the CI pipeline.",
    securityInsight: "Container image scanning is critical in DevSecOps. Trivy checks the OS layer, language packages, and IaC files. Setting --exit-code 1 creates a hard gate that fails the build on critical findings.",
  },
  {
    label: "Run DAST with OWASP ZAP",
    command: "docker run -t owasp/zap2docker-stable zap-baseline.py -t http://staging.webapp.local -r zap_report.html",
    expectedOutput: "PASS: 14 | WARN: 3 | FAIL: 1 — Missing security headers (X-Frame-Options, CSP)",
    hint: "Run a DAST baseline scan against the staging application to find runtime vulnerabilities.",
    securityInsight: "DAST tests the running application from the outside, finding issues SAST can't — like missing HTTP security headers, open redirects, and server misconfigurations.",
  },
  {
    label: "Enforce Security Gates in CI/CD",
    command: "cat .github/workflows/security.yml | grep -A5 'security-gate'",
    expectedOutput: "security-gate: if: steps.trivy.outcome == 'failure' || steps.semgrep.outcome == 'failure' | run: exit 1 | name: Block deployment",
    hint: "Verify the CI/CD pipeline YAML has security gate conditions that block deployment on failures.",
    securityInsight: "Security gates enforce a 'shift-left' policy — vulnerabilities must be resolved before code reaches production. Integrating SAST, SCA, and DAST into the pipeline makes security a shared team responsibility.",
  },
];

export default function LabDevSecOps() {
  return (
    <LabRunner
      title="DevSecOps Pipeline Security"
      difficulty="Advanced"
      duration={75}
      category="Securely Provision"
      tags={["Semgrep", "Trivy", "OWASP ZAP", "SAST", "DAST", "CI/CD"]}
      objectives={[
        "Perform static application security testing (SAST) with Semgrep",
        "Identify vulnerable third-party dependencies using SCA",
        "Scan container images for CVEs and block builds on critical findings",
        "Execute dynamic application security testing (DAST) against a staging environment",
        "Implement security gates in a CI/CD pipeline",
      ]}
      prerequisites={["Basic Docker knowledge", "Familiarity with CI/CD concepts", "Understanding of OWASP Top 10"]}
      steps={steps}
    />
  );
}