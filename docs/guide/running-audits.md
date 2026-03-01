# Running Audits

## Starting an Audit

Navigate to the **Audit** page, enter a URL, and click **Run Audit**. SoberAI will analyze the website through four phases:

### Phase 1: Data Gathering (30% of progress)
Playwright opens the URL and collects:
- Server-side rendering signals (HTML content before/after JS execution)
- Schema.org structured data (JSON-LD, Microdata, RDFa)
- Semantic HTML elements (headings, landmarks, ARIA attributes)
- Content metrics (text-to-HTML ratio, readability, link quality)

### Phase 2: Audit Evaluation (5%)
Each gatherer's data is scored by its corresponding audit module.

### Phase 3: Score Calculation (5%)
Weighted scores are combined into an overall grade.

### Phase 4: AI Recommendations (60%)
The LLM analyzes failing audits and generates actionable recommendations with:
- Priority ranking
- Impact and effort estimates
- Specific code examples
- Explanation of why each recommendation matters

## Viewing Reports

After completion, you'll be redirected to the report detail page. All reports are saved and accessible from the **Reports** page.

### Report Features
- **Score Gauges** - visual circular scores for each category
- **Recommendation Cards** - expandable details with code examples
- **Comparison Data** - how LLM recommendations improve on baseline findings

## Audit Progress

Progress updates stream in real-time via Server-Sent Events. If you navigate away during an audit, you can return and the progress will resume from where it left off (session reconnection).

## Tips

- Ensure the target URL is publicly accessible
- First audits may take longer as Playwright downloads browser binaries
- If Ollama is not running, audits still complete but recommendations use fallback findings
- Audits typically take 15-30 seconds depending on website complexity
