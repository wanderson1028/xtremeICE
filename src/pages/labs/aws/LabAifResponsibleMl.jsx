import React from "react";
import LabRunner from "@/components/labs/LabRunner";
import ResponsibleMlPillars from "@/components/labs/aws/ResponsibleMlPillars";

const steps = [
  {
    stepLabel: "Review responsible ML dimensions",
    explanation: "Responsible ML spans six dimensions: fairness, explainability, transparency, privacy & security, safety, and governance. AWS guides builders to evaluate every ML system against all six.",
    whyItMatters: "AIF-C01 Domain 4 is entirely about responsible ML. The exam tests whether you can identify which dimension a concern maps to — e.g., bias detection is fairness; model cards are transparency; human review is governance. Knowing the six dimensions is the framework for the whole domain.",
    visual: <ResponsibleMlPillars />,
    command: "aws bedrock describe-responsible-ml-dimensions --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "------------------------------------------------------",
      "|  Dimension          |  Focus                        |",
      "+---------------------+-------------------------------+",
      "|  Fairness           |  Equitable outcomes across groups|",
      "|  Explainability     |  Understandable decisions     |",
      "|  Transparency       |  Open about model use          |",
      "|  Privacy & Security |  Protect data                 |",
      "|  Safety             |  No harm                      |",
      "|  Governance         |  Accountability & oversight   |",
      "+---------------------+-------------------------------+",
    ],
    question: {
      text: "A hiring-screening model systematically downgrades resumes from certain universities. Which responsible ML dimension does this violate, and what is the primary concern?",
      options: [
        "Safety — the model might harm candidates' careers",
        "Fairness — the model produces inequitable outcomes across groups, indicating bias in training data or features",
        "Explainability — the model should explain why it downgraded the resumes",
        "Transparency — the company should disclose that it uses ML screening",
      ],
      correctIndex: 1,
      explanation: "Systematic downgrading based on university affiliation is a fairness violation — the model produces inequitable outcomes across demographic groups, indicating bias. While explainability (why was a resume downgraded) and transparency (disclosing ML use) are related concerns, the primary issue is biased, inequitable outcomes, which is the fairness dimension. Safety is about physical or significant harm, not hiring bias specifically. Fairness is the core dimension tested here.",
    },
  },
  {
    stepLabel: "Detect bias in model predictions",
    explanation: "Bias detection measures whether a model performs differently across demographic groups. Key metrics include demographic parity (equal selection rates) and disparate impact (ratio of selection rates between groups). Review the bias detection toolkit.",
    whyItMatters: "AIF-C01 tests bias metrics. A model with 90% accuracy overall might have 95% accuracy for one group and 70% for another — the aggregate hides the gap. Disparate impact (a legal standard) flags a model if the selection rate for a protected group is less than 80% of the majority group's rate (the 'four-fifths rule').",
    command: "aws sagemaker describe-model-bias --model-name hiring-model --query 'biasMetrics' --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "----------------------------------------------",
      "|  Group    |  Selection Rate |  Accuracy    |",
      "+-----------+----------------+--------------+",
      "|  Group A  |  0.45          |  0.92        |",
      "|  Group B  |  0.30          |  0.71        |",
      "+-----------+----------------+--------------+",
      "|  Disparate Impact = 0.30/0.45 = 0.67 (< 0.80 threshold)",
      "|  [!] Bias detected — Group B selection rate below four-fifths rule",
    ],
    question: {
      text: "A loan-approval model approves 60% of Group A applicants and 42% of Group B applicants. The disparate impact ratio is 0.70. What does this indicate, and what is the standard threshold?",
      options: [
        "No bias — 42% is still a majority approval rate",
        "Potential bias — the disparate impact ratio (0.70) is below the four-fifths rule threshold of 0.80, indicating Group B is approved at a disproportionately lower rate and warranting investigation",
        "The model is fair because overall accuracy is high",
        "Disparate impact only applies to hiring, not lending",
      ],
      correctIndex: 1,
      explanation: "The disparate impact ratio is 0.70 (42/60), which is below the four-fifths rule threshold of 0.80. This indicates potential bias: Group B is approved at a rate less than 80% of Group A's rate, which is the legal/regulatory standard flag for disproportionate impact. High overall accuracy doesn't address group-level fairness. Disparate impact applies across domains (hiring, lending, housing), not just hiring. The four-fifths rule is a core AIF-C01 bias concept.",
    },
  },
  {
    stepLabel: "Explain model predictions",
    explanation: "Explainability techniques reveal why a model made a prediction. SHAP (SHapley Additive exPlanations) attributes a prediction to input features, showing which factors drove the outcome. Review explainability tools.",
    whyItMatters: "AIF-C01 tests explainability as a responsible-ML requirement, especially for regulated domains (credit, healthcare, criminal justice). A model that denies a loan must be able to explain why — 'income too low' or 'high debt-to-income ratio' — not just return a denial. Black-box models without explainability can violate regulations like GDPR's 'right to explanation.'",
    command: "aws sagemaker describe-model-explainability --model-name credit-model --query 'shapValues' --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "-------------------------------------------",
      "|  Feature            |  SHAP Value        |",
      "+---------------------+-------------------+",
      "|  income             |  +0.32  (approved) |",
      "|  debt_to_income     |  -0.41  (denied)  |",
      "|  credit_score       |  +0.18  (approved) |",
      "|  employment_years   |  +0.05  (neutral)  |",
      "+---------------------+-------------------+",
      "|  Decision: DENIED (debt_to_income dominates)",
    ],
    question: {
      text: "A credit-scoring model denies a loan but cannot explain why. Under regulations like GDPR, what right does the applicant have, and which responsible ML dimension applies?",
      options: [
        "The applicant has no right to an explanation — models are proprietary",
        "The applicant has a 'right to explanation' — GDPR requires meaningful information about the logic of automated decisions; this is the explainability dimension",
        "The applicant can only appeal the decision, not ask for an explanation",
        "Explainability is optional and only applies to healthcare models",
      ],
      correctIndex: 1,
      explanation: "GDPR (Article 22) grants a right to meaningful information about the logic of automated decisions with legal/significant effects — including credit denials. The applicant is entitled to an explanation of why the model denied the loan. This is the explainability dimension of responsible ML. SHAP and similar techniques make this possible by attributing decisions to features ('denied due to high debt-to-income ratio'). Black-box models that can't explain are non-compliant in regulated domains. Explainability is a heavily tested AIF-C01 concept.",
    },
  },
  {
    stepLabel: "Apply human-in-the-loop review",
    explanation: "Human-in-the-loop (HITL) adds human review for high-stakes or low-confidence model decisions. Review when human oversight is required vs. when full automation is acceptable.",
    whyItMatters: "AIF-C01 tests when HITL is appropriate: high-stakes decisions (medical, legal, credit), low-confidence predictions (model uncertainty), and edge cases. Full automation is acceptable for low-risk, high-volume tasks (content recommendations). The governance dimension requires knowing where to place the human checkpoint.",
    command: "aws bedrock describe-human-review-config --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "-------------------------------------------------------",
      "|  Decision Type    |  Confidence  |  Human Review?     |",
      "+-------------------+--------------+---------------------+",
      "|  Medical diagnosis|  Any         |  Required (always)  |",
      "|  Loan denial       |  < 0.85      |  Required (low conf)|",
      "|  Content recommend |  Any         |  Not required       |",
      "|  Content moderation|  Borderline  |  Required (edge)    |",
      "+-------------------+--------------+---------------------+",
    ],
    question: {
      text: "Which two scenarios most clearly require human-in-the-loop review rather than full automation?",
      options: [
        "Product recommendations and email spam filtering — both are high-volume",
        "Medical diagnosis and loan denials — both are high-stakes decisions where errors have significant consequences and explainability/regulation require human oversight",
        "Logo generation and tagline writing — both involve creativity",
        "Sentiment analysis and keyword extraction — both are low-stakes",
      ],
      correctIndex: 1,
      explanation: "Medical diagnosis and loan denials require human-in-the-loop review because both are high-stakes: errors have significant consequences (misdiagnosis, wrongful denial), and regulations (GDPR, HIPAA, fair lending) require human oversight and explainability for automated decisions with legal/health effects. Product recommendations, spam filtering, logo generation, and sentiment analysis are low-risk, high-volume tasks where full automation is acceptable. HITL placement is a governance decision — put humans where stakes and uncertainty are highest.",
    },
  },
  {
    stepLabel: "Review AWS responsible ML practices",
    explanation: "AWS provides services and guidelines for responsible ML: SageMaker Clarify (bias detection), SageMaker Model Cards (documentation/transparency), Bedrock Guardrails (safety filters), and the AWS Responsible ML guidance. Review the toolkit.",
    whyItMatters: "AIF-C01 maps responsible-ML concerns to specific AWS services. Knowing that Clarify = bias, Model Cards = transparency, Guardrails = safety, and that AWS has a published responsible ML policy is the service-level knowledge tested in Domain 4.",
    command: "aws bedrock describe-responsible-ml-tools --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "---------------------------------------------------------",
      "|  Service                  |  Dimension Addressed       |",
      "+--------------------------+---------------------------+",
      "|  SageMaker Clarify       |  Fairness (bias detection)|",
      "|  SageMaker Model Cards   |  Transparency (documentation)|",
      "|  Bedrock Guardrails      |  Safety (content filters) |",
      "|  SageMaker Model Monitor |  Monitoring (drift)      |",
      "+--------------------------+---------------------------+",
    ],
    question: {
      text: "A team needs to document a model's intended use, training data, performance, and known limitations for transparency. Which AWS service is designed for this?",
      options: [
        "SageMaker Clarify — it detects bias in training data",
        "SageMaker Model Cards — they document a model's purpose, data, performance, and limitations for transparency and accountability",
        "Bedrock Guardrails — they filter unsafe content",
        "SageMaker Model Monitor — it detects data drift in production",
      ],
      correctIndex: 1,
      explanation: "SageMaker Model Cards are designed for transparency: they document a model's intended use, training data, evaluation results, and known limitations in a standardized, shareable format. This supports the transparency and governance dimensions of responsible ML. Clarify is for bias detection (fairness), Guardrails for content safety, Model Monitor for production drift. Matching the service to the responsible-ML dimension is a core AIF-C01 skill.",
    },
  },
  {
    stepLabel: "Assess environmental impact",
    explanation: "Training large models consumes significant energy and produces carbon emissions. Responsible ML includes considering environmental sustainability — choosing right-sized models, efficient training, and cloud regions with renewable energy.",
    whyItMatters: "AIF-C01 includes environmental impact as a responsible-ML consideration. The exam tests whether you know that smaller models, efficient training, and choosing regions with green energy reduce the carbon footprint of ML — and that sustainability is a legitimate factor in model selection, not just cost and performance.",
    command: "aws bedrock describe-sustainability-metrics --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "-------------------------------------------------------",
      "|  Factor              |  Impact on Carbon Footprint   |",
      "+----------------------+-------------------------------+",
      "|  Model size          |  Larger = more energy         |",
      "|  Training data volume|  More = more compute          |",
      "|  Region energy source|  Renewable = lower emissions  |",
      "|  Inference efficiency |  Optimized = less energy     |",
      "+----------------------+-------------------------------+",
    ],
    question: {
      text: "A company is choosing between a 70B-parameter model and a 8B-parameter model for a task where both meet the quality bar. From a responsible-ML sustainability perspective, which should they choose and why?",
      options: [
        "The 70B model — larger models are always more efficient because they need fewer training epochs",
        "The 8B model — it meets the quality bar while consuming significantly less energy for both training and inference, reducing the carbon footprint",
        "Either — model size has no impact on energy consumption",
        "The 70B model — it will generate revenue that offsets its energy use",
      ],
      correctIndex: 1,
      explanation: "If both models meet the quality bar, the 8B model is the responsible choice: it consumes far less energy for both training and inference, reducing carbon emissions and cost. Responsible ML includes sustainability — choosing the smallest model that meets the need is a best practice. The 70B model's extra capacity is wasted if the task doesn't require it. Model size directly affects energy consumption (larger = more compute per token). Sustainability is a tested AIF-C01 responsible-ML factor, alongside fairness, safety, and governance.",
    },
  },
];

const intro = {
  overview: "This lab covers AIF-C01 Domain 4: guidelines for responsible ML. You'll explore the six dimensions of responsible ML (fairness, explainability, transparency, privacy & security, safety, governance), bias detection and the disparate impact rule, model explainability with SHAP, human-in-the-loop review, AWS responsible ML services (Clarify, Model Cards, Guardrails), and environmental sustainability — all through the AWS CLI.",
  niceCategory: "Guidelines for Responsible ML",
  objectives: [
    "Identify the six dimensions of responsible ML and map concerns to them",
    "Detect bias using demographic parity and the disparate impact four-fifths rule",
    "Explain model predictions using SHAP values and the right to explanation",
    "Determine when human-in-the-loop review is required vs. full automation",
    "Map AWS services (Clarify, Model Cards, Guardrails) to responsible ML dimensions",
    "Assess environmental sustainability as a factor in model selection",
  ],
  outcomes: [
    "Able to classify a responsible-ML concern into the correct dimension",
    "Can compute disparate impact and identify bias violations",
    "Understand why explainability is required in regulated domains",
    "Able to decide where to place human review checkpoints",
    "Know which AWS service addresses each responsible-ML dimension",
    "Can factor sustainability into model selection decisions",
  ],
  prerequisites: [
    "Completion of the Applications of Foundation Models lab (Domain 3) is recommended",
    "Basic understanding of model training and inference is helpful",
  ],
  tools: [
    "AWS CLI — command-line interface for AWS service management",
    "SageMaker Clarify — bias detection and explainability",
    "Bedrock Guardrails — content safety filters",
    "SageMaker Model Cards — model documentation",
  ],
};

export default function LabAifResponsibleMl() {
  return (
    <LabRunner
      labTitle="Guidelines for Responsible ML"
      chapterNum="4"
      difficulty="Intermediate"
      tags={["AWS", "AIF-C01", "Responsible ML", "Bias", "Explainability", "Governance"]}
      terminalLabel="AWS CLI — ML Practitioner Environment"
      duration={50}
      intro={intro}
      steps={steps}
    />
  );
}