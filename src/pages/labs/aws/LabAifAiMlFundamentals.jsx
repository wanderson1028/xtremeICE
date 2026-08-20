import React from "react";
import LabRunner from "@/components/labs/LabRunner";
import MlPipelineDiagram from "@/components/labs/aws/MlPipelineDiagram";
import LossCurveChart from "@/components/labs/aws/LossCurveChart";
import ConfusionMatrix from "@/components/labs/aws/ConfusionMatrix";

const steps = [
  {
    stepLabel: "List ML problem types",
    explanation: "Machine learning problems fall into three main categories: supervised (labeled data), unsupervised (unlabeled, find patterns), and reinforcement (learn by reward). Query the ML problem taxonomy.",
    whyItMatters: "Choosing the right problem type determines the algorithm, data format, and evaluation metric. AIF-C01 tests whether you can classify a business problem (spam detection, customer segmentation, game-playing AI) into the correct ML category.",
    command: "aws sagemaker list-problem-types --output table",
    prompt: "aiadmin@cli:~$",
    output: [
      "-------------------------------------------------------",
      "|   Problem Type   |  Data Type   |  Example Use Case  |",
      "+------------------+-------------+---------------------+",
      "|  Supervised      |  Labeled    |  Spam detection     |",
      "|  Unsupervised    |  Unlabeled  |  Customer clustering|",
      "|  Reinforcement   |  Reward     |  Game-playing AI    |",
      "+------------------+-------------+---------------------+",
    ],
    question: {
      text: "A retailer wants to group customers into segments based on purchasing behavior without predefined labels. Which ML problem type is this?",
      options: [
        "Supervised learning — the retailer has labeled examples of each segment",
        "Unsupervised learning — the algorithm finds natural groupings in unlabeled data",
        "Reinforcement learning — customers receive rewards for purchases",
        "Semi-supervised learning — some customers are labeled but most are not",
      ],
      correctIndex: 1,
      explanation: "Customer segmentation without predefined labels is a classic unsupervised learning problem. Algorithms like K-means clustering find natural groupings in the data based on similarity. Supervised learning requires labeled examples (e.g., 'this customer is in segment A'), which the retailer doesn't have. Reinforcement learning learns by trial-and-error with rewards, not clustering. Unsupervised learning is the right fit when you want to discover hidden patterns.",
    },
  },
  {
    stepLabel: "Describe the ML pipeline",
    explanation: "The ML pipeline (lifecycle) is the end-to-end process: data collection, training, validation, deployment, and monitoring. It is iterative — monitoring feeds back into retraining.",
    whyItMatters: "AIF-C01 frames ML as a lifecycle, not a one-time build. Understanding each stage — and that monitoring triggers retraining when data drifts — is a core exam concept. Production ML fails more often from pipeline gaps than from algorithm choice.",
    visual: <MlPipelineDiagram />,
    command: "aws sagemaker describe-ml-pipeline --output table",
    prompt: "aiadmin@cli:~$",
    output: [
      "---------------------------------------------",
      "|        Stage        |     Purpose          |",
      "+---------------------+----------------------+",
      "|  Data Collection    |  Gather & label data  |",
      "|  Training           |  Fit model to data    |",
      "|  Validation         |  Evaluate held-out   |",
      "|  Deployment         |  Serve predictions    |",
      "|  Monitoring         |  Detect drift & retrain|",
      "+---------------------+----------------------+",
    ],
    question: {
      text: "After deploying a fraud-detection model, you notice its accuracy drops over three months. Which pipeline stage addresses this, and what is the correct response?",
      options: [
        "Deployment — redeploy the same model to a larger instance type",
        "Monitoring — detect data drift and trigger retraining on fresh data",
        "Validation — the model was never validated correctly the first time",
        "Data collection — discard the old data and start from scratch",
      ],
      correctIndex: 1,
      explanation: "Monitoring is the stage that detects performance degradation (data/concept drift) after deployment. The correct response is to trigger retraining on fresh, current data so the model adapts to the new distribution. The ML pipeline is iterative: monitoring feeds back into data collection and training. Redeploying the same model won't fix drift, and starting from scratch wastes the existing pipeline.",
    },
  },
  {
    stepLabel: "Compare training vs. validation loss",
    explanation: "Model training minimizes a loss function. By plotting training loss and validation loss over epochs, you can detect overfitting — when the model memorizes training data but stops generalizing.",
    whyItMatters: "Overfitting is one of the most tested ML concepts in AIF-C01. A model that performs well on training data but poorly on validation data has overfit. The visual cue — training loss keeps dropping while validation loss rises — is the single most recognizable diagnostic in ML.",
    visual: <LossCurveChart />,
    command: "aws sagemaker describe-training-job --job-name demo-xgboost --query 'TrainingLossCurve' --output table",
    prompt: "aiadmin@cli:~$",
    output: [
      "---------------------------------------------",
      "| Epoch | Train Loss | Validation Loss      |",
      "+-------+------------+----------------------+",
      "|   1   |   0.90     |   0.92               |",
      "|   5   |   0.28     |   0.35               |",
      "|   7   |   0.14     |   0.28  <- best epoch |",
      "|  10   |   0.05     |   0.39  <- overfit!   |",
      "+-------+------------+----------------------+",
    ],
    question: {
      text: "Looking at the loss curves, training loss keeps decreasing through epoch 10 while validation loss starts rising after epoch 7. What is happening and what should you do?",
      options: [
        "Underfitting — train for more epochs until validation loss drops again",
        "Overfitting — the model memorizes training data; stop at epoch 7 (early stopping) or add regularization",
        "The model is perfect — both losses are low enough",
        "Data drift — collect new training data before continuing",
      ],
      correctIndex: 1,
      explanation: "This is the textbook overfitting pattern: training loss keeps dropping while validation loss rises. The model is memorizing the training set instead of generalizing. The fix is early stopping (halt at epoch 7, where validation loss was lowest) or regularization (dropout, L2) to constrain the model. Training longer makes overfitting worse. Both losses being 'low' on training data is irrelevant if validation loss is climbing — generalization is what matters.",
    },
  },
  {
    stepLabel: "Inspect a confusion matrix",
    explanation: "A confusion matrix breaks down a classifier's predictions into true positives, true negatives, false positives, and false negatives. It is the foundation of precision, recall, and F1 score.",
    whyItMatters: "AIF-C01 tests precision vs. recall tradeoffs constantly. A spam filter that flags a legitimate email (false positive) annoys users; one that misses spam (false negative) lets threats through. The confusion matrix is how you quantify that tradeoff and choose the right threshold.",
    visual: <ConfusionMatrix />,
    command: "aws sagemaker describe-model-quality --model-name spam-classifier --query 'ConfusionMatrix' --output table",
    prompt: "aiadmin@cli:~$",
    output: [
      "-------------------------------",
      "|              | Predicted     |",
      "|  Actual      | Spam | Ham    |",
      "+--------------+------+--------+",
      "|  Spam        |  85  |  15    |",
      "|  Ham         |   8  | 892   |",
      "+--------------+------+--------+",
      "|  Precision = 85/(85+8) = 0.91|",
      "|  Recall    = 85/(85+15) = 0.85|",
    ],
    question: {
      text: "A medical diagnosis model for a serious disease must not miss any positive cases. Which metric should you optimize, even at the cost of more false positives?",
      options: [
        "Precision — minimize false positives even if some true cases are missed",
        "Recall — minimize false negatives; it is better to flag a healthy patient for follow-up than miss a sick one",
        "Accuracy — maximize total correct predictions regardless of the error type",
        "F1 score — balance precision and recall equally",
      ],
      correctIndex: 1,
      explanation: "In medical diagnosis (and any high-cost-of-missing case), recall is the priority. Recall = TP / (TP + FN) measures how many real cases you caught. Missing a sick patient (false negative) is far worse than a false alarm (false positive) that leads to a follow-up test. Precision matters more when false positives are costly (e.g., blocking a legitimate transaction). F1 balances both equally, which isn't appropriate when the costs of the two error types are asymmetric.",
    },
  },
  {
    stepLabel: "Review model evaluation metrics",
    explanation: "Different ML tasks use different metrics: RMSE/MAE for regression, F1/AUC-ROC for classification, and silhouette score for clustering. Review the metric taxonomy.",
    whyItMatters: "AIF-C01 expects you to match the metric to the task. Using accuracy on an imbalanced dataset (e.g., 99% negative) is a classic trap — a model that always predicts 'negative' is 99% accurate but useless. F1 and AUC-ROC handle imbalance correctly.",
    command: "aws sagemaker list-evaluation-metrics --output table",
    prompt: "aiadmin@cli:~$",
    output: [
      "--------------------------------------------------",
      "|  Task Type     |  Metric       |  Measures      |",
      "+----------------+---------------+----------------+",
      "|  Regression    |  RMSE, MAE    |  Error magnitude|",
      "|  Classification|  F1, AUC-ROC  |  Precision/recall|",
      "|  Clustering    |  Silhouette   |  Cluster quality|",
      "+----------------+---------------+----------------+",
    ],
    question: {
      text: "You build a fraud-detection model for a bank where only 0.1% of transactions are fraudulent. Why is raw accuracy a misleading metric here?",
      options: [
        "Accuracy cannot be calculated for fraud detection",
        "A model that predicts 'not fraud' for every transaction is 99.9% accurate but catches zero fraud — accuracy hides the model's failure on the minority class",
        "Accuracy is only valid for regression tasks, not classification",
        "Accuracy is fine, but the bank prefers F1 for marketing reasons",
      ],
      correctIndex: 1,
      explanation: "On a heavily imbalanced dataset (0.1% fraud), a trivial model that always predicts 'not fraud' achieves 99.9% accuracy but is completely useless — it catches zero fraudulent transactions. Accuracy is dominated by the majority class. Metrics like F1, precision, recall, and AUC-ROC are designed for this: they focus on performance on the minority (positive) class, which is the class you actually care about. This imbalance trap is a frequent AIF-C01 question.",
    },
  },
  {
    stepLabel: "Identify ML use cases on AWS",
    explanation: "Amazon SageMaker is AWS's flagship ML service, covering the full pipeline from labeling to deployment. Review key SageMaker capabilities and common ML use cases.",
    whyItMatters: "AIF-C01 maps business problems to AWS services. Knowing that SageMaker handles custom ML (training your own models) while Bedrock handles generative AI (using foundation models) is the core service-selection distinction tested on the exam.",
    command: "aws sagemaker list-applications --output table",
    prompt: "aiadmin@cli:~$",
    output: [
      "------------------------------------------------",
      "|  SageMaker Feature  |  Pipeline Stage          |",
      "+---------------------+--------------------------+",
      "|  Ground Truth       |  Data labeling           |",
      "|  Training           |  Model training          |",
      "|  Model Registry     |  Version management      |",
      "|  Endpoints          |  Real-time inference     |",
      "|  Batch Transform    |  Batch inference         |",
      "+---------------------+--------------------------+",
    ],
    question: {
      text: "A company wants to train a custom model on its own proprietary customer data for churn prediction. Which AWS service should they use, and why not a generative AI service?",
      options: [
        "Amazon Bedrock — it trains custom models on proprietary data",
        "Amazon SageMaker — it supports full custom ML training on your own data; Bedrock uses pre-trained foundation models for generative tasks, not custom predictive models",
        "Amazon Comprehend — it is the only service that handles customer data",
        "Amazon Rekognition — churn prediction is an image classification task",
      ],
      correctIndex: 1,
      explanation: "Amazon SageMaker is the right choice for training custom predictive models (like churn prediction) on your own data — it gives you control over the algorithm, training, and deployment. Amazon Bedrock is for generative AI using pre-trained foundation models (Claude, Titan, etc.) — you don't train models from scratch with Bedrock, you customize them. Churn prediction is a structured-data classification task, not a generative task, so SageMaker fits.",
    },
  },
];

const intro = {
  overview: "This lab covers AIF-C01 Domain 1: the fundamentals of artificial intelligence and machine learning. You'll explore ML problem types, the ML pipeline lifecycle, training vs. validation loss and overfitting, confusion matrices and evaluation metrics, and AWS SageMaker use cases — all through the AWS CLI.",
  niceCategory: "Fundamentals of AI and ML",
  objectives: [
    "Classify ML problems as supervised, unsupervised, or reinforcement learning",
    "Describe the stages of the ML pipeline lifecycle",
    "Identify overfitting from training and validation loss curves",
    "Interpret a confusion matrix and compute precision and recall",
    "Match evaluation metrics (RMSE, F1, AUC-ROC) to ML task types",
    "Identify AWS SageMaker capabilities for custom ML workflows",
  ],
  outcomes: [
    "Able to classify a business problem into the correct ML category",
    "Understand the iterative nature of the ML pipeline",
    "Can diagnose overfitting from loss curves and apply early stopping",
    "Able to read a confusion matrix and choose precision vs. recall for a use case",
    "Know why accuracy fails on imbalanced datasets and which metrics to use instead",
    "Can distinguish SageMaker (custom ML) from Bedrock (generative AI)",
  ],
  prerequisites: [
    "Basic understanding of what AI and machine learning are (no prior experience required)",
    "Familiarity with a command-line interface is helpful but not required",
  ],
  tools: [
    "AWS CLI — command-line interface for AWS service management",
    "Amazon SageMaker — end-to-end ML platform",
    "ML evaluation concepts — loss curves, confusion matrices, metrics",
  ],
};

export default function LabAifAiMlFundamentals() {
  return (
    <LabRunner
      labTitle="AI & ML Fundamentals"
      chapterNum="1"
      difficulty="Beginner"
      tags={["AWS", "AIF-C01", "ML", "Pipeline", "Overfitting", "Metrics"]}
      terminalLabel="AWS CLI — AI Practitioner Environment"
      duration={45}
      intro={intro}
      steps={steps}
    />
  );
}