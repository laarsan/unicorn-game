# Empirical evidence on prompt engineering is surprisingly mixed

Simple persona prompts like "act as an expert" **do not improve factual accuracy**—this is one of the clearest findings from recent research. However, sophisticated role-play techniques with detailed, task-specific personas can substantially improve reasoning tasks. The broader prompt engineering literature reveals severe brittleness, with minor formatting changes causing accuracy swings of up to **76 percentage points**. The most comprehensive systematic review (1,565 papers analyzed) found that automated prompt optimization can outperform human prompt engineers entirely.

## Generic persona prompts fail on factual tasks

The largest controlled study on persona prompting—testing 162 personas across 4 LLM families (FLAN-T5, Llama-3, Mistral, Qwen2.5) and 2,410 MMLU questions—found that adding personas to system prompts **does not improve performance** compared to no-persona controls. In some cases, personas actively hurt accuracy, particularly with larger models like Llama3-70B. No strategy for selecting optimal personas outperformed random selection.

This finding is reinforced by ExpertPrompting research (Xu et al., 2023), which tested a static "Imagine you are an expert in the regarding field" prompt and found it produced **identical results to vanilla prompting**. The "act as an expert" instruction appears to be largely meaningless to current models when measured on objective benchmarks.

The picture changes substantially for **dynamically generated, detailed personas**. When researchers used GPT-3.5 to create customized expert identities for each specific task—including relevant background, expertise areas, and contextual details—outputs were preferred **48.5% versus 23%** over vanilla responses in GPT-4 evaluation. This suggests specificity and relevance matter far more than the mere presence of a role instruction.

## Role-play prompting works through implicit Chain-of-Thought

The most positive evidence for persona-style prompting comes from "Better Zero-Shot Reasoning with Role-Play Prompting" (Kong et al., 2024), which found dramatic improvements on reasoning benchmarks: Last Letter Concatenation jumped from **23.8% to 84.2%**, and AQuA mathematical reasoning improved from **53.5% to 63.8%**. Crucially, this wasn't simple persona assignment—it involved two-stage immersive role-play that researchers believe acts as an **implicit Chain-of-Thought trigger**, stimulating step-by-step reasoning without explicitly requesting it.

This mechanism helps explain the divergent findings: personas help when they trigger reasoning structures relevant to the task, not by magically accessing "expert knowledge" the model supposedly possesses. Role-play appears most effective for tasks requiring multi-step reasoning where the persona naturally implies a particular problem-solving approach—a "math teacher" persona, for instance, may implicitly activate pedagogical explanation patterns.

## Prompt specificity matters in nuanced ways

Research on prompt detail and constraints reveals a complex picture. **Context and domain specification** can improve relevance: clinical NLP studies found that ROT (Role-Objective-Task) prompting achieved **62.9% consistency** with medical guidelines, rising to **77.5%** for strong recommendations. More specific prompts about narrow topics produced citations linked to real papers, while broad prompts generated completely fabricated references.

However, the relationship between detail and performance is non-linear. The "Few-shot Dilemma" paper (2025) documented an **over-prompting phenomenon**: incorporating excessive domain-specific examples paradoxically degrades performance. Performance escalates to a peak then drops as examples increase. Similarly, "context rot" means that as prompts grow longer, models' ability to accurately recall information decreases—more isn't always better.

**Output format specifications** show perhaps the most actionable effects. Structured format constraints (JSON-mode) cause **10-15% performance degradation** on reasoning tasks but **match or exceed** free-form performance on classification tasks. The critical insight: field ordering matters enormously. Placing "reasoning" before "answer" in JSON structures significantly improves results by allowing the model to work through the problem before committing to an output format.

## How researchers measure prompt effectiveness

The field uses multiple evaluation approaches, each with significant limitations:

- **Standard benchmarks** (MMLU, HumanEval, GSM8K) measure specific capabilities but suffer from data contamination—models may have seen test questions during training—and benchmark saturation, with top models exceeding 90% accuracy
- **Human evaluation** remains the gold standard but is expensive, slow, and shows moderate inter-annotator agreement (κ ≈ 0.17-0.65 depending on task)
- **LLM-as-Judge** (G-Eval framework) achieves ~80% agreement with human preferences and Spearman correlation of **0.514** with human ratings on summarization, but exhibits position bias, verbosity bias, and self-enhancement bias

The most rigorous studies control for these issues through position-switching in pairwise comparisons, ensemble judging, bootstrap resampling for confidence intervals, and calibration against human annotations. However, a survey across 25 metrics found that **no single metric correlates well with human scores** across all desirable criteria for most generation tasks.

## Research consensus on effective techniques

"The Prompt Report" (Schulhoff et al., 2024)—analyzing 1,565 papers using PRISMA systematic review methodology—represents the most comprehensive synthesis available. Key consensus findings include:

- **Few-shot consistently outperforms zero-shot** for complex tasks, but example selection matters critically—performance can vary **30-40%** based on example ordering alone
- **Chain-of-Thought improves reasoning** but only for large models (~100B+ parameters); smaller models produce "illogical yet coherent" chains that hurt performance
- **Self-consistency and ensembling** increase reliability by sampling multiple outputs and selecting via voting or evaluation
- **Structured prompts help**—XML tags, numbered lists, and clear delimiters improve results across models
- **Automatic prompt optimization** (APE, OPRO) consistently outperforms human prompt engineering, achieving **8% gains** on GSM8K and up to **50% absolute improvement** on BIG-Bench Hard tasks

Perhaps most striking: the report found that DSPy's automated techniques "defeated our human prompt engineer." The practical implication is that manual prompt iteration may be less valuable than systematic optimization approaches.

## Known limitations and failure modes demand caution

The most sobering finding across this literature is **extreme prompt brittleness**. Sclar et al. (ICLR 2024) demonstrated that LLMs show **up to 76 accuracy point differences** from subtle formatting changes—extra spaces, colons, or minor paraphrasing. This sensitivity persists even when increasing model size, adding more few-shot examples, or performing instruction tuning. Example ordering alone can swing GPT-3 accuracy on sentiment analysis from **54.3% (near chance) to 93.4% (near state-of-the-art)**.

Persona prompting carries specific risks beyond mere ineffectiveness:

- **Knowledge access alterations**: Models claim lack of knowledge when given unaligned personas despite answering correctly without them (868 documented cases)
- **Over-personalization**: Models refuse neutral queries citing "irrelevance to the persona" (206 cases) or adjust responses to perceived relevance (565 cases)  
- **Motivated reasoning**: Persona-assigned LLMs showed **up to 9% reduced veracity discernment**, with political personas 90% more likely to accept evidence aligned with their induced identity

Prompt techniques are also significantly **model-specific**. Format performance correlates only weakly between models, meaning optimal prompts for GPT-4 may underperform on Claude or Llama. Chain-of-Thought's effectiveness doesn't transfer perfectly across models. The general principles (clarity, examples, structure) transfer, but specific templates, optimal example counts, and persona formulations do not.

## Practical implications from the evidence

The research suggests several evidence-based recommendations. For **factual or objective tasks**, skip simple persona prompts entirely—they provide no measured benefit and may harm accuracy. For **reasoning tasks**, consider sophisticated role-play prompting with detailed, task-specific personas, or simply use explicit Chain-of-Thought instructions with capable models. For **classification tasks**, structured output formats (JSON) are beneficial. For **any high-stakes application**, test multiple prompt variations rather than relying on a single format, since performance ranges matter more than point estimates.

The researchers behind "The Prompt Report" offer an important caveat: "Please note that recommendations here do not generalize to all tasks; in some cases, each of them could hurt performance." This captures the essential humility the evidence demands—prompt engineering remains more empirical craft than settled science, with effects that are task-dependent, model-dependent, and often unpredictable. The strongest evidence-based advice may simply be: **test rigorously and trust nothing unconditionally**.