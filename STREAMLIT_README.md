# 🚀 Aircraft Maintenance System - Streamlit UI

Comprehensive web-based interface for the Aircraft Maintenance System with multi-agent diagnostics, PDF ingestion, and query management.

## Features

✨ **Features:**
- 📚 PDF Manual Ingestion & Vector Database Management
- 🔍 Simple RAG (Retrieval-Augmented Generation) Queries
- 🤖 Multi-Agent Diagnostic Pipeline:
  - Fault Diagnosis
  - Safety & Compliance Verification
  - Predictive Maintenance Analysis
  - Parts Recommendation
  - Digital Twin Status
- 📊 Query History Tracking
- 💾 Report Download (JSON)
- 🎨 Responsive, User-Friendly Dashboard

## Installation

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Ensure Gemma Model is Available

```bash
huggingface-cli download google/gemma-2-2b-it
```

### 3. (Optional) Start Ollama Server

If using Ollama for local LLM inference:
```bash
ollama serve
# In another terminal:
ollama pull gemma:2b
```

## Running the App

### Start Streamlit Server

```bash
streamlit run streamlit_app.py
```

The app will open at: `http://localhost:8501`

## Usage Guide

### 📥 Tab 1: Manual Management (Sidebar)
1. Select a manual from the registry
2. Click "Ingest Selected Manual" to add it to the vector database
3. View list of ingested manuals

### 🔍 Tab 1: Simple Query (RAG)
- Enter a maintenance question
- System routes to appropriate manual
- Retrieves relevant context
- LLM generates concise answer

**Example queries:**
- "How do I replace the engine oil filter?"
- "What are the maintenance procedures for the CFM56 engine?"

### 🤖 Tab 2: Multi-Agent Analysis
- Enter a maintenance issue or fault description
- Optionally customize sensor data and aircraft info
- System runs complete diagnostic pipeline
- View detailed reports across all agents

**Example issues:**
- "Engine #3 temperature is increasing rapidly"
- "Oil pressure dropping below nominal values"

**Features:**
- Real-time pipeline execution visualization
- Color-coded status indicators (Green/Yellow/Red)
- Metrics and detailed findings
- Download full report as JSON

### 📊 Tab 3: Query History
- View all previous queries
- Query type and timestamp
- Clear history as needed

### ℹ️ Tab 4: System Information
- Available manuals in registry
- System status and directories
- Query statistics
- Manual ingestion status

## File Structure

```
Aircraft instructor/
├── streamlit_app.py          # Main Streamlit UI
├── app.py                    # CLI version
├── pdf_tools.py              # PDF ingestion & vector DB
├── gemma_router.py           # Query routing & LLM
├── requirements.txt          # Python dependencies
│
├── agents/
│   ├── orchestrator.py       # Multi-agent pipeline
│   ├── common.py             # LLM call utilities
│   ├── fault_diagnosis_agent.py
│   ├── safety_compliance_agent.py
│   ├── predictive_maintenance_agent.py
│   ├── parts_recommendation_agent.py
│   └── digital_twin_agent.py
│
├── manual/                   # PDF manuals directory
├── vector-db/                # Vector database storage
└── image_holder/             # Extracted images
```

## Logging

All operations are logged with `[LOG]`, `[WARN]`, and `[ERROR]` tags to console output for debugging.

## Tips

💡 **Best Practices:**
1. **Ingest All Manuals First** - Use sidebar to ingest all available manuals before making queries
2. **Be Specific** - Provide detailed maintenance issues for better diagnostic results
3. **Customize Sensors** - Adjust sensor data for more accurate predictive analysis
4. **Review Reports** - Check all agent outputs before taking maintenance action
5. **Download Reports** - Save JSON reports for documentation and compliance

## Troubleshooting

### "No manuals ingested" warning
→ Click "Ingest Selected Manual" in sidebar for each manual

### LLM timeouts
→ Check Ollama server is running: `ollama serve`

### Vector DB errors
→ Ensure vector-db/ directory has proper permissions

### Import errors
→ Reinstall dependencies: `pip install -r requirements.txt --upgrade`

## Performance Notes

- First ingestion takes longer (PDF parsing + embedding)
- Multi-agent pipeline takes ~30-60 seconds per query
- Simple RAG queries are faster (~10-20 seconds)
- Vector DB queries scale linearly with corpus size

## Support

For issues or feature requests, check logs in console output with `[LOG]` tags.
