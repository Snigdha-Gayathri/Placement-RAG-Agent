"""Audit the canonical 20 queries against the 357-chunk Chroma corpus.

Identifies the exact relevant chunk IDs, extracts text, assesses evidence
sufficiency, and constructs corpus-grounded reference answers.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.core.vector_store.chroma import ChromaVectorStore

CANONICAL_20_QUERIES = [
    {
        "id": "Q01",
        "query": "What behavioral interview questions are commonly asked at Amazon, and which Leadership Principles do they test?",
        "primary_stress": "hybrid retrieval, company filtering, semantic retrieval, behavioral interview retrieval",
        "category": "Behavioral",
    },
    {
        "id": "Q02",
        "query": "I'm preparing for an Amazon software engineering interview. Give me behavioral questions I should practice, and explain what a strong answer should demonstrate for each.",
        "primary_stress": "dense retrieval, semantic understanding, query transformation, multi-document synthesis",
        "category": "Behavioral",
    },
    {
        "id": "Q03",
        "query": "What technical topics should I prepare for a Google software engineering interview, particularly around data structures and algorithms?",
        "primary_stress": "BM25 + dense retrieval, technical interview retrieval, exact terminology",
        "category": "Technical",
    },
    {
        "id": "Q04",
        "query": "For a Google software engineering interview, what kinds of coding problems and problem-solving skills should I expect across the technical rounds?",
        "primary_stress": "dense retrieval, query rewriting, technical interview synthesis",
        "category": "Technical",
    },
    {
        "id": "Q05",
        "query": "Compare Amazon and Google software engineering interviews in terms of their behavioral and technical interview expectations.",
        "primary_stress": "MULTI-HOP, MULTI-COMPANY, multi-document retrieval, cross-company synthesis",
        "category": "Multi-Company",
    },
    {
        "id": "Q06",
        "query": "What does Amazon's Leadership Principle \"Dive Deep\" mean in an interview context, and what type of behavioral question could be used to evaluate it?",
        "primary_stress": "semantic retrieval, HyDE, concept-to-example retrieval",
        "category": "Behavioral",
    },
    {
        "id": "Q07",
        "query": "I keep seeing questions about ownership in Amazon interviews. What interview questions are associated with this theme, and what evidence from Amazon's interview guidance supports that?",
        "primary_stress": "query rewriting, semantic + lexical retrieval, evidence grounding",
        "category": "Behavioral",
    },
    {
        "id": "Q08",
        "query": "Suppose I am asked a behavioral question about a project that failed during an Amazon interview. Which Leadership Principles could be relevant, and how should I structure my response?",
        "primary_stress": "MULTI-HOP, semantic retrieval, behavioral synthesis, Leadership Principle relationship retrieval",
        "category": "Multi-Hop",
    },
    {
        "id": "Q09",
        "query": "What are the main interview rounds for an Amazon software engineering candidate, and what should I prepare for in each round?",
        "primary_stress": "metadata filtering, multi-hop, interview-process retrieval",
        "category": "Interview Process",
    },
    {
        "id": "Q10",
        "query": "I'm interviewing for an AI/ML role at NVIDIA. What technical areas and interview topics should I prioritize?",
        "primary_stress": "dense retrieval, semantic expansion, role-specific retrieval",
        "category": "Technical",
    },
    {
        "id": "Q11",
        "query": "What kinds of GPU, CUDA, or deep-learning questions might be relevant when preparing for an NVIDIA technical interview?",
        "primary_stress": "BM25, exact technical terminology, lexical retrieval, reranking",
        "category": "Technical",
    },
    {
        "id": "Q12",
        "query": "What behavioral interview topics should I prepare for at NVIDIA, and how do they differ from the technical topics I should study?",
        "primary_stress": "hybrid retrieval, metadata/company filtering, behavioral vs technical separation",
        "category": "Behavioral",
    },
    {
        "id": "Q13",
        "query": "If an interviewer asks me to describe a time I disagreed with a teammate, what company-specific interview expectations should I consider when answering for Amazon?",
        "primary_stress": "HyDE, semantic retrieval, query transformation, company-specific contextualization",
        "category": "Behavioral",
    },
    {
        "id": "Q14",
        "query": "Which Amazon interview questions would require me to discuss measurable impact, and what Leadership Principles are most closely connected to them?",
        "primary_stress": "query rewriting, semantic retrieval, reranking, relationship between questions and principles",
        "category": "Behavioral",
    },
    {
        "id": "Q15",
        "query": "I'm preparing for interviews at multiple companies. How should my preparation differ between Amazon's behavioral interviews and NVIDIA's technical interviews?",
        "primary_stress": "MULTI-HOP, MULTI-COMPANY, cross-domain synthesis, company filtering",
        "category": "Multi-Company",
    },
    {
        "id": "Q16",
        "query": "What interview questions should I practice if I want to demonstrate problem solving, technical depth, and ownership rather than just memorizing coding patterns?",
        "primary_stress": "dense retrieval, semantic retrieval, HyDE/query expansion",
        "category": "Semantic",
    },
    {
        "id": "Q17",
        "query": "Give me examples of technical interview questions where the exact terminology matters, and explain what concepts each question is testing.",
        "primary_stress": "BM25, lexical precision, technical terminology, reranking",
        "category": "Lexical",
    },
    {
        "id": "Q18",
        "query": "If the available interview material does not contain enough evidence to answer a company-specific question, how should the system respond instead of making up an answer?",
        "primary_stress": "EVIDENCE SUFFICIENCY, ABSTENTION, grounding, hallucination prevention",
        "category": "Insufficient Evidence",
    },
    {
        "id": "Q19",
        "query": "What is the difference between preparing for behavioral questions based on company principles and preparing for technical coding questions? Use the interview material in the knowledge base to explain.",
        "primary_stress": "hybrid retrieval, multi-document synthesis, behavioral vs technical distinction",
        "category": "Interview Process",
    },
    {
        "id": "Q20",
        "query": "I have an upcoming software engineering interview and only one week to prepare. Based on the company's interview material in the knowledge base, what should I prioritize across behavioral, technical, and interview-process preparation?",
        "primary_stress": "COMPLEX AGENTIC QUERY, multi-hop, query transformation, hybrid retrieval, evidence synthesis, candidate-oriented answer generation",
        "category": "Multi-Hop",
    },
]


def analyze_queries():
    store = ChromaVectorStore()
    coll = store._collection
    all_data = coll.get()
    ids = all_data["ids"]
    docs = all_data["documents"]
    metas = all_data["metadatas"]
    chunk_map = {cid: (m, d) for cid, m, d in zip(ids, metas, docs)}

    print("=== DETAILED QUERY TO CORPUS ANALYSIS (Q01 to Q10) ===")
    for q in CANONICAL_20_QUERIES[:10]:
        qid = q["id"]
        query = q["query"]
        print(f"\n------------------------------------------------------------")
        print(f"[{qid}] {query}")
        print(f"Primary stress: {q['primary_stress']}")
        print(f"Category: {q['category']}")

        # Determine target companies
        q_lower = query.lower()
        target_comps = []
        for c in ["amazon", "google", "nvidia"]:
            if c in q_lower:
                target_comps.append(c.title())

        # Rank chunks by relevance
        scored = []
        for cid, (m, d) in chunk_map.items():
            doc_lower = d.lower()
            comp = m.get("company", "")
            sf = m.get("source_file", "")
            
            score = 0
            # Company match bonus
            if target_comps:
                if any(tc.lower() == comp.lower() for tc in target_comps):
                    score += 5
                elif comp == "General":
                    score += 1
                else:
                    score -= 5

            # Keyword matching
            words = [w for w in q_lower.replace("'", " ").replace('"', " ").replace("-", " ").split() if len(w) > 3]
            for w in words:
                if w in doc_lower:
                    score += 2
            
            if score > 5:
                scored.append((score, cid, comp, sf, d))

        scored.sort(key=lambda x: x[0], reverse=True)
        print(f"Top matching chunks count: {len(scored)}")
        for sc, cid, comp, sf, d in scored[:2]:
            clean = d.encode("ascii", errors="replace").decode("ascii")[:140].replace("\n", " ")
            print(f"  [{cid[:8]}...] {comp} ({sf}) -> {clean}...")

if __name__ == "__main__":
    analyze_queries()
