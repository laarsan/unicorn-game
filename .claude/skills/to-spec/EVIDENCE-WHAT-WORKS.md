# Evidence-based prompt engineering that actually works

**The most effective prompts combine structured frameworks, carefully selected examples, and explicit format specifications—while avoiding common pitfalls that can degrade performance.** Research across Anthropic, OpenAI, and Google reveals clear consensus: specificity beats vagueness, positive instructions outperform negative ones, and systematic iteration trumps "prompt and pray" approaches. This report synthesizes academic research and industry best practices into actionable guidance for building prompts that reliably improve LLM performance.

## Systematic frameworks provide reliable scaffolding

Multiple validated frameworks exist for prompt construction, each optimized for different use cases. The **CO-STAR framework**, which won Singapore's GPT-4 Prompt Engineering Competition in 2023, provides the most comprehensive structure for general-purpose prompting:

- **C**ontext: Background information grounding the scenario
- **O**bjective: The specific task you want performed
- **S**tyle: Writing approach or expert persona to emulate
- **T**one: Emotional character (formal, casual, empathetic)
- **A**udience: Who the response is intended for
- **R**esponse: Exact output format required

This framework appears in AWS Amazon Bedrock's official documentation and has been validated through academic research (arXiv:2510.12637). For technical and analytical tasks, **CRISPE** (Capacity, Role, Insight, Statement, Personality, Experiment) performs better, particularly when you need multiple solution paths. The "Experiment" component explicitly requests variations, making it ideal for exploratory work.

For complex multi-step tasks, **RISEN** (Role, Instructions, Steps, Expectations, Narrowing) excels by breaking work into logical progressions with explicit constraints. A practical template:

```
Role: [Expert persona with specific domain]
Instructions: [Clear directives with actionable verbs]
Steps: [First..., then..., finally...]
Expectations: [Desired outcome description]
Narrowing: [Constraints: word limit, focus areas, exclusions]
```

**APE (Automatic Prompt Engineer)** represents a fundamentally different approach—automated optimization rather than manual templates. Research from Zhou et al. (2022) demonstrated that APE-discovered prompts outperform human-engineered ones: the phrase "Let's work this out in a step by step way to be sure we have the right answer" achieved **82% accuracy** on MultiArith versus 78.7% for the human-designed "Let's think step by step."

## Persona effectiveness depends on specificity and task type

Research definitively shows that **simple "act as expert" personas provide no significant improvement**—and can sometimes hurt performance. The 2024 paper "When 'A Helpful Assistant' Is Not Really Helpful" found that generic role statements like "You are a mathematician" performed nearly identically to no persona at all on accuracy tasks.

However, detailed, automatically-generated personas can substantially improve open-ended tasks. ExpertPrompting research (Xu et al., 2023) identified three criteria for effective personas:

| Criteria | Description | Example |
|----------|-------------|---------|
| **Distinguished** | Customized to each specific instruction | "Specializing in constitutional law" vs "lawyer" |
| **Informative** | Comprehensive background covering all relevant expertise | Include credentials, experience, methodology |
| **Automatic** | LLM-generated personas consistently outperform human-written | Use few-shot prompting to generate personas |

The contrast is stark. An ineffective persona: "You are a physicist." An effective one: "You are a distinguished physicist specializing in atomic structure with 15 years of experience in quantum mechanics research, having published extensively on electron orbital theory and worked at leading research institutions including CERN."

Research indicates optimal personas run **66-108+ words** with specific attributes: professional identity, years and type of experience, domain expertise, relevant credentials, and connection to the specific task. Critically, **avoid claims of perfection** ("You always get problems correct")—these backfire. Use gender-neutral language and direct statements ("You are") rather than hypothetical framing ("Imagine you are").

**When personas help versus hurt:**

Personas significantly improve creative writing, conversational AI, open-ended advice, and establishing behavioral guardrails. They provide minimal benefit—or actively harm—factual Q&A, multiple-choice accuracy, and classification tasks. Notably, as models improve, the gap between persona and base prompting shrinks: GPT-4 shows much smaller persona effects than GPT-3.5.

## Few-shot example selection follows precise principles

Research consensus indicates **2-5 examples** provide the optimal balance—major gains emerge after 2 examples, followed by diminishing returns. Adding more can actually reduce performance if prompts become cluttered. However, reasoning models (o1-series, DeepSeek-R1) often perform better with zero-shot prompts; always test this first.

**Selection strategy matters as much as quantity.** The most effective approach combines similarity and diversity through two steps: first retrieve candidates using embedding similarity (Sentence-BERT), then apply diversity reranking using Maximal Marginal Relevance (MMR). Research from SIGIR 2025 confirms: "Diversifying selected examples leads to consistent improvements in downstream performance."

Example ordering produces dramatic effects—research shows accuracy can vary by **17 percentage points** based solely on order. Key principles:

- Place your best, most critical example **last** (recency effect dominates)
- Progress from simple to complex when possible
- Avoid clustering similar examples together
- Consider similarity-based ordering: anchor highest-similarity example first

**Characteristics of effective examples:**

Good examples are relevant, clear, diverse across categories, consistently formatted, and balanced across output classes. Bad examples cluster too similarly (creating topical bias), overrepresent one class (majority label bias), or contain incorrect mappings. Always include both positive and negative examples when appropriate to show what "bad" output looks like.

For chain-of-thought tasks, include intermediate reasoning steps:
```
Q: [question]
A: [reasoning step 1]. [reasoning step 2]. Therefore, [final answer].
```

## Output format specification requires explicit structure

**Always specify output format explicitly**—missing format specification is one of the most common prompt failures. Research shows putting reasoning BEFORE the final answer significantly improves performance on complex tasks. The seminal Chain-of-Thought paper (Wei et al., 2022) demonstrated 10-40% accuracy improvements on reasoning tasks.

For structured outputs, use JSON schemas with these practices:

- Define schemas using Pydantic/Zod to prevent divergence between code types and schema
- Mark all fields as `required` with `additionalProperties: false` (OpenAI Structured Outputs requirement)
- Add clear field descriptions to guide the model
- Keep schemas simple—10+ nesting levels degrade compliance significantly
- Use API-level enforcement when available (achieves **100% compliance** versus ~35% with prompting alone)

**Critical trade-off:** Research from Humanloop (2024) indicates strict structured formats may reduce LLM reasoning capabilities compared to free-form responses. For tasks requiring deep reasoning, consider placing reasoning in a dedicated field before the answer field, or using YAML comments for embedded thinking.

When to use structured formats (JSON/XML): output feeds into other systems, machine parsing required, consistent structure essential, building agentic tools. When to use free-form: human readability primary, creative/nuanced responses needed, tasks involving explanation or narrative.

## Systematic optimization replaces guesswork

**DSPy** (Stanford NLP) provides the most comprehensive framework for programmatic prompt optimization. Rather than hand-tuning prompts, you define signatures (input/output specifications) and let optimizers tune prompts based on metrics:

```python
import dspy
optimizer = dspy.MIPROv2(metric=dspy.SemanticF1(), auto="medium")
optimized = optimizer.compile(program, trainset=trainset)
```

MIPROv2, the most powerful optimizer, uses three stages: bootstrapping (collecting high-scoring traces), grounded proposal (drafting instruction candidates), and discrete search (Bayesian optimization). Real-world results: RAG agents improved from 24% to 51%; classification tasks from 66% to 87%. Typical optimization costs approximately $2 USD and 10 minutes.

**OPRO (Optimization by PROmpting)** from Google DeepMind takes a different approach—using LLMs as optimizers through natural language. The optimizer LLM generates candidate instructions, a scorer evaluates them, and best solutions inform the next iteration. Results show up to **50% improvement** on Big-Bench Hard tasks, though OPRO requires sufficiently capable models (GPT-4, Gemini-Pro).

For production systems, A/B testing remains essential. Key principles:

- Isolate single variables (prompt OR model OR temperature)
- Use consistent user assignment via hashing
- LLM outputs are high-variance—require larger samples than typical A/B tests
- Don't stop early even if trends appear ("peeking" invalidates results)
- Run A/A tests first to validate infrastructure

**Evaluation metrics by task type:**

| Task | Primary Metrics |
|------|-----------------|
| Classification | Exact match, F1 score |
| Summarization | ROUGE, semantic similarity |
| Generation | LLM-as-judge (G-Eval, faithfulness, coherence) |
| RAG | Context precision, context recall, faithfulness |

## Industry consensus reveals universal principles

Analysis of official documentation from Anthropic, OpenAI, and Google reveals nine points of consensus:

1. **Be specific and clear**—explicit, detailed instructions beat vague requests universally
2. **Use examples (few-shot)**—all labs recommend including input/output demonstrations
3. **Iterate and test**—prompt engineering is experimental, not one-shot
4. **Structure matters**—use delimiters, tags, or formatting to organize components
5. **Context is finite**—don't overwhelm with unnecessary information
6. **Break down complex tasks**—decompose into smaller, manageable prompts
7. **Tell what TO do, not what NOT to do**—positive instructions outperform negative
8. **Specify output format**—explicitly request desired structure
9. **Assign role/persona**—define who the AI should act as (with sufficient detail)

Anthropic emphasizes treating context as a finite "attention budget" and recommends finding the "Goldilocks zone" in system prompts—specific enough to guide behavior, flexible enough for strong heuristics. OpenAI distinguishes between reasoning models (treat as senior coworker, give goals) and standard GPT models (treat as junior coworker, give explicit instructions). Google stresses that effective prompts average around **21 words with relevant context**, yet users typically try fewer than nine.

## Anti-patterns that consistently degrade performance

Research and practitioner experience identify clear failure modes:

**Vagueness and ambiguity:** Using vague prompts, undefined formats, subjective qualifiers ("brief summary" vs "3 sentences"), and non-specific verbs ("improve" vs "reduce word count by 50%") creates the "priming problem" where AI lacks context for relevant responses.

**Structural problems:** Combining multiple unrelated tasks, conflicting instructions ("detailed summary"), and over-engineering with excessive edge cases. One giant prompt doing everything fails; chain prompts for multi-step work.

**Context failures:** Providing too little context, assuming shared domain knowledge, and letting models guess unknown requirements leads to hallucination. Include all necessary details explicitly.

**Process failures:** Not iterating ("first draft rarely optimal"), using outdated techniques (heavy role prompting less necessary with modern models), and skipping systematic testing before deployment.

**The critical negative instruction anti-pattern:**

Bad (negative): "Don't end haikus with a question: Haiku are fun / A short poem / Don't you enjoy them?"

Good (positive): "Always end haikus with an assertion: Haiku are fun / A short poem / A joy to write"

## Practical prompt template

Synthesizing research findings, an effective prompt structure:

```
[ROLE - 66-108 words if needed]
You are a [specific title] with [X] years of experience in [exact domain]. 
Your expertise includes [2-3 specific skills relevant to task]. 
You have [relevant credentials]. Your approach emphasizes [methodology].

[CONTEXT]
[Background information on the specific scenario]

[TASK]
[Single, clear objective with actionable verb]

[EXAMPLES - 2-5 diverse, representative samples]
Input: [example input 1]
Output: [example output 1]

Input: [example input 2]  
Output: [example output 2]

[FORMAT]
Return your response as [exact format specification].
Think through your reasoning step-by-step before providing your final answer.

[CONSTRAINTS]
- [Specific constraint 1]
- [Specific constraint 2]
```

## Conclusion

The evidence points to a clear hierarchy of impact: **task clarity and explicit format specification** provide the largest gains, followed by **well-selected few-shot examples**, then **detailed personas for appropriate tasks**. Automated optimization tools like DSPy and OPRO can discover prompts that outperform human-designed ones, but require sufficient data and compute.

The most important insight may be methodological: treat prompt engineering as experimental science rather than creative writing. Start minimal, test systematically, iterate based on failures, and trust measurements over intuition. As models continue improving, many techniques that once mattered (simple personas, elaborate role-playing) show diminishing returns—but the fundamentals of clarity, specificity, and structured iteration remain foundational.