# Idea Generator Job

AI-powered idea generation job for the Idea Fork platform. Uses LangGraph to orchestrate a multi-step pipeline that generates creative product ideas with comprehensive PRDs.

## Overview

This job runs daily to automatically generate 1-3 product ideas. Each idea includes:
- Problem statement
- Proposed solution
- Target users
- 3 key features
- Auto-categorization
- Comprehensive PRD with executive summary, market analysis, user personas, features, tech stack, MVP roadmap, and success metrics

## Architecture

### LangGraph Pipeline

The idea generation uses a Prompt Chaining pattern with four sequential nodes:

```
START -> generate_concept -> expand_prd -> categorize -> save -> END
```

1. **generate_concept**: Creates the core idea (title, problem, solution, target users, key features)
2. **expand_prd**: Expands the concept into a full PRD
3. **categorize**: Assigns appropriate categories from the database
4. **save**: Persists the complete idea to PostgreSQL

### Project Structure

```
jobs/idea-generator/
├── src/
│   ├── __init__.py
│   ├── main.py              # Entry point
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── graph.py         # LangGraph workflow
│   │   ├── nodes.py         # Node functions
│   │   ├── state.py         # State definitions
│   │   └── prompts.py       # LLM prompts
│   ├── scheduler/
│   │   ├── __init__.py
│   │   ├── jobs.py          # Job definitions
│   │   └── config.py        # Scheduler config
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py      # DB connection
│   │   └── repository.py    # CRUD operations
│   └── core/
│       ├── __init__.py
│       ├── config.py        # Environment config
│       └── logging.py       # Logging setup
├── pyproject.toml
├── Dockerfile
└── README.md
```

## Installation

### Requirements

- Python 3.11+
- PostgreSQL 14+
- Anthropic API key

### Setup

```bash
# Navigate to job directory
cd jobs/idea-generator

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -e .

# For development
pip install -e ".[dev]"
```

## Configuration

Set the following environment variables (or create a `.env` file):

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/idea_fork` |
| `ANTHROPIC_API_KEY` | Anthropic API key | (required) |
| `SCHEDULE_HOUR` | Hour to run daily (0-23) | `9` |
| `SCHEDULE_MINUTE` | Minute to run (0-59) | `0` |
| `SCHEDULE_TIMEZONE` | Timezone for scheduler | `UTC` |
| `IDEAS_PER_RUN` | Number of ideas per run | `3` |
| `LLM_MODEL` | Anthropic model to use | `claude-sonnet-4-20250514` |
| `LLM_TEMPERATURE` | Generation temperature | `0.8` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `DEBUG` | Enable debug mode | `false` |

## Usage

### Run with Scheduler (Production)

```bash
# Run the scheduler (default mode)
python -m src.main

# With debug logging
python -m src.main --debug
```

The scheduler will run the job daily at the configured time.

### Run Once (Testing/Manual)

```bash
# Generate default number of ideas
python -m src.main --run-once

# Generate specific number of ideas
python -m src.main --run-once --count 5
```

### Docker

```bash
# Build image
docker build -t idea-generator .

# Run with environment variables
docker run -d \
  --name idea-generator \
  -e DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/idea_fork" \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e SCHEDULE_HOUR=9 \
  -e IDEAS_PER_RUN=3 \
  idea-generator

# Run once (for testing)
docker run --rm \
  -e DATABASE_URL="..." \
  -e ANTHROPIC_API_KEY="..." \
  idea-generator python -m src.main --run-once
```

## Database Schema

The job writes to the existing Idea Fork database:

- **ideas**: Main idea table with title, problem, solution, target_users, key_features, prd_content
- **categories**: Predefined categories (SaaS, AI, E-commerce, etc.)
- **idea_categories**: Junction table for many-to-many relationship

Ideas are created with `is_published=false` by default for review before publishing.

## Error Handling

- Each pipeline node can fail independently
- Errors cause the pipeline to skip remaining nodes
- Failed ideas are logged but don't stop the batch
- Duplicate detection prevents creating similar ideas

## Monitoring

The job uses structured JSON logging in production mode:

```json
{
  "timestamp": "2024-12-21T09:00:00.000Z",
  "level": "INFO",
  "logger": "src.agents.graph",
  "message": "Generated concept: AI-Powered Task Manager"
}
```

Monitor these log patterns:
- `Starting idea generation job`: Job started
- `Successfully generated idea {id}`: Idea saved
- `Failed to generate idea`: Individual failure
- `Idea generation job completed`: Job finished with summary

## Development

### Running Tests

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# With coverage
pytest --cov=src
```

### Linting

```bash
# Run ruff
ruff check src/

# Fix issues
ruff check --fix src/
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check DATABASE_URL is correct
   - Ensure PostgreSQL is running
   - Verify network access

2. **Anthropic API errors**
   - Check ANTHROPIC_API_KEY is set
   - Verify API key is valid
   - Check rate limits

3. **No categories found**
   - Run the database schema.sql to seed categories
   - Check categories table exists

4. **Ideas not appearing**
   - Ideas are created with is_published=false
   - Check the ideas table directly
   - Review logs for errors
