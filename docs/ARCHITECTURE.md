# CV Tailor AI - Architecture Documentation

## System Overview

CV Tailor AI is an intelligent CV adaptation system that uses Large Language Models (LLMs) to automatically tailor resumes for specific job opportunities while maintaining authenticity and structure.

```
┌─────────────────┐
│   Job Offer     │
│  (URL/File/Text)│
└────────┬────────┘
         │
         ├──────────────────┬─────────────────┬──────────────────┐
         │                  │                 │                  │
         ▼                  ▼                 ▼                  ▼
  ┌─────────────┐   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │   Parse     │   │   Extract    │  │   Extract    │  │  Load Base   │
  │   Offer     │   │   Keywords   │  │   Job Title  │  │     CV       │
  └──────┬──────┘   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                  │                 │                  │
         └──────────────────┴─────────┬───────┴──────────────────┘
                                      │
                                      ▼
                            ┌───────────────────┐
                            │   Adapt CV with   │
                            │   LLM (GPT-4)     │
                            └─────────┬─────────┘
                                      │
                                      ▼
                            ┌───────────────────┐
                            │Remove Watermarks  │
                            └─────────┬─────────┘
                                      │
                                      ▼
                            ┌───────────────────┐
                            │ Validate Structure│
                            │  (shared.css)     │
                            └─────────┬─────────┘
                                      │
                                      ▼
                            ┌───────────────────┐
                            │  Save Adapted CV  │
                            │  + shared.css     │
                            │  + PDF (optional) │
                            └───────────────────┘
```

## Core Components

### 1. Parser Module (`parse_offer.py`)

**Responsibility**: Extract job offer content from various sources

**Functions**:

- `parse_offer_from_url(url)`: Scrapes and cleans web pages
- `parse_offer_from_file(filepath)`: Reads local files

**Dependencies**:

- `requests`: HTTP client
- `beautifulsoup4`: HTML parsing

**Error Handling**:

- Network timeouts
- Invalid URLs
- File not found

### 2. Keyword Extractor (`extract_keywords.py`)

**Responsibility**: Extract structured keywords from job offers using LLM

**Process**:

1. Send job offer text to GPT-4
2. Request structured JSON output
3. Parse and validate response
4. Return categorized keywords

**Output Structure**:

```json
{
  "hard_skills": ["TypeScript", "Testing", "Performance Optimization"],
  "soft_skills": ["Leadership", "Communication", "Collaboration"],
  "technologies": ["React", "Docker", "AWS"],
  "responsibilities": ["Code reviews", "Mentoring", "Architecture"],
  "company_culture": ["Agile", "Remote-first"],
  "synonyms": {
    "Vue_to_React": [
      "component-based architecture",
      "reactive patterns",
      "hooks-style composition API"
    ],
    "general": []
  }
}
```

**LLM Configuration**:

- Model: GPT-4o
- Temperature: 0.7 (balance creativity and consistency)
- Max tokens: 4000

### 3. Title Extractor (`extract_title.py`)

**Responsibility**: Extract and normalize job titles

**Process**:

1. Send job offer to GPT-3.5 (faster, cheaper)
2. Extract job title only
3. Normalize using `slugify`:
   - Lowercase
   - Replace spaces with hyphens
   - Remove accents
   - Remove special characters

**Examples**:

```
"Senior Frontend Developer" → "senior-frontend-developer"
"React + TypeScript Engineer" → "react-typescript-engineer"
"Full Stack Developer (Remote)" → "full-stack-developer-remote"
```

### 4. CV Adapter (`adapt_cv.py`)

**Responsibility**: Rewrite CV content using LLM while preserving structure

**Critical Rules** (Enforced via System Prompt):

1. **Structure Preservation**
   - No HTML tag modification
   - No class/ID changes
   - Only text content rewriting

2. **Company Anonymization**
   - Never mention target company
   - Use generic references

3. **Keyword Integration**
   - Natural incorporation
   - Prioritize hard skills
   - Match terminology

4. **Framework Translation**
   - Handle Vue → React elegantly
   - Emphasize transferable concepts
   - Use specific phrase for React mismatch

5. **Authenticity**
   - No invented experience
   - Keep facts accurate
   - Only reframe existing content

6. **No AI Traces**
   - Avoid generation phrases
   - Natural writing style

**LLM Configuration**:

- Model: GPT-4o
- Temperature: 0.7
- Max tokens: 4000

### 5. Watermark Filter (`watermark_filter.py`)

**Responsibility**: Detect and remove AI-generated traces

**Detection Patterns**:

```python
[
  r"(?i)AI",
  r"(?i)artificial intelligence",
  r"(?i)generated",
  r"(?i)assistant",
  r"(?i)LLM",
  r"(?i)as an AI",
  # ... more patterns
]
```

**Functions**:

- `detect_watermarks(text)`: Find potential traces
- `remove_watermarks(html)`: Clean HTML content
- `validate_no_watermarks(html)`: Verify cleanliness

**Post-processing**:

- Remove matched text
- Clean up extra spaces
- Remove empty paragraphs/list items

### 6. Main Orchestrator (`src/index.ts`)

**Responsibility**: Coordinate the entire workflow

**Command-Line Interface**:

```bash
npm start -- [--text TEXT | --file FILE | --url URL]
             [--base BASE_CV] [--pdf-input PDF_CV]
             [--framework react|vue|agnostic]
             [--output-dir DIR]
             [--html-only]
             [--no-watermark-check]
             [--verbose]
```

`--text`, `--file`, and `--url` are mutually exclusive. `--framework` selects the
framework-emphasis mode used when adapting the CV (default: `agnostic`, which
still stresses general frontend framework experience).

The web app (`web/`, see [WEB.md](WEB.md)) only sends `framework` when the
selected base CV is the default HTML. Blank template and an uploaded HTML file
omit it. `TailorRequest.framework` is optional; the worker must not treat a
missing value as `agnostic`. A value that is not `react`, `vue`, or `agnostic`
is rejected. Omitted means the career-neutral prompts: no
framework-emphasis block, no Vue-to-React exception, and keyword extraction
leaves `synonyms.Vue_to_React` empty.

**Workflow**:

1. Parse arguments
2. Load job offer
3. Extract title and keywords (parallel)
4. Load base CV
5. Adapt CV with LLM
6. Remove watermarks
7. Update HTML title tag
8. Save with auto-generated filename
9. Report success/failure

## Data Flow

### Input Stage

```
Job Offer (URL/File/Text)
  └─> Raw text content
```

### Analysis Stage

```
Raw text
  ├─> Title Extraction (GPT-3.5) ──> Normalized title
  └─> Keyword Extraction (GPT-4) ──> Structured keywords
```

### Adaptation Stage

```
Base CV HTML + Keywords + Title
  └─> LLM Adaptation (GPT-4) ──> Adapted HTML
```

### Cleaning Stage

```
Adapted HTML
  └─> Watermark Removal ──> Clean HTML
```

### Output Stage

```
Clean HTML
  ├─> output/Miguel-Rivero-Lopez-{title}.html  (stylesheet href: shared.css)
  ├─> output/shared.css                        (copied from config.shared_css)
  └─> output/Miguel-Rivero-Lopez-{title}.pdf   (CSS inlined for Puppeteer)
```

PDF output is controlled by `--html-only` and `config.pdf.enabled`.

## Configuration Management

### config.yaml Structure

```yaml
# LLM Settings
model: 'gpt-4o'
temperature: 0.7
max_tokens: 4000

# File Paths
base_cv: 'original/MR_cv_base.html'
shared_css: 'original/shared.css'
fallback_cv: 'original/MR_cv_athenailabs.html'
output_dir: 'output'
offers_dir: 'offers'

# Feature Flags
preserve_structure: true
insert_keywords: true
handle_framework_mismatch: true
remove_ai_traces: true

# PDF output (also skippable via --html-only)
pdf:
  enabled: true
  format: 'A4'
  print_background: true

# Watermark Patterns
watermark_keywords:
  - 'AI'
  - 'generated'
  # ...

# Naming
candidate_name: 'Miguel Rivero López'
```

## Error Handling Strategy

### Graceful Degradation

1. **Network Errors**: Retry with exponential backoff
2. **LLM Errors**: Use fallback prompts or base CV
3. **Parsing Errors**: Log and skip problematic sections
4. **File Errors**: Clear error messages with resolution steps

### Validation Layers

1. **Input Validation**: Check file existence, URL format, OpenAI API key
2. **Base CV Structure**: `validateBaseCvStructure()` — requires `.content` layout, rejects deprecated selectors
3. **JSON Validation**: Parse and validate LLM responses
4. **Post-Adaptation Structure**: Re-validate HTML after LLM rewrite and before save
5. **HTML Normalization**: Force `href="shared.css"` in output
6. **Watermark Validation**: Detect residual traces

## Security Considerations

### API Key Management

- Never commit keys to repository
- Use environment variables
- Support `.env` files

### Content Sanitization

- HTML escaping for user input
- Prevent injection attacks
- Validate URLs before fetching

### Privacy

- No data sent to third parties (except OpenAI)
- Local file processing
- Optional logging controls

## Performance Optimization

### Caching Strategy

- Cache keyword extractions
- Cache base CV loading
- Reuse LLM responses when possible

### Parallel Processing

- Extract title and keywords simultaneously
- Batch multiple CVs if needed

### Token Management

- Monitor OpenAI usage
- Optimize prompt length
- Truncate long job offers intelligently

## Testing Strategy

### Unit Tests

- Individual function testing
- Mock LLM responses
- Edge case coverage

### Integration Tests

- End-to-end workflow
- Real API calls (with test account)
- Output validation

### Manual Testing

- Visual CV review
- Watermark detection
- Structure preservation check

## Deployment Options

### 1. Local CLI

```bash
npm start -- --file job.txt
```

### 2. Antigravity Flow

```
Import cv_tailor_flow.json
→ Visual workflow editor
→ No-code automation
```

### 3. Web Service (Future)

```
FastAPI backend
→ REST endpoints
→ Web UI
```

### 4. CI/CD Pipeline (Future)

```
GitHub Actions
→ Automatic adaptation
→ Email delivery
```

## Extensibility

### Adding New Base CVs

1. Place HTML file in `original/`
2. Update `config.yaml`
3. Test with sample offers

### Adding New Keyword Categories

1. Update `extract_keywords.py` prompt
2. Modify output schema
3. Update adapter prompt
4. Update tests

### Custom Post-Processing

1. Create new module in `src/`
2. Add to `run.py` workflow
3. Update documentation

### Alternative LLM Providers

1. Abstract LLM client interface
2. Add provider-specific implementations
3. Update configuration

## Monitoring and Observability

### Logging

- Structured logging with levels
- Timestamped entries
- Rotation policies

### Metrics

- Adaptation success rate
- LLM token usage
- Processing time
- Watermark detection rate

### Alerting

- API errors
- Watermark detection failures
- Unusual processing times

## Future Enhancements

### Planned Features

1. **Multi-language support**: Spanish, French, German CVs
2. ~~**PDF generation**: Convert HTML to PDF automatically~~ ✅ Implemented (Puppeteer + inlined CSS)
3. **Template system**: Multiple CV styles
4. **Batch processing**: Adapt for multiple jobs simultaneously
5. **Comparison view**: Side-by-side original vs adapted
6. **Success tracking**: Track application outcomes
7. **Learning system**: Improve based on success patterns

### Technical Debt

1. Add comprehensive error recovery
2. Implement response caching
3. Add progress bars for long operations
4. Create web UI
5. Add database for tracking adaptations

## Contributing Guidelines

### Code Style

- PEP 8 compliance
- Type hints
- Docstrings for all functions
- Maximum line length: 100 characters

### Commit Messages

```
feat: Add multi-language support
fix: Resolve watermark detection bug
docs: Update architecture documentation
test: Add unit tests for parser module
```

### Pull Request Process

1. Fork repository
2. Create feature branch
3. Write tests
4. Update documentation
5. Submit PR with description

## License and Attribution

MIT License - See LICENSE file

Uses:

- OpenAI GPT models
- BeautifulSoup for parsing
- Requests for HTTP
- PyYAML for configuration
- python-slugify for normalization
