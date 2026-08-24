import React from "react";
import LabRunner from "@/components/labs/LabRunner";
import RagArchitectureDiagram from "@/components/labs/aws/RagArchitectureDiagram";
import TemperatureEffect from "@/components/labs/aws/TemperatureEffect";

const steps = [
  {
    stepLabel: "List foundation models on Bedrock",
    explanation: "Foundation models are large pre-trained models that can be adapted to many tasks. Amazon Bedrock offers models from multiple providers. Review the available model families and their characteristics.",
    whyItMatters: "AIF-C01 Domain 3 tests model selection — choosing the right model for a task based on modality (text, image, embedding), size, cost, and latency. Knowing the Bedrock model catalog is the starting point for any foundation model application.",
    command: "aws bedrock list-foundation-models --query 'modelSummaries[].{Id:modelId,Provider:providerName,Modalities:inputModalities}' --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "-----------------------------------------------------",
      "|  Model ID                    |  Provider  |  Type  |",
      "+------------------------------+-----------+--------+",
      "|  anthropic.claude-3-sonnet   |  Anthropic|  Text  |",
      "|  amazon.titan-text-premier   |  Amazon   |  Text  |",
      "|  amazon.titan-embed-text     |  Amazon   |  Embed |",
      "|  amazon.titan-image-generator|  Amazon   |  Image |",
      "|  meta.llama3-70b             |  Meta     |  Text  |",
      "+------------------------------+-----------+--------+",
    ],
    question: {
      text: "An application needs to convert product descriptions into vector embeddings for a semantic search feature. Which type of foundation model should you select from Bedrock?",
      options: [
        "A text generation model like Claude — it can write the embeddings as text",
        "An embedding model like amazon.titan-embed-text — it is purpose-built to convert text into vector representations",
        "An image generation model — embeddings are stored as images",
        "Any model works — all Bedrock models produce embeddings as a side effect",
      ],
      correctIndex: 1,
      explanation: "Embedding models (like amazon.titan-embed-text) are purpose-built to convert text into vector representations for semantic search and RAG. Text generation models (Claude, Titan Text) produce natural-language output, not vectors. Image models produce images. Embeddings are a distinct model type with a specific output format (a fixed-length vector), so you must select an embedding model for vector-based retrieval. This model-type-to-task matching is core to AIF-C01 Domain 3.",
    },
  },
  {
    stepLabel: "Explore RAG architecture",
    explanation: "Retrieval-Augmented Generation (RAG) grounds a foundation model in your data: at inference time, relevant documents are retrieved and inserted into the prompt so the model answers from current, citeable context — without retraining.",
    whyItMatters: "RAG is the most important application pattern in AIF-C01 Domain 3. It solves the two biggest problems with foundation models: stale knowledge (the model was trained on old data) and hallucination (the model invents facts). RAG grounds answers in retrieved evidence, making them current and citeable.",
    visual: <RagArchitectureDiagram />,
    command: "aws bedrock describe-knowledge-base --knowledge-base-id my-kb --query 'retrievalConfig' --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "Knowledge Base: my-kb",
      "  Vector Store: amazon-opensearch-serverless",
      "  Embedding Model: amazon.titan-embed-text-v2",
      "  Chunking Strategy: fixed-size (300 tokens, 20 overlap)",
      "  Retrieval: top-k=5 (cosine similarity)",
      "",
      "  Flow: query -> embed -> vector search -> augment prompt -> LLM -> answer",
    ],
    question: {
      text: "A company's chatbot gives outdated answers because its product catalog changes weekly. What is the most cost-effective way to keep answers current without retraining the model?",
      options: [
        "Fine-tune the model on the new catalog every week",
        "Implement RAG — store the catalog in a vector store and retrieve relevant sections at inference time; updating the store keeps answers current with no retraining",
        "Pre-train a new foundation model from scratch each month",
        "Increase the model's temperature so it generates more creative answers",
      ],
      correctIndex: 1,
      explanation: "RAG is the most cost-effective solution: store the product catalog in a vector store and retrieve relevant sections at inference time. When the catalog updates weekly, you only update the vector store (re-embed the changed documents) — no model retraining needed. Fine-tuning weekly is expensive and slow. Pre-training from scratch is far too costly. Raising temperature increases randomness, not currency. RAG's key advantage is decoupling knowledge (in the vector store) from the model (which stays frozen).",
    },
  },
  {
    stepLabel: "Experiment with temperature and top-p",
    explanation: "Inference parameters control how a model selects the next token. Temperature flattens or sharpens the probability distribution; top-p (nucleus sampling) restricts the token pool. Lower values = deterministic; higher = creative.",
    whyItMatters: "AIF-C01 tests inference parameter tuning. Temperature 0 is for factual/reproducible tasks (Q&A, code); higher temperature is for creative tasks (brainstorming, marketing copy). Choosing the wrong setting causes either boring repetitive output or hallucinated randomness — a common real-world failure.",
    visual: <TemperatureEffect />,
    command: "aws bedrock invoke-model --model-id amazon.titan-text-premier --body '{\"textGenerationConfig\":{\"temperature\":0.7,\"topP\":0.9}}' --query 'output.text' --output text",
    prompt: "mladmin@cli:~$",
    output: [
      "Inference Parameters:",
      "  temperature: 0.7  (balanced)",
      "  topP: 0.9         (nucleus sampling)",
      "  maxTokenCount: 512",
      "",
      "Prompt: 'Paris is the ___ of France.'",
      "  temp=0.0 -> 'capital' (100% deterministic)",
      "  temp=0.7 -> 'capital' (70%) | 'city' (22%) | 'hub' (8%)",
      "  temp=1.0 -> 'capital' (40%) | 'city' (35%) | 'hub' (25%)",
    ],
    question: {
      text: "You are building a legal contract-analysis tool that must extract clauses consistently and reproducibly. What temperature setting should you use, and why?",
      options: [
        "Temperature 1.0 — high creativity helps the model find unusual clauses",
        "Temperature 0.0 — deterministic output ensures the same input always produces the same extraction, which is critical for auditability and reproducibility",
        "Temperature 0.5 — a balance of creativity and consistency",
        "Temperature does not affect reproducibility — only the model choice matters",
      ],
      correctIndex: 1,
      explanation: "Temperature 0.0 makes the model deterministic — it always selects the highest-probability token, so the same input produces the same output every time. For legal contract analysis, reproducibility is essential: auditors must be able to re-run an extraction and get the identical result. Higher temperature introduces randomness, which would make extractions non-reproducible and non-auditable. Temperature 0 is the standard for factual, analytical, and code-generation tasks.",
    },
  },
  {
    stepLabel: "Review prompt engineering techniques",
    explanation: "Advanced prompt techniques improve output quality: few-shot (provide examples), chain-of-thought (ask the model to reason step-by-step), and role-based (assign a persona). Review when to use each.",
    whyItMatters: "AIF-C01 tests prompt design as a primary lever for model performance. Chain-of-thought is especially tested — it dramatically improves performance on multi-step reasoning by asking the model to show its work, reducing errors on arithmetic and logic.",
    command: "aws bedrock describe-prompt-techniques --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "--------------------------------------------------------",
      "|  Technique        |  When to Use         |  Benefit   |",
      "+-------------------+----------------------+-----------+",
      "|  Few-shot         |  Need specific format|  Consistency|",
      "|  Chain-of-thought |  Multi-step reasoning|  Accuracy  |",
      "|  Role-based       |  Need expert tone    |  Relevance |",
      "|  Template/Schema  |  Structured output   |  Parseable |",
      "+-------------------+----------------------+-----------+",
    ],
    question: {
      text: "A model gives wrong answers to multi-step math word problems. Which prompt technique most reliably improves its accuracy, and why?",
      options: [
        "Few-shot — show it example final answers to copy",
        "Chain-of-thought — ask the model to reason step-by-step before giving the answer, which breaks the problem into verifiable intermediate steps and reduces arithmetic errors",
        "Role-based — tell the model it is a mathematician, which makes it better at math",
        "Increase temperature — more creative answers are more likely to be correct",
      ],
      correctIndex: 1,
      explanation: "Chain-of-thought prompting asks the model to show its reasoning step-by-step before the final answer. This dramatically improves accuracy on multi-step problems because each intermediate step is simpler (and more likely correct) than jumping to the final answer, and errors become visible and debuggable. Few-shot shows final answers but not reasoning. Role-based prompting changes tone, not reasoning ability. Higher temperature increases randomness, worsening math accuracy. Chain-of-thought is a heavily tested AIF-C01 technique.",
    },
  },
  {
    stepLabel: "Evaluate model outputs",
    explanation: "Foundation model outputs are evaluated with task-specific metrics: ROUGE (summarization overlap), BLEU (translation n-gram match), BERTScore (semantic similarity), and human evaluation. Review the metric landscape.",
    whyItMatters: "AIF-C01 tests whether you can match the evaluation metric to the generative task. Summarization uses ROUGE; translation uses BLEU; semantic similarity uses BERTScore. There is no single 'accuracy' for generative output — evaluation is task-specific and often includes human review.",
    command: "aws bedrock describe-evaluation-metrics --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "--------------------------------------------------------",
      "|  Task            |  Metric      |  Measures           |",
      "+------------------+--------------+---------------------+",
      "|  Summarization    |  ROUGE       |  N-gram overlap     |",
      "|  Translation     |  BLEU        |  N-gram precision   |",
      "|  Semantic match  |  BERTScore   |  Embedding similarity|",
      "|  Open-ended      |  Human eval  |  Relevance, safety  |",
      "+------------------+--------------+---------------------+",
    ],
    question: {
      text: "A team built an automatic summarization feature and needs to evaluate how well the summaries capture the source content. Which metric is designed for this?",
      options: [
        "BLEU — it measures translation quality",
        "ROUGE — it measures how much of the reference content (n-grams) appears in the generated summary",
        "BERTScore — it measures image similarity",
        "Accuracy — it works for any task including summarization",
      ],
      correctIndex: 1,
      explanation: "ROUGE (Recall-Oriented Understudy for Gisting Evaluation) measures summarization quality by counting how many n-grams from the reference summary appear in the generated summary — it measures content coverage (recall) and precision. BLEU is for translation (n-gram precision against a reference translation). BERTScore measures semantic similarity via embeddings, not specifically summarization. 'Accuracy' doesn't apply to generative text — there's no single correct output. Matching metric to task is a core AIF-C01 skill.",
    },
  },
  {
    stepLabel: "Choose a model for a business use case",
    explanation: "Model selection balances modality (text/image/embedding), size (cost vs. quality), latency, and context window. Review a decision framework for matching use cases to models.",
    whyItMatters: "AIF-C01 Domain 3 culminates in model selection. The exam gives a business scenario and asks which model/service fits. Key tradeoffs: larger models = better quality but higher cost/latency; embedding models for search; image models for generation; smaller models for real-time/edge.",
    command: "aws bedrock describe-model-selection --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "---------------------------------------------------------",
      "|  Use Case          |  Recommended Model Type           |",
      "+--------------------+-----------------------------------+",
      "|  Semantic search   |  Embedding (titan-embed-text)     |",
      "|  Code generation   |  Text (claude-sonnet)            |",
      "|  Marketing copy    |  Text (titan-text, temp=0.7)     |",
      "|  Image creation    |  Image (titan-image-generator)  |",
      "|  Real-time chat    |  Small/fast text (haiku/llama)   |",
      "+--------------------+-----------------------------------+",
    ],
    question: {
      text: "A startup needs a generative ML model for a real-time customer chatbot with strict latency requirements (< 1 second response). Which model characteristic should they prioritize?",
      options: [
        "The largest available model — bigger is always better for chat",
        "A smaller, faster model (e.g., Claude Haiku or Llama 3 8B) — lower latency meets the real-time requirement while still handling chat adequately",
        "An embedding model — it is the fastest model type",
        "An image generation model — it can render responses as images",
      ],
      correctIndex: 1,
      explanation: "For real-time chat with strict latency, prioritize a smaller, faster model (Claude Haiku, Llama 3 8B). These models are optimized for low latency while still handling conversational tasks well. The largest models (Claude Opus, Titan Premier) have higher quality but slower response times that would violate a 1-second SLA. Embedding models produce vectors, not chat responses. Image models are irrelevant to text chat. Model selection is always a quality-vs-latency-vs-cost tradeoff — a core AIF-C01 decision.",
    },
  },
];

const intro = {
  overview: "This lab covers AIF-C01 Domain 3: applications of foundation models. You'll explore the Bedrock model catalog, RAG architecture for grounding models in your data, inference parameters (temperature, top-p), prompt engineering techniques (chain-of-thought, few-shot), evaluation metrics (ROUGE, BLEU, BERTScore), and model selection for business use cases — all through the AWS CLI.",
  niceCategory: "Applications of Foundation Models",
  objectives: [
    "Identify foundation model types on Amazon Bedrock (text, embedding, image)",
    "Describe RAG architecture and when to use it over fine-tuning",
    "Explain how temperature and top-p affect model output",
    "Apply prompt engineering techniques (few-shot, chain-of-thought, role-based)",
    "Match evaluation metrics (ROUGE, BLEU, BERTScore) to generative tasks",
    "Select an appropriate model for a business use case balancing quality, cost, and latency",
  ],
  outcomes: [
    "Able to choose the right Bedrock model type for a given task",
    "Understand how RAG grounds models in current, citeable data",
    "Can set temperature appropriately for factual vs. creative tasks",
    "Able to apply chain-of-thought prompting for multi-step reasoning",
    "Know which evaluation metric fits each generative task",
    "Can balance model size, cost, and latency in model selection",
  ],
  prerequisites: [
    "Completion of the Generative ML Fundamentals lab (Domain 2) is recommended",
    "Basic familiarity with Amazon Bedrock is helpful but not required",
  ],
  tools: [
    "AWS CLI — command-line interface for AWS service management",
    "Amazon Bedrock — foundation models, Knowledge Bases, Guardrails, Agents",
    "Inference parameters — temperature, top-p, max tokens",
  ],
};

export default function LabAifFoundationModels() {
  return (
    <LabRunner
      labTitle="Applications of Foundation Models"
      chapterNum="3"
      difficulty="Intermediate"
      tags={["AWS", "AIF-C01", "Foundation Models", "RAG", "Prompt Engineering", "Bedrock"]}
      terminalLabel="AWS CLI — ML Practitioner Environment"
      duration={50}
      intro={intro}
      steps={steps}
    />
  );
}