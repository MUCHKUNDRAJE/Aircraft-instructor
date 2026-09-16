import os
import re
import hashlib

os.environ["HF_HUB_OFFLINE"] = "1"

from langchain_core.tools import tool
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
MANUAL_DIR = os.path.join(BASE_DIR, "manual")
VECTOR_DB_DIR = os.path.join(BASE_DIR, "vector-db")   # now a PARENT dir, one subfolder per manual
IMAGE_HOLDER_DIR = os.path.join(BASE_DIR, "image_holder")

os.makedirs(MANUAL_DIR, exist_ok=True)
os.makedirs(VECTOR_DB_DIR, exist_ok=True)
os.makedirs(IMAGE_HOLDER_DIR, exist_ok=True)

embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-base-en-v1.5",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)

# ---------------------------------------------------------------------------
# STATIC MAPPING: which manual covers which situation.
# This is what the Gemma router reads to decide which DB to search.
# Edit/extend this as you add more manuals.
# ---------------------------------------------------------------------------
MANUAL_REGISTRY = {
    "MANUAL-MOTOR-CFM56": {
        "file": "MANUAL-MOTOR-CFM56.pdf",
        "description": "CFM56 turbofan engine maintenance manual — engine internals, "
                        "oil system, fuel system, engine removal/installation, engine-specific repairs.",
        "two_column": False,
    },
    "FAA-H-8083-31B": {
        "file": "FAA-H-8083-31B.pdf",
        "description": "FAA Aviation Maintenance Technician Handbook - Airframe — structures, "
                        "systems, hydraulics, landing gear, airframe inspection.",
        "two_column": True,
    },
    "amtg_handbook": {
        "file": "amtg_handbook.pdf",
        "description": "Aviation Maintenance Technician General handbook — general aircraft "
                        "science, tools, materials, regulations, basic maintenance practices.",
        "two_column": True,
    },
    "amt_powerplant_handbook": {
        "file": "amt_powerplant_handbook.pdf",
        "description": "Aviation Maintenance Technician Powerplant handbook — engines, "
                        "propellers, lubrication, Reciprocating Engine Induction Systems , ignition, exhaust, powerplant maintenance.",
        "two_column": True,
    },
}

def _sanitize(name: str) -> str:
    return re.sub(r'[^a-zA-Z0-9_-]', '_', name)


def _db_path(manual_key: str) -> str:
    return os.path.join(VECTOR_DB_DIR, _sanitize(manual_key))


def _get_db(manual_key: str) -> Chroma:
    """One persistent Chroma DB per manual, isolated from the others."""
    return Chroma(
        collection_name=_sanitize(manual_key),
        persist_directory=_db_path(manual_key),
        embedding_function=embeddings
    )


def _make_id(pdf_filename: str, page: int, chunk_idx: int, text: str) -> str:
    h = hashlib.md5(text.encode("utf-8")).hexdigest()[:8]
    return f"{pdf_filename}::p{page}::c{chunk_idx}::{h}"


def _manual_key_from_filename(pdf_filename: str) -> str:
    return os.path.splitext(pdf_filename)[0]


@tool
def ingest_pdf_to_vector_db(pdf_filename: str) -> str:
    """
    Loads a PDF from 'manual' dir, chunks it, embeds it, and upserts it into
    its OWN dedicated Chroma DB (one DB per manual, not a shared one).
    Handles both single-column and two-column PDF layouts.
    """
    pdf_path = os.path.join(MANUAL_DIR, pdf_filename)
    manual_key = _manual_key_from_filename(pdf_filename)
    is_two_column = MANUAL_REGISTRY.get(manual_key, {}).get("two_column", False)
    print(f"[LOG] Starting ingestion for: {pdf_filename} -> DB '{manual_key}' "
          f"(two_column={is_two_column})")

    if not os.path.exists(pdf_path):
        return f"Error: File '{pdf_filename}' not found in {MANUAL_DIR}."

    try:
        from pypdf import PdfReader
        from langchain_core.documents import Document

        reader = PdfReader(pdf_path)
        documents = []
        skipped_pages = 0
        total_pages = len(reader.pages)
        pdf_stem = manual_key
        pdf_image_dir = os.path.join(IMAGE_HOLDER_DIR, pdf_stem)
        os.makedirs(pdf_image_dir, exist_ok=True)

        for i, page in enumerate(reader.pages):
            try:
                # --- Images: still via pypdf, layout-independent ---
                saved_images = []
                try:
                    for img in getattr(page, "images", []):
                        img_filename = f"page_{i+1}_{img.name}"
                        img_path = os.path.join(pdf_image_dir, img_filename)
                        with open(img_path, "wb") as img_f:
                            img_f.write(img.data)
                        saved_images.append(f"{pdf_stem}/{img_filename}")
                except Exception as e:
                    print(f"[WARN] Page {i+1}: image extraction issue - {e}")

                # --- Text: column-aware if flagged, else normal pypdf ---
                if is_two_column:
                    try:
                        text = _extract_two_column_text(pdf_path, i)
                        print(f"[LOG] Page {i+1}: two-column extraction used")
                    except Exception as e:
                        print(f"[WARN] Page {i+1}: two-column extraction failed, "
                              f"falling back to pypdf - {e}")
                        try:
                            text = page.extract_text(extraction_mode="layout")
                        except Exception:
                            text = page.extract_text()
                else:
                    try:
                        text = page.extract_text(extraction_mode="layout")
                    except Exception:
                        text = page.extract_text()

                if text and text.strip():
                    text = re.sub(r'\n{3,}', '\n\n', text)
                    metadata = {
                        "source": pdf_path,
                        "source_name": pdf_filename,
                        "manual_key": manual_key,
                        "page": i,
                    }
                    if saved_images:
                        metadata["images"] = ",".join(saved_images)
                    documents.append(Document(page_content=text, metadata=metadata))
                else:
                    print(f"[WARN] Page {i+1}: no readable text found")
            except Exception as e:
                skipped_pages += 1
                print(f"[WARN] Page {i+1}: skipped due to error - {e}")
                continue

        if not documents:
            return f"Error: No text extracted from '{pdf_filename}'."

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=200, add_start_index=True
        )
        chunks = text_splitter.split_documents(documents)

        ids = [
            _make_id(pdf_filename, c.metadata.get("page", 0), idx, c.page_content)
            for idx, c in enumerate(chunks)
        ]

        db = _get_db(manual_key)
        db.add_documents(documents=chunks, ids=ids)

        status_msg = f"Ingested '{pdf_filename}' into DB '{manual_key}': {len(chunks)} chunks upserted."
        if skipped_pages:
            status_msg += f"\n{skipped_pages} pages skipped (extraction errors)."
        print(f"[LOG] {status_msg}")
        return status_msg

    except Exception as e:
        print(f"[ERROR] Ingestion failed: {e}")
        return f"An error occurred during ingestion: {str(e)}"


def _extract_two_column_text(pdf_path: str, page_index: int) -> str:
    """
    Crops the page into left and right halves and extracts each column
    separately, then joins them left-column-first, top-to-bottom —
    the way a human actually reads a two-column layout.
    """
    print(f"[LOG] _extract_two_column_text() called: page_index={page_index}")
    import pdfplumber

    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_index]
        width, height = page.width, page.height
        print(f"[LOG] Page dimensions: {width}x{height}")

        left_bbox = (0, 0, width / 2, height)
        right_bbox = (width / 2, 0, width, height)

        left_crop = page.crop(left_bbox)
        right_crop = page.crop(right_bbox)

        left_text = left_crop.extract_text() or ""
        right_text = right_crop.extract_text() or ""

        combined = left_text.strip()
        if right_text.strip():
            combined += "\n\n" + right_text.strip()
        return combined


@tool
def search_manuals(query: str, manual_key: str) -> str:
    """
    Searches ONLY the specified manual's DB (manual_key must match a key
    in MANUAL_REGISTRY / a manual that has been ingested).
    """
    print(f"[LOG] search_manuals() called: query='{query}', manual_key='{manual_key}'")
    db_path = _db_path(manual_key)
    if not os.path.exists(db_path) or not os.listdir(db_path):
        print(f"[WARN] No ingested data found for manual '{manual_key}'")
        return f"No ingested data found for manual '{manual_key}'."

    try:
        print(f"[LOG] Retrieving DB for manual '{manual_key}'")
        db = _get_db(manual_key)
        print(f"[LOG] Performing similarity search with k=5")
        results = db.similarity_search_with_score(query, k=5)
        if not results:
            print(f"[WARN] No matches found in '{manual_key}'")
            return f"No matches found in '{manual_key}' for query: '{query}'"

        output_lines = []
        for i, (doc, score) in enumerate(results, start=1):
            source = doc.metadata.get("source_name", "Unknown")
            page = doc.metadata.get("page", 0) + 1
            content = doc.page_content.strip()
            images_str = doc.metadata.get("images", "")
            images_display = ""
            if images_str:
                links = []
                for img_name in images_str.split(","):
                    if not img_name.strip():
                        continue
                    clean_name = img_name.strip().replace("\\", "/")
                    img_url = f"http://localhost:8000/images/{clean_name}"
                    links.append(f"![{os.path.basename(clean_name)}]({img_url})")
                images_display = f"\nAssociated Images: {', '.join(links)}"
            print(f"[LOG] Match {i}: score={score:.4f}, source={source}, page={page}")

            output_lines.append(
                f"Match {i} (Distance: {score:.4f} | Source: {source}, Page: {page}){images_display}\n"
                f"---\n{content}\n---\n"
            )
        print(f"[LOG] Returned {len(output_lines)} search results")
        return "\n".join(output_lines)

    except Exception as e:
        print(f"[ERROR] Search failed: {e}")
        return f"An error occurred during search: {str(e)}"


@tool
def list_ingested_manuals() -> str:
    """Lists every manual DB found on disk with its chunk count."""
    print(f"[LOG] list_ingested_manuals() called")
    if not os.path.exists(VECTOR_DB_DIR) or not os.listdir(VECTOR_DB_DIR):
        print(f"[WARN] Vector database directory is empty")
        return "The vector database directory is currently empty."

    lines = []
    for manual_key in os.listdir(VECTOR_DB_DIR):
        db_path = os.path.join(VECTOR_DB_DIR, manual_key)
        if not os.path.isdir(db_path):
            continue
        try:
            db = _get_db(manual_key)
            data = db.get(include=["metadatas"])
            count = len(data["metadatas"])
            lines.append(f"{manual_key}: {count} chunks")
            print(f"[LOG] {manual_key}: {count} chunks")
        except Exception as e:
            print(f"[ERROR] Failed to read DB for {manual_key}: {e}")
            lines.append(f"{manual_key}: error reading DB ({e})")

    result = "\n".join(lines) if lines else "No documents found in any collection."
    print(f"[LOG] Found {len(lines)} manual(s)")
    return result