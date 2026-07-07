import streamlit as st
import os
from datetime import datetime
from pdf_tools import (
    ingest_pdf_to_vector_db,
    search_manuals,
    list_ingested_manuals,
    MANUAL_DIR,
    MANUAL_REGISTRY,
    VECTOR_DB_DIR,
    IMAGE_HOLDER_DIR,
)
from gemma_router import route_query, answer_query
from agents.orchestrator import run_agent_pipeline

# Page config
st.set_page_config(
    page_title="Aircraft Maintenance System",
    page_icon="✈️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
    .metric-card {
        background-color: #f0f2f6;
        padding: 20px;
        border-radius: 10px;
        margin: 10px 0;
    }
    .status-green {
        color: #09ab3b;
        font-weight: bold;
    }
    .status-yellow {
        color: #f0ad4e;
        font-weight: bold;
    }
    .status-red {
        color: #d62728;
        font-weight: bold;
    }
    </style>
""", unsafe_allow_html=True)

# Initialize session state
if "query_history" not in st.session_state:
    st.session_state.query_history = []
if "last_report" not in st.session_state:
    st.session_state.last_report = None

# Sidebar
with st.sidebar:
    st.title("⚙️ Configuration")
    st.divider()
    
    # Manual Management
    st.subheader("📚 Manual Management")
    
    if st.button("🔄 Refresh Manuals List", use_container_width=True):
        st.rerun()
    
    st.divider()
    
    # Ingest new PDF
    st.subheader("📥 Ingest PDF")
    selected_manual = st.selectbox(
        "Select manual to ingest:",
        list(MANUAL_REGISTRY.keys()),
        help="Choose a manual from the registry"
    )
    
    if st.button("Ingest Selected Manual", use_container_width=True):
        with st.spinner(f"Ingesting {MANUAL_REGISTRY[selected_manual]['file']}..."):
            print(f"[LOG] [UI] Ingesting manual: {selected_manual}")
            result = ingest_pdf_to_vector_db.invoke({
                "pdf_filename": MANUAL_REGISTRY[selected_manual]["file"]
            })
            if "Error" not in result:
                st.success(f"✅ {result}")
            else:
                st.error(f"❌ {result}")
    
    st.divider()
    
    # Show ingested manuals
    st.subheader("📋 Ingested Manuals")
    with st.spinner("Loading ingested manuals..."):
        manuals_list = list_ingested_manuals.invoke({})
    
    if manuals_list and "empty" not in manuals_list.lower():
        st.success("✅ Manuals available:")
        st.text(manuals_list)
    else:
        st.warning("⚠️ No manuals ingested yet")

# Main content
st.title("✈️ Aircraft Maintenance System")
st.markdown("Multi-Agent Diagnostic & Maintenance Planning System")
st.divider()

# Create tabs
tab_dashboard, tab1, tab2, tab3, tab4 = st.tabs([
    "📊 Dashboard",
    "🔍 Simple Query (RAG)",
    "🤖 Multi-Agent Analysis",
    "📋 Query History",
    "ℹ️ System Info"
])

# TAB 0: MAIN DASHBOARD
with tab_dashboard:
    st.header("📊 System Dashboard")
    
    # Get system info
    manuals_list = list_ingested_manuals.invoke({})
    ingested_count = len([m for m in manuals_list.split('\n') if m.strip() and ':' in m]) if manuals_list else 0
    total_queries = len(st.session_state.query_history)
    rag_queries = len([q for q in st.session_state.query_history if q['type'] == 'RAG'])
    agent_queries = len([q for q in st.session_state.query_history if q['type'] == 'Multi-Agent'])
    
    # 1. SYSTEM STATUS OVERVIEW
    st.subheader("🟢 System Status Overview")
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric("Ingested Manuals", ingested_count, help="Total manuals in vector database")
    with col2:
        st.metric("Total Queries", total_queries, help="All queries executed this session")
    with col3:
        st.metric("RAG Queries", rag_queries, help="Simple document retrieval queries")
    with col4:
        st.metric("Agent Queries", agent_queries, help="Complex multi-agent analysis")
    with col5:
        st.metric("Manual Registry", len(MANUAL_REGISTRY), help="Total registered manuals")
    
    st.divider()
    
    # 2. LAST ANALYSIS REPORT
    st.subheader("📋 Last Analysis Report")
    
    if st.session_state.last_report:
        last_report = st.session_state.last_report
        
        col1, col2, col3 = st.columns(3)
        
        # Get latest report data
        dt = last_report.get("digital_twin", {})
        fd = last_report.get("fault_diagnosis", {})
        pm = last_report.get("predictive_maintenance", {})
        sc = last_report.get("safety_compliance", {})
        
        status = dt.get('overall_status', 'Unknown')
        
        with col1:
            if status == "Healthy":
                st.success(f"**System Status:**\n✅ {status}")
            elif status == "Monitor":
                st.warning(f"**System Status:**\n⚠️ {status}")
            else:
                st.error(f"**System Status:**\n❌ {status}")
        
        with col2:
            health = pm.get('health_score_percent', 0)
            st.info(f"**Component Health:**\n{health}%")
        
        with col3:
            confidence = fd.get('confidence_percent', 0)
            st.metric("Diagnosis Confidence", f"{confidence}%")
        
        st.divider()
        
        # Report Summary
        st.markdown("**Digital Twin Summary:**")
        st.write(dt.get('twin_summary', 'N/A'))
        
        st.divider()
        
        # Key Issues
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Identified Fault:**")
            st.error(fd.get('probable_fault', 'None identified'))
            
        with col2:
            st.markdown("**Maintenance Needed:**")
            st.success(pm.get('maintenance_recommendation', 'Routine monitoring'))
    else:
        st.info("ℹ️ No analysis reports yet. Run a multi-agent analysis to see results.")
    
    st.divider()
    
    # 3. AVAILABLE MANUALS
    st.subheader("📚 Available Manuals")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.markdown("**Registered Manuals:**")
        manual_list = "\n".join([f"• **{key}**: {meta['description']}" for key, meta in MANUAL_REGISTRY.items()])
        st.markdown(manual_list)
    
    with col2:
        st.markdown("**Ingestion Status:**")
        if manuals_list and "empty" not in manuals_list.lower():
            st.success("✅ Manuals ingested:")
            st.text(manuals_list)
        else:
            st.warning("⚠️ No manuals ingested. Use sidebar to ingest PDFs.")
    
    st.divider()
    
    # 4. QUERY ACTIVITY LOG
    st.subheader("📊 Recent Query Activity")
    
    if st.session_state.query_history:
        # Create expandable query details
        history_display = []
        for i, entry in enumerate(reversed(st.session_state.query_history[-10:]), 1):  # Last 10
            history_display.append({
                "Query #": len(st.session_state.query_history) - i + 1,
                "Query": entry['query'][:50] + "..." if len(entry['query']) > 50 else entry['query'],
                "Type": entry['type'],
                "Status": entry.get('status', 'N/A'),
                "Time": entry['timestamp'].strftime("%H:%M:%S")
            })
        
        # Display as table
        import pandas as pd
        df = pd.DataFrame(history_display)
        st.dataframe(df, use_container_width=True, hide_index=True)
        
        st.divider()
        
        # Query Statistics
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Total Queries", total_queries)
        with col2:
            rag_pct = (rag_queries / total_queries * 100) if total_queries > 0 else 0
            st.metric("RAG %", f"{rag_pct:.1f}%")
        with col3:
            agent_pct = (agent_queries / total_queries * 100) if total_queries > 0 else 0
            st.metric("Agent %", f"{agent_pct:.1f}%")
    else:
        st.info("No query history yet. Start by making a query.")
    
    st.divider()
    
    # 5. QUICK ACTIONS
    st.subheader("⚡ Quick Actions")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("📥 Ingest Manuals", use_container_width=True):
            st.info("👉 Use the sidebar configuration to ingest PDFs")
    
    with col2:
        if st.button("🔍 Go to RAG Query", use_container_width=True):
            st.info("👉 Switch to 'Simple Query' tab above")
    
    with col3:
        if st.button("🤖 Go to Multi-Agent", use_container_width=True):
            st.info("👉 Switch to 'Multi-Agent Analysis' tab above")
    
    st.divider()
    
    # 6. SYSTEM CONFIGURATION
    st.subheader("⚙️ System Configuration")
    
    config_col1, config_col2 = st.columns(2)
    
    with config_col1:
        st.markdown(f"**Manual Directory:**\n`{MANUAL_DIR}`")
        st.markdown(f"**Vector DB Directory:**\n`{VECTOR_DB_DIR}`")
    
    with config_col2:
        st.markdown(f"**Image Directory:**\n`{IMAGE_HOLDER_DIR}`")
        st.markdown(f"**Total Paths:** 3")
    
    print(f"[LOG] [UI] Dashboard displayed - {ingested_count} manuals, {total_queries} total queries")

# Tab 1: Simple RAG Query
with tab1:
    st.header("Simple RAG Search")
    st.markdown("Route to the best manual and retrieve contextual answers")
    
    col1, col2 = st.columns([4, 1])
    with col1:
        query_rag = st.text_input(
            "Enter your maintenance question:",
            placeholder="e.g., How do I replace the engine oil filter?",
            key="rag_query"
        )
    with col2:
        search_button = st.button("Search", use_container_width=True, key="rag_search")
    
    if search_button and query_rag:
        print(f"[LOG] [UI] RAG Query initiated: {query_rag}")
        with st.spinner("🔄 Routing and searching..."):
            try:
                manual_key = route_query(query_rag)
                st.info(f"📖 Routed to manual: **{manual_key}**")
                
                raw_results = search_manuals.invoke({
                    "query": query_rag,
                    "manual_key": manual_key
                })
                
                st.subheader("📚 Retrieved Context")
                st.markdown(raw_results)
                
                print(f"[LOG] [UI] Generating LLM answer...")
                final_answer = answer_query(query_rag, raw_results)
                
                st.subheader("💡 AI Answer")
                st.success(final_answer)
                
                # Add to history
                st.session_state.query_history.append({
                    "timestamp": datetime.now(),
                    "query": query_rag,
                    "type": "RAG",
                    "manual": manual_key
                })
                print(f"[LOG] [UI] RAG Query complete")
                
            except Exception as e:
                st.error(f"❌ Error: {str(e)}")
                print(f"[ERROR] [UI] RAG Query failed: {e}")

# Tab 2: Multi-Agent Analysis
with tab2:
    st.header("🤖 Multi-Agent Diagnostic Pipeline")
    st.markdown("Comprehensive analysis: Fault Diagnosis → Safety → Predictive Maintenance → Parts → Digital Twin")
    
    col1, col2 = st.columns([4, 1])
    with col1:
        query_agents = st.text_area(
            "Enter your maintenance issue:",
            placeholder="e.g., Engine #3 temperature is increasing rapidly",
            key="agent_query",
            height=100
        )
    with col2:
        analyze_button = st.button("Analyze", use_container_width=True, key="agent_analyze")
    
    # Sensor data customization
    with st.expander("🔧 Custom Sensor Data", expanded=False):
        col1, col2, col3 = st.columns(3)
        with col1:
            engine_temp = st.text_input("Engine Temperature", value="640°C (rising)")
            oil_pressure = st.text_input("Oil Pressure", value="42 psi (below nominal)")
            vibration = st.text_input("Vibration", value="2.8 IPS (elevated)")
        with col2:
            fault_codes = st.text_input("Fault Codes", value="none reported")
            maintenance_history = st.text_input("Maintenance History", value="last inspected 120 flight hours ago")
            operating_hours = st.text_input("Operating Hours", value="8400")
        with col3:
            flight_cycles = st.text_input("Flight Cycles", value="3150")
            aircraft_model = st.text_input("Aircraft Model", value="Boeing 737-800")
            engine_model = st.text_input("Engine Model", value="CFM56-7B")
    
    if analyze_button and query_agents:
        print(f"[LOG] [UI] Multi-agent analysis initiated: {query_agents}")
        with st.spinner("🔄 Running multi-agent pipeline..."):
            try:
                sensor_data = {
                    "engine_temp": engine_temp,
                    "oil_pressure": oil_pressure,
                    "vibration": vibration,
                    "fault_codes": fault_codes,
                    "maintenance_history": maintenance_history,
                    "operating_hours": operating_hours,
                    "flight_cycles": flight_cycles,
                }
                
                aircraft_info = {
                    "aircraft_model": aircraft_model,
                    "engine_model": engine_model,
                }
                
                print(f"[LOG] [UI] Calling agent pipeline...")
                report = run_agent_pipeline(query_agents, sensor_data, aircraft_info)
                st.session_state.last_report = report
                
                # Display results as simple markdown
                print(f"[LOG] [UI] Rendering report as markdown...")
                
                # Extract data for easy access
                fd = report["fault_diagnosis"]
                sc = report["safety_compliance"]
                pm = report["predictive_maintenance"]
                pr = report["parts_recommendation"]
                dt = report["digital_twin"]
                
                status = dt.get('overall_status', 'Unknown')
                health = pm.get('health_score_percent', 0)
                confidence = fd.get('confidence_percent', 0)
                rul = pm.get('remaining_useful_life_hours', 0)
                failure_prob = pm.get('failure_probability_percent', 0)
                part_num = pr.get('part_number', 'N/A')
                qty = pr.get('quantity_required', 0)
                safety_status = sc.get('safety_status', 'Unknown')
                
                # Build markdown report
                report_md = f"""
# Analysis Report

**Query:** {query_agents}  
**Manual:** {report['manual_key']}  
**Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---

## System Status

**Overall Status:** {status}  
**Component Health:** {health}%  
**Diagnosis Confidence:** {confidence}%  
**Remaining Useful Life:** {rul} hours

---

## Fault Diagnosis

**Probable Fault:** {fd.get('probable_fault', 'N/A')}

**Affected Component:** {fd.get('affected_component', 'N/A')}

**Root Cause:** {fd.get('root_cause', 'N/A')}

**Confidence Level:** {confidence}%

---

## Predictive Maintenance

**Health Score:** {health}%

**Failure Probability:** {failure_prob}%

**Remaining Useful Life:** {rul} hours

**Maintenance Recommendation:** {pm.get('maintenance_recommendation', 'N/A')}

---

## Safety & Compliance

**Safety Status:** {safety_status}

**Applicable Regulations:**
"""
                
                regs = sc.get('applicable_regulations', [])
                if isinstance(regs, list) and regs:
                    for reg in regs:
                        report_md += f"- {reg}\n"
                else:
                    report_md += "- No specific regulations in available manuals\n"
                
                report_md += f"""
**Warnings:**
"""
                warnings = sc.get('warnings', [])
                if warnings:
                    for warn in (warnings if isinstance(warnings, list) else [warnings]):
                        report_md += f"- {warn}\n"
                else:
                    report_md += "- No critical warnings\n"
                
                report_md += f"""
**Compliance Notes:** {sc.get('compliance_notes', 'N/A')}

---

## Parts Replacement

**Part Number:** {part_num}

**Quantity Required:** {qty}

**Part Description:** {pr.get('part_description', 'N/A')}

**Alternative Parts:**
"""
                
                alts = pr.get('alternative_part_numbers', [])
                if isinstance(alts, list) and alts:
                    for alt in alts:
                        report_md += f"- {alt}\n"
                else:
                    report_md += "- No alternatives available\n"
                
                report_md += f"""
---

## Digital Twin Summary

{dt.get('twin_summary', 'N/A')}

---
"""
                
                # Display markdown with full width padding
                st.markdown("""
                    <style>
                    .main > div {
                        padding-left: 40px !important;
                        padding-right:40px !important;
                    }
                    .block-container {
                        padding-left: 20rem !important;
                        padding-right: 20rem !important;
                        max-width: 100% !important;
                    }
                    </style>
                """, unsafe_allow_html=True)
                
                st.markdown(report_md)
                
                # Export buttons
                st.divider()
                st.subheader("📥 Export Report")
                
                import json
                report_json = json.dumps(report, indent=2, default=str)
                
                col1, col2 = st.columns(2)
                
                with col1:
                    st.download_button(
                        label="📥 Download JSON",
                        data=report_json,
                        file_name=f"aircraft_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                        mime="application/json",
                        use_container_width=True,
                        key="download_report"
                    )
                
                with col2:
                    st.download_button(
                        label="📄 Download Markdown",
                        data=report_md,
                        file_name=f"aircraft_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md",
                        mime="text/markdown",
                        use_container_width=True,
                        key="download_report_md"
                    )
                
                print(f"[LOG] [UI] Multi-agent analysis complete")
                
                # Add to history
                st.session_state.query_history.append({
                    "timestamp": datetime.now(),
                    "query": query_agents,
                    "type": "Multi-Agent",
                    "status": status
                })
                
            except Exception as e:
                st.error(f"❌ Error: {str(e)}")
                print(f"[ERROR] [UI] Multi-agent analysis failed: {e}")
                import traceback
                traceback.print_exc()

# Tab 3: Query History
with tab3:
    st.header("📊 Query History")
    
    if st.session_state.query_history:
        for i, entry in enumerate(reversed(st.session_state.query_history), 1):
            with st.container():
                col1, col2, col3, col4 = st.columns([1, 3, 1, 1])
                with col1:
                    st.caption(f"#{len(st.session_state.query_history) - i + 1}")
                with col2:
                    st.write(f"**{entry['query'][:60]}...**")
                with col3:
                    st.badge(entry['type'])
                with col4:
                    st.caption(entry['timestamp'].strftime("%H:%M:%S"))
            st.divider()
        
        if st.button("🗑️ Clear History"):
            st.session_state.query_history = []
            st.rerun()
    else:
        st.info("No query history yet. Start by making a query above.")

# Tab 4: System Info
with tab4:
    st.header("ℹ️ System Information")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📚 Available Manuals")
        for key, meta in MANUAL_REGISTRY.items():
            st.markdown(f"**{key}**")
            st.caption(meta['description'][:100] + "...")
            st.divider()
    
    with col2:
        st.subheader("⚙️ System Status")
        st.metric("Manual Directory", MANUAL_DIR)
        st.metric("Total Registered Manuals", len(MANUAL_REGISTRY))
        
        # Check if manuals are ingested
        manuals_str = list_ingested_manuals.invoke({})
        ingested_count = len([m for m in manuals_str.split('\n') if m.strip() and ':' in m])
        st.metric("Ingested Manuals", ingested_count)
        
        st.divider()
        st.subheader("🔍 Query Statistics")
        if st.session_state.query_history:
            rag_count = len([q for q in st.session_state.query_history if q['type'] == 'RAG'])
            agent_count = len([q for q in st.session_state.query_history if q['type'] == 'Multi-Agent'])
            st.metric("RAG Queries", rag_count)
            st.metric("Multi-Agent Queries", agent_count)
        else:
            st.text("No queries yet")

# Footer
st.divider()
st.markdown("""
    <div style='text-align: center; color: gray; margin-top: 20px;'>
    <small>Aircraft Maintenance System v1.0 | Multi-Agent Diagnostic Platform</small>
    </div>
""", unsafe_allow_html=True)
