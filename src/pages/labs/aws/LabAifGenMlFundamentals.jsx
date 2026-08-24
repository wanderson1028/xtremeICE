import React from "react";
import LabRunner from "@/components/labs/LabRunner";
import TransformerBlockDiagram from "@/components/labs/aws/TransformerBlockDiagram";
import EmbeddingSpaceScatter from "@/components/labs/aws/EmbeddingSpaceScatter";

const steps = [
  {
    stepLabel: "Describe generative ML vs. traditional ML",
    explanation: "Traditional ML learns patterns from labeled data to make predictions. Generative ML learns the distribution of data to create new content — text, images, audio. Review the distinction.",
    whyItMatters: "AIF-C01 Domain 2 hinges on this distinction. A classifier predicts a label ('spam' or 'not spam'); a generative model produces novel output ('write a summary of this email'). Understanding which paradigm a task needs is foundational.",
    command: "aws bedrock describe-genai-paradigm --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "------------------------------------------------------",
      "|  Paradigm       |  Goal              |  Example      |",
      "+-----------------+--------------------+---------------+",
      "|  Traditional ML |  Predict a label   |  Spam detect  |",
      "|  Generative ML  |  Create new content|  Write summary|",
      "+-----------------+--------------------+---------------+",
    ],
    question: {
      text: "A marketing team needs to auto-generate product descriptions from bullet points. Is this traditional ML or generative ML, and why?",
      options: [
        "Traditional ML — it classifies bullet points into categories",
        "Generative ML — it creates new natural-language text that did not exist before, which is a generation task not a prediction task",
        "Both equally — traditional ML writes the first draft and generative ML edits it",
        "Neither — product descriptions must be written by humans",
      ],
      correctIndex: 1,
      explanation: "Generating new product descriptions from bullet points is a generative ML task — the model produces novel natural-language text that didn't exist before. Traditional ML predicts labels or numbers (classification/regression); it doesn't create new content. This predict-vs-create distinction is the core of AIF-C01 Domain 2.",
    },
  },
  {
    stepLabel: "Review transformer architecture",
    explanation: "Transformers are the neural network architecture behind modern generative ML. They use self-attention to let every token weigh the importance of every other token, enabling long-range context understanding.",
    whyItMatters: "AIF-C01 doesn't require deep math, but it does test whether you know that transformers use self-attention, that they process tokens in parallel (not sequentially like RNNs), and that they underpin models like Claude, Titan, and GPT. This is the architectural foundation of generative ML.",
    visual: <TransformerBlockDiagram />,
    command: "aws bedrock describe-model-architecture --model-id anthropic.claude --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "-------------------------------------------",
      "|  Component              |  Function      |",
      "+-------------------------+----------------+",
      "|  Tokenization           |  text -> tokens|",
      "|  Embeddings             |  tokens -> vec |",
      "|  Self-Attention         |  weigh context |",
      "|  Feed-Forward Network   |  transform     |",
      "|  Output Probabilities   |  next token    |",
      "+-------------------------+----------------+",
    ],
    question: {
      text: "What is the key mechanism that lets transformers understand long-range context in text, and why is this an advantage over older RNN architectures?",
      options: [
        "Tokenization — splitting text into tokens lets the model process longer inputs",
        "Self-attention — every token can directly attend to every other token, capturing long-range dependencies without the sequential bottleneck of RNNs",
        "Feed-forward networks — they add non-linearity that RNNs lack",
        "Embeddings — converting tokens to vectors is what enables context",
      ],
      correctIndex: 1,
      explanation: "Self-attention is the transformer's key innovation: every token can directly weigh every other token in the sequence, so long-range dependencies (e.g., a pronoun referring to a noun 20 tokens back) are captured in a single step. RNNs process tokens sequentially, so distant context degrades over time. Self-attention also enables parallel processing, which is why transformers train faster on GPUs. Tokenization and embeddings are preprocessing steps, not the context mechanism.",
    },
  },
  {
    stepLabel: "Explore embedding space",
    explanation: "Embeddings are vector representations of text where semantic similarity becomes spatial proximity — similar concepts are near each other in the vector space. This is the foundation of semantic search and RAG.",
    whyItMatters: "Embeddings are the bridge between language and math. AIF-C01 tests whether you understand that embeddings let you compute 'how similar' two texts are by measuring vector distance — which is how retrieval-augmented generation (RAG) finds relevant documents. This concept underpins Domain 3 as well.",
    visual: <EmbeddingSpaceScatter />,
    command: "aws bedrock invoke-model --model-id amazon.titan-embed-text --body '{\"inputText\":\"dog cat horse car truck\"}' --query 'embedding.dimensions' --output text",
    prompt: "mladmin@cli:~$",
    output: [
      "Titan Embedding Text v2 — 1536 dimensions",
      "",
      "  dog   -> [0.12, 0.87, 0.45, ... 1536 dims]",
      "  cat   -> [0.14, 0.85, 0.43, ... 1536 dims]  (close to dog)",
      "  horse -> [0.15, 0.82, 0.48, ... 1536 dims]  (close to dog/cat)",
      "  car   -> [0.71, 0.22, 0.91, ... 1536 dims]  (far from animals)",
      "  truck -> [0.73, 0.20, 0.89, ... 1536 dims]  (close to car)",
      "",
      "  cosine_similarity(dog, cat)   = 0.94  (very similar)",
      "  cosine_similarity(dog, car)    = 0.12  (very different)",
    ],
    question: {
      text: "A legal team wants to search thousands of contracts for clauses 'similar to a force majeure clause.' Which technique makes this possible, and how?",
      options: [
        "Keyword matching — search for the exact phrase 'force majeure' in every contract",
        "Embeddings — convert the query clause and every contract clause into vectors, then find clauses with the smallest vector distance (highest cosine similarity)",
        "Tokenization — split each contract into tokens and count word frequency",
        "Fine-tuning — train a custom model on all the contracts first",
      ],
      correctIndex: 1,
      explanation: "Embeddings enable semantic search: convert the query clause and every contract clause into vectors, then find the clauses with the smallest vector distance (highest cosine similarity). This finds clauses that mean the same thing even if they use different words ('act of God' vs. 'force majeure'). Keyword matching misses paraphrases. Tokenization is a preprocessing step, not a search method. Fine-tuning is overkill for retrieval. This is exactly how RAG retrieval works.",
    },
  },
  {
    stepLabel: "Compare pre-training, fine-tuning, and RAG",
    explanation: "Three ways to adapt a foundation model: pre-training (train from scratch on massive data), fine-tuning (adapt a pre-trained model to a specific task), and RAG (retrieve relevant context at inference time without changing the model).",
    whyItMatters: "AIF-C01 tests when to use each. Pre-training is expensive and rare (only big labs do it). Fine-tuning changes model weights for a specific task/style. RAG grounds the model in your data without retraining — cheaper, current, and citeable. Choosing between them is a core exam decision.",
    command: "aws bedrock list-adaptation-methods --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "--------------------------------------------------------",
      "|  Method      |  Changes Weights? |  Use Case         |",
      "+--------------+-------------------+-------------------+",
      "|  Pre-training|  Yes (from scratch)|  New base model  |",
      "|  Fine-tuning |  Yes (adapt)      |  Task/style fit   |",
      "|  RAG         |  No (retrieve)    |  Current knowledge|",
      "+--------------+-------------------+-------------------+",
    ],
    question: {
      text: "A company wants its customer-support chatbot to answer questions based on its constantly-updated product documentation. Which adaptation method is most appropriate, and why?",
      options: [
        "Pre-training — build a new foundation model trained on the documentation",
        "Fine-tuning — retrain the model on the documentation every time it updates",
        "RAG — retrieve relevant doc sections at inference time; no retraining needed when docs update, and answers are citeable",
        "None — the base model already knows the company's product documentation",
      ],
      correctIndex: 2,
      explanation: "RAG is the best fit: retrieve relevant documentation sections at inference time and ground the model's answer in them. When the documentation updates, no retraining is needed — the retrieval simply pulls the new content. RAG also makes answers citeable (you know which doc section was used). Pre-training is far too expensive. Fine-tuning would require retraining every time docs change, which is impractical, and fine-tuned answers aren't easily citeable. The base model doesn't know your private, current documentation.",
    },
  },
  {
    stepLabel: "List AWS generative ML services",
    explanation: "Amazon Bedrock is AWS's managed generative ML service, offering foundation models from multiple providers (Anthropic, Meta, Amazon, etc.) plus knowledge bases (RAG), guardrails, and agents. Review the Bedrock service family.",
    whyItMatters: "AIF-C01 maps use cases to Bedrock features. Knowing that Bedrock provides models, Knowledge Bases (managed RAG), Guardrails (safety filters), and Agents (multi-step tool use) is the core service-knowledge tested in Domain 2 and Domain 3.",
    command: "aws bedrock list-foundation-models --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "-----------------------------------------------------",
      "|  Model ID                    |  Provider  |  Type  |",
      "+------------------------------+-----------+--------+",
      "|  anthropic.claude-3-sonnet   |  Anthropic|  Text  |",
      "|  amazon.titan-text-premier   |  Amazon   |  Text  |",
      "|  amazon.titan-embed-text     |  Amazon   |  Embed |",
      "|  meta.llama3-70b             |  Meta     |  Text  |",
      "|  amazon.titan-image-generator|  Amazon   |  Image |",
      "+------------------------------+-----------+--------+",
    ],
    question: {
      text: "A developer needs to add a knowledge base (RAG), safety guardrails, and multi-step tool use to a generative ML application. Which AWS service provides all three as managed features?",
      options: [
        "Amazon SageMaker — it is the full ML platform",
        "Amazon Bedrock — it offers Knowledge Bases (RAG), Guardrails (safety), and Agents (tool use) as managed features",
        "Amazon Comprehend — it provides NLP APIs for text analysis",
        "Amazon Lex — it builds conversational chatbots with RAG built in",
      ],
      correctIndex: 1,
      explanation: "Amazon Bedrock provides Knowledge Bases (managed RAG with vector storage), Guardrails (content filters, PII redaction, topic denial), and Agents (multi-step tool orchestration) as managed features on top of foundation models. SageMaker is for custom ML training, not managed generative ML features. Comprehend is for NLP analysis (entity recognition, sentiment), not generation. Lex builds conversational bots but doesn't provide the full Bedrock feature set.",
    },
  },
  {
    stepLabel: "Describe prompt engineering basics",
    explanation: "Prompt engineering is the practice of crafting inputs to guide a model's output. Key techniques include being specific, providing examples (few-shot), specifying format, and setting the role/persona. Review the core patterns.",
    whyItMatters: "AIF-C01 treats prompt engineering as a first-class skill. The exam tests whether you know that clear, specific, well-structured prompts with examples produce better output than vague ones — and that prompt design is the cheapest way to improve model performance before resorting to fine-tuning.",
    command: "aws bedrock describe-prompt-patterns --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "--------------------------------------------------",
      "|  Pattern       |  Technique      |  Effect       |",
      "+----------------+----------------+---------------+",
      "|  Zero-shot     |  Ask directly   |  Baseline     |",
      "|  Few-shot      |  Give examples  |  Guide format |",
      "|  Role-based    |  Set persona    |  Set tone     |",
      "|  Chain-of-thought | Ask to reason|  Better logic |",
      "+----------------+----------------+---------------+",
    ],
    question: {
      text: "A user asks a model to 'write a summary' and gets a vague, inconsistent result. Which prompt engineering technique would most reliably improve output consistency?",
      options: [
        "Increase the model's temperature to 1.0 for more creativity",
        "Use few-shot prompting — provide 2-3 example summaries so the model learns the desired format, length, and tone",
        "Switch to a smaller model — smaller models are more consistent",
        "Remove all instructions and let the model decide the format",
      ],
      correctIndex: 1,
      explanation: "Few-shot prompting — providing 2-3 example summaries — teaches the model the desired format, length, and tone by demonstration. This is the most reliable way to improve consistency without changing the model. Raising temperature increases randomness (worse for consistency). Smaller models are less capable, not more consistent. Removing instructions makes output more variable. Few-shot is a core AIF-C01 prompt-engineering technique and the cheapest first improvement.",
    },
  },
];

const intro = {
  overview: "This lab covers AIF-C01 Domain 2: the fundamentals of generative ML. You'll explore the distinction between generative and traditional ML, transformer architecture and self-attention, embedding space and semantic similarity, model adaptation methods (pre-training, fine-tuning, RAG), Amazon Bedrock services, and prompt engineering patterns — all through the AWS CLI.",
  niceCategory: "Fundamentals of Generative ML",
  objectives: [
    "Distinguish generative ML from traditional ML by goal and output",
    "Describe the transformer architecture and the role of self-attention",
    "Explain embeddings and how vector distance represents semantic similarity",
    "Compare pre-training, fine-tuning, and RAG as model adaptation methods",
    "Identify Amazon Bedrock services (models, Knowledge Bases, Guardrails, Agents)",
    "Apply core prompt engineering patterns (zero-shot, few-shot, role-based, chain-of-thought)",
  ],
  outcomes: [
    "Able to classify a task as predictive (traditional ML) or generative",
    "Understand why self-attention enables long-range context in transformers",
    "Can explain how embeddings power semantic search and RAG retrieval",
    "Able to choose between fine-tuning and RAG for a given use case",
    "Know the Bedrock service family and when to use each feature",
    "Can apply few-shot and role-based prompting to improve output consistency",
  ],
  prerequisites: [
    "Completion of the ML Fundamentals lab (Domain 1) is recommended",
    "Basic understanding of neural networks is helpful but not required",
  ],
  tools: [
    "AWS CLI — command-line interface for AWS service management",
    "Amazon Bedrock — managed generative ML service",
    "Transformer concepts — self-attention, embeddings, prompt engineering",
  ],
};

export default function LabAifGenMlFundamentals() {
  return (
    <LabRunner
      labTitle="Generative ML Fundamentals"
      chapterNum="2"
      difficulty="Beginner"
      tags={["AWS", "AIF-C01", "Generative ML", "Transformers", "Embeddings", "Bedrock"]}
      terminalLabel="AWS CLI — ML Practitioner Environment"
      duration={45}
      intro={intro}
      steps={steps}
    />
  );
}