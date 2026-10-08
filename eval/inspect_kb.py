"""Inspect ChromaDB placement_rag collection to discover ground-truth distributions."""
from __future__ import annotations
from collections import Counter, defaultdict
import json
from pathlib import Path
import chromadb

CHROMA_DIR = Path("data/chroma_db").resolve()
client = chromadb.PersistentClient(path=str(CHROMA_DIR))
collection = client.get_collection("placement_rag")

results = collection.get(include=["metadatas", "documents"])
ids = results["ids"]
metas = results["metadatas"]
docs = results["documents"]

print(f"Total chunks in Chroma: {len(ids)}")

company_counts = Counter()
topic_counts = Counter()
company_topics = defaultdict(set)
company_roles = defaultdict(set)
company_rounds = defaultdict(set)

for cid, meta, doc in zip(ids, metas, docs):
    comp = meta.get("company", "Unknown")
    top = meta.get("topic", "General")
    role = meta.get("role", "General")
    rnd = meta.get("interview_round") or meta.get("round_type", "General")

    company_counts[comp] += 1
    topic_counts[top] += 1
    company_topics[comp].add(top)
    if role:
        company_roles[comp].add(role)
    if rnd:
        company_rounds[comp].add(rnd)

print("\nCompanies in ChromaDB:")
for comp, cnt in company_counts.most_common():
    print(f"  {comp:25s}: {cnt:3d} chunks | topics: {list(company_topics[comp])[:5]} | roles: {list(company_roles[comp])[:3]}")

print("\nTop 15 Topics:")
for top, cnt in topic_counts.most_common(15):
    print(f"  {top:30s}: {cnt:3d}")
