# ✈️ Aircraft Maintenance System

A comprehensive multi-agent diagnostic and maintenance planning system for aircraft using LLMs, vector databases, and intelligent routing.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [File Structure](#file-structure)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Aircraft Maintenance System is an intelligent platform that:
- Ingests aircraft maintenance manuals into a vector database
- Routes queries to the most relevant manual
- Provides RAG-based answers from manual content
- Runs multi-agent diagnostic pipelines for complex analysis
- Generates comprehensive maintenance reports with parts recommendations

**Technology Stack:**
- Python 3.x
- Streamlit (Web UI)
- LangChain (NLP & Document Processing)
- ChromaDB (Vector Database)
- Ollama/Gemma (Local LLM)
- HuggingFace Embeddings

---

## Features

### 🔍 Simple RAG Query
- Route query to the most relevant manual
- Retrieve contextual information
- Get AI-powered answers from manual content

### 🤖 Multi-Agent Analysis
- **Fault Diagnosis Agent**: Identifies probable faults and root causes
- **Safety & Compliance Agent**: Validates safety regulations
- **Predictive Maintenance Agent**: Forecasts component health and RUL
- **Parts Recommendation Agent**: Suggests OEM replacement parts
- **Digital Twin Agent**: Synthesizes all analysis into unified status

### 📊 Dashboard
- System status overview
- Last analysis report summary
- Available manuals list
- Query activity tracking
- Quick statistics

### 📋 Query History
- Track all queries executed
- View query type and timestamp
- Clear history as needed

### 💾 Export Options
- Download JSON report
- Download TXT report
- Full diagnostic data capture

---

## System Architecture

### Component Flow

```
User Query
    ↓
┌─────────────────────────────────┐
│  Query Router (Gemma)           │
│  - Route to best manual         │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  Vector Database (ChromaDB)     │
│  - Semantic search              │
│  - Return top-5 results         │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  LLM Answer Generation          │
│  - Contextual response          │
│  - Manual-based answers         │
└─────────────────────────────────┘
```

### Multi-Agent Pipeline

```
Query + Sensor Data + Aircraft Info
    ↓
┌──────────────────────────┐
│ Fault Diagnosis Agent    │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ Safety & Compliance      │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ Predictive Maintenance   │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ Parts Recommendation     │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ Digital Twin Summary     │
└──────────────────────────┘
    ↓
Comprehensive Report
```

---

## Getting Started

### Installation

1. **Install Dependencies**
```bash
pip install -r requirements.txt
```

2. **Required Packages**
- streamlit
- langchain
- langchain-core
- langchain-text-splitters
- langchain-huggingface
- langchain-community
- chromadb
- pypdf
- pdfplumber
- ollama
- huggingface-hub
- requests

3. **Setup Ollama**
Ensure Ollama is running with Gemma model:
```bash
ollama pull google/gemma-2-2b-it
ollama serve
```

### Running the Application

Start the Streamlit server:
```bash
streamlit run streamlit_app.py
```

The app will open at `http://localhost:8501`

---

## Usage Guide

### Tab 1: Dashboard 📊

**Overview of System:**
- View ingested manuals count
- See total queries executed
- Check last analysis report
- View quick system statistics

**Quick Actions:**
- Ingest manuals
- Navigate to query interfaces
- View system configuration

### Tab 2: Simple Query (RAG) 🔍

**How to Use:**
1. Enter a maintenance question in the text box
2. Click "Search" button
3. System routes to best manual
4. Retrieves relevant context from manual
5. Generates contextual AI answer

**Example Queries:**
- "How do I replace the engine oil filter?"
- "What are the maintenance intervals?"
- "How to inspect the landing gear?"

### Tab 3: Multi-Agent Analysis 🤖

**How to Use:**
1. Enter maintenance issue description
2. (Optional) Customize sensor data in expander:
   - Engine temperature
   - Oil pressure
   - Vibration levels
   - Fault codes
   - Operating hours
   - Aircraft model
   - Engine model
3. Click "Analyze" button
4. System runs full pipeline
5. View comprehensive dashboard report

**Report Sections:**
- System Status Overview
- Fault Diagnosis with root cause
- Predictive Maintenance metrics
- Safety & Compliance check
- Parts Replacement info
- Digital Twin summary
- Export options

### Tab 4: Query History 📋

**Features:**
- View all executed queries (last 10 shown)
- See query type (RAG or Multi-Agent)
- Timestamp of execution
- System status
- Clear history button

### Tab 5: System Info ℹ️

**Information Displayed:**
- Available registered manuals
- Manual descriptions
- System configuration paths
- Query statistics
- Ingested manuals count

### Sidebar Configuration ⚙️

**Manual Management:**
- Refresh manuals list
- Select manual to ingest
- View ingested manuals
- See ingestion status

---

## File Structure

```
c:\AI\Aircraft instructor\
├── app.py                          # CLI version
├── streamlit_app.py                # Web UI (Main)
├── gemma_router.py                 # Query router
├── pdf_tools.py                    # PDF processing
├── requirements.txt                # Python dependencies
├── README.md                       # This file
├── STREAMLIT_README.md             # Streamlit-specific guide
├── manual/                         # Source manuals (PDFs)
├── vector-db/                      # ChromaDB vector stores
├── image_holder/                   # Extracted images
├── agents/
│   ├── orchestrator.py             # Pipeline orchestrator
│   ├── fault_diagnosis_agent.py    # Fault detection
│   ├── safety_compliance_agent.py  # Safety checks
│   ├── predictive_maintenance_agent.py  # RUL prediction
│   ├── parts_recommendation_agent.py    # Parts lookup
│   └── digital_twin_agent.py       # Summary synthesis
```

---

## Configuration

### MANUAL_REGISTRY

Edit `pdf_tools.py` to register new manuals:

```python
MANUAL_REGISTRY = {
    "Boeing737": {
        "file": "Boeing_737_Maintenance_Manual.pdf",
        "description": "Boeing 737 Operations & Maintenance",
        "two_column": True
    },
    "CFM56": {
        "file": "CFM56_Engine_Manual.pdf",
        "description": "CFM56 Engine Maintenance",
        "two_column": False
    }
}
```

### Paths

Core paths defined in `pdf_tools.py`:
```python
MANUAL_DIR = "manual"
VECTOR_DB_DIR = "vector-db"
IMAGE_HOLDER_DIR = "image_holder"
```

---

## Key Concepts

### Vector Database (ChromaDB)

- Stores text chunks from manuals with embeddings
- Enables semantic search
- Per-manual collections for isolation
- Returns top-5 similar results with similarity scores

### Embedding Model

- HuggingFace: `BAAI/bge-base-en-v1.5`
- 1.5 normalized embeddings
- Dimensions: 768
- Optimized for semantic search

### LLM (Gemma)

- Model: `google/gemma-2-2b-it`
- Runs locally via Ollama
- Used for query routing and answer generation
- JSON output parsing for structured responses

---

## Logging

All modules use consistent logging pattern:

```python
[LOG]    - Information logging
[WARN]   - Warning messages
[ERROR]  - Error messages
```

Enable logging to see execution flow:
```bash
streamlit run streamlit_app.py --logger.level=debug
```

---

## Troubleshooting

### Issue: "No manuals ingested yet"

**Solution:**
1. Navigate to sidebar
2. Select a manual from dropdown
3. Click "Ingest Selected Manual"
4. Wait for completion message

### Issue: Vector database not found

**Solution:**
```bash
# Reingest manuals
# Or check that vector-db/ directory exists
mkdir -p vector-db
```

### Issue: Ollama connection error

**Solution:**
```bash
# Ensure Ollama is running
ollama serve

# In another terminal, pull model
ollama pull google/gemma-2-2b-it
```

### Issue: Slow performance with large PDFs

**Solution:**
- Reduce chunk size in `RecursiveCharacterTextSplitter`
- Increase overlap less
- Use fewer search results
- Process manuals in smaller batches

### Issue: Text truncation in display

**Solution:**
- Use Streamlit containers for long text
- Enable text wrapping
- Use expanders for detailed sections
- Break into columns if needed

---

## Performance Tips

1. **First Load**: Initial PDF ingestion may take time due to embedding generation
2. **Query Response**: Semantic search + LLM generation = 2-5 seconds typical
3. **Multi-Agent Pipeline**: Full analysis = 10-15 seconds typical
4. **Vector DB**: ChromaDB persists between sessions - no re-ingestion needed
5. **Memory**: Keep 1-3 manuals per session for optimal performance

---

## Advanced Features

### Two-Column PDF Handling

For PDF manuals with two-column layout:
- Set `two_column: True` in MANUAL_REGISTRY
- System automatically crops left/right columns
- Preserves correct reading order
- Improves text extraction quality

### JSON Report Export

Downloaded report includes:
- Fault diagnosis details
- Safety compliance findings
- Predictive maintenance metrics
- Parts recommendations
- Digital twin status
- Sensor data
- Timestamp and metadata

### Query History Analytics

Track system usage:
- RAG vs Multi-Agent ratio
- Query frequency
- Popular maintenance issues
- System status trends

---

## Support & Maintenance

### Adding New Manuals

1. Place PDF in `manual/` directory
2. Register in `MANUAL_REGISTRY` in `pdf_tools.py`
3. Run ingestion from sidebar
4. Verify in "Ingested Manuals" section

### Updating Agents

Edit agent files in `agents/` directory:
- Modify LLM prompts
- Change business logic
- Add new analysis capabilities
- Update report structure

### Extending System

Potential additions:
- Real-time sensor integration
- SMS/Email alerts
- Database persistence
- Multi-user support
- Advanced analytics dashboard
- Predictive scheduling

---

## Version

**Aircraft Maintenance System v1.0**

Last Updated: 2026-07-07

---

## License

Internal Use Only

---

**For detailed Streamlit-specific information, see [STREAMLIT_README.md](STREAMLIT_README.md)**
