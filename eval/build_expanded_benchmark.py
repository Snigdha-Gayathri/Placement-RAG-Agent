"""Phase 1: Build the expanded 65-query benchmark dataset with verified KB ground truth and 70/30 dev/test split.

Features:
- 65 curated queries covering diverse companies, roles, and interview rounds.
- 10 deliberately unanswerable queries (to evaluate abstention and hallucination prevention).
- 10 multi-hop queries (comparing companies, multi-round workflows).
- 5 metadata queries (retrieving by tags, role, interview type).
- 8 conceptual queries (DSA patterns, system design fundamentals).
- 32 single-hop factual/lexical queries.
- Strict 70% dev (45 queries) / 30% test (20 queries) split stratified across categories.
- Dual relevance annotations:
    1. Primary: Company + Topic level relevance
    2. Secondary: Exact Ground-truth Chunk IDs in ChromaDB
- Saves dataset to eval/benchmark_65.json.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
import chromadb

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHROMA_DIR = PROJECT_ROOT / "data" / "chroma_db"
BENCHMARK_OUTPUT = PROJECT_ROOT / "eval" / "benchmark_65.json"

# Connect to ChromaDB to verify existing chunks
client = chromadb.PersistentClient(path=str(CHROMA_DIR))
collection = client.get_collection("placement_rag")
all_chunks = collection.get(include=["metadatas", "documents"])

CHUNKS_BY_COMPANY: dict[str, list[dict[str, Any]]] = {}
CHUNKS_BY_TOPIC: dict[str, list[dict[str, Any]]] = {}

for cid, meta, doc in zip(all_chunks["ids"], all_chunks["metadatas"], all_chunks["documents"]):
    chunk_item = {"chunk_id": cid, "metadata": meta, "document": doc}
    c_name = (meta.get("company") or "General").strip().lower()
    t_name = (meta.get("topic") or "General").strip().lower()

    CHUNKS_BY_COMPANY.setdefault(c_name, []).append(chunk_item)
    CHUNKS_BY_TOPIC.setdefault(t_name, []).append(chunk_item)

def find_chunk_ids(company: str | None, topics: list[str]) -> list[str]:
    """Find chunk IDs matching company and topics."""
    matched = []
    topics_lower = [t.lower() for t in topics]
    
    if company:
        c_low = company.lower()
        # alias map
        aliases = {"meta": ["meta", "facebook"], "amazon": ["amazon", "aws"], "google": ["google", "alphabet"]}
        target_keys = aliases.get(c_low, [c_low])
        
        comp_chunks = []
        for tk in target_keys:
            comp_chunks.extend(CHUNKS_BY_COMPANY.get(tk, []))
            
        for ch in comp_chunks:
            ch_topic = (ch["metadata"].get("topic") or "").lower()
            if any(t in ch_topic or ch_topic in t for t in topics_lower) or not topics:
                matched.append(ch["chunk_id"])
    else:
        for t in topics_lower:
            for ch in CHUNKS_BY_TOPIC.get(t, []):
                matched.append(ch["chunk_id"])
                
    return list(dict.fromkeys(matched))


# Build full specification of 65 queries
QUERIES_SPEC: list[dict[str, Any]] = [
    # ==================== SINGLE-HOP (32 queries: 22 dev, 10 test) ====================
    {
        "id": "single_01",
        "query": "What behavioral interview questions are commonly asked at Amazon, and which Leadership Principles do they test?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Amazon",
        "expected_topics": ["behavioral"],
        "expected_role": "SDE",
        "interview_round": "Behavioral",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Amazon Leadership Principles in behavioral chunks",
    },
    {
        "id": "single_02",
        "query": "What dynamic programming and graph problems frequently appear in Google SDE interviews?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Google",
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Google DP and Graph DSA chunks",
    },
    {
        "id": "single_03",
        "query": "What system design and distributed caching questions are asked at Google?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Google",
        "expected_topics": ["system_design"],
        "expected_role": "SDE",
        "interview_round": "System Design",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Google system design chunks",
    },
    {
        "id": "single_04",
        "query": "What SQL query questions and relational database concepts are asked in Oracle placement rounds?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Oracle",
        "expected_topics": ["sql"],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Oracle SQL interview chunks",
    },
    {
        "id": "single_05",
        "query": "What data structure questions on binary trees and graphs are asked at Microsoft?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Microsoft",
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Microsoft DSA chunks",
    },
    {
        "id": "single_06",
        "query": "What technical interview questions and machine learning topics are asked at OpenAI?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "OpenAI",
        "expected_topics": ["system_design", "ai_ml"],
        "expected_role": "Research Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "OpenAI research engineer chunk",
    },
    {
        "id": "single_07",
        "query": "What topics and rounds are emphasized in Anthropic ML Engineer interviews?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Anthropic",
        "expected_topics": ["system_design", "ai_ml"],
        "expected_role": "Machine Learning Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Anthropic interview intelligence chunk",
    },
    {
        "id": "single_08",
        "query": "What distributed systems, reliability, and Spark questions are asked at Databricks?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Databricks",
        "expected_topics": ["behavioral", "system_design"],
        "expected_role": "SDE",
        "interview_round": "Technical Screen",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Databricks interview chunk",
    },
    {
        "id": "single_09",
        "query": "What GPU architecture, CUDA, or high-performance computing topics are tested at NVIDIA?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "NVIDIA",
        "expected_topics": ["system_design"],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "NVIDIA interview intelligence chunk",
    },
    {
        "id": "single_10",
        "query": "What binary tree and linked list problems are frequently asked at Meta (Facebook)?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Meta",
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Meta / Facebook DSA chunks",
    },
    {
        "id": "single_11",
        "query": "What data structures and algorithm questions are tested in Apple technical rounds?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Apple",
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Screen",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Apple LeetCode DSA chunks",
    },
    {
        "id": "single_12",
        "query": "What system design and scalability questions are tested in Uber software engineering interviews?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Uber",
        "expected_topics": ["system_design", "dsa"],
        "expected_role": "SDE",
        "interview_round": "System Design",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Uber interview chunks",
    },
    {
        "id": "single_13",
        "query": "What technical interview questions are asked at Scale AI for engineering candidates?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Scale AI",
        "expected_topics": ["behavioral", "system_design"],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Scale AI intelligence chunk",
    },
    {
        "id": "single_14",
        "query": "What topics and interview process are reported for Together AI?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Together AI",
        "expected_topics": ["ai_ml"],
        "expected_role": "AI Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Together AI intelligence chunk",
    },
    {
        "id": "single_15",
        "query": "What engineering topics and framework architectures are evaluated in LangChain technical rounds?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "LangChain",
        "expected_topics": ["system_design"],
        "expected_role": "AI Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "LangChain intelligence chunk",
    },
    {
        "id": "single_16",
        "query": "What MLOps and experiment tracking topics are tested at Weights & Biases?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Weights & Biases",
        "expected_topics": ["ai_ml"],
        "expected_role": "ML Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Weights & Biases intelligence chunk",
    },
    {
        "id": "single_17",
        "query": "What legal AI and LLM application design questions are tested at Harvey?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Harvey",
        "expected_topics": ["system_design"],
        "expected_role": "AI Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Harvey intelligence chunk",
    },
    {
        "id": "single_18",
        "query": "What search and retrieval topics are evaluated in Perplexity AI engineering interviews?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Perplexity",
        "expected_topics": ["system_design"],
        "expected_role": "AI Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Perplexity intelligence chunk",
    },
    {
        "id": "single_19",
        "query": "What large-scale distributed training topics are asked at xAI?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "xAI",
        "expected_topics": ["system_design"],
        "expected_role": "AI Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "xAI intelligence chunk",
    },
    {
        "id": "single_20",
        "query": "What development environments and containerization questions are asked at Replit?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Replit",
        "expected_topics": ["system_design"],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Replit intelligence chunk",
    },
    {
        "id": "single_21",
        "query": "What generative video model serving questions are asked at Runway?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Runway",
        "expected_topics": ["ai_ml"],
        "expected_role": "ML Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Runway intelligence chunk",
    },
    {
        "id": "single_22",
        "query": "What enterprise search and indexing questions are asked at Glean?",
        "category": "single-hop",
        "split": "dev",
        "target_company": "Glean",
        "expected_topics": ["system_design"],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Glean intelligence chunk",
    },
    # Single-hop TEST split (10 queries)
    {
        "id": "single_23",
        "query": "What SQL query and database optimization questions are asked at Stripe?",
        "category": "single-hop",
        "split": "test",
        "target_company": "Stripe",
        "expected_topics": ["sql"],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Stripe SQL chunk",
    },
    {
        "id": "single_24",
        "query": "What coding and algorithmic questions are tested in Adobe software engineering interviews?",
        "category": "single-hop",
        "split": "test",
        "target_company": "Adobe",
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Adobe DSA chunks",
    },
    {
        "id": "single_25",
        "query": "What coding questions on array manipulation and sorting are asked at VMware?",
        "category": "single-hop",
        "split": "test",
        "target_company": "VMware",
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "VMware LeetCode DSA chunks",
    },
    {
        "id": "single_26",
        "query": "What data structures and algorithms problems are asked in Walmart Labs technical rounds?",
        "category": "single-hop",
        "split": "test",
        "target_company": "Walmart",
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Walmart Labs LeetCode chunks",
    },
    {
        "id": "single_27",
        "query": "What coding and algorithmic questions are tagged for LinkedIn technical interviews?",
        "category": "single-hop",
        "split": "test",
        "target_company": "LinkedIn",
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "LinkedIn Tagged LeetCode chunks",
    },
    {
        "id": "single_28",
        "query": "What quantitative and algorithmic questions are tagged for Goldman Sachs technical rounds?",
        "category": "single-hop",
        "split": "test",
        "target_company": "Goldman Sachs",
        "expected_topics": ["ai_ml"],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Goldman Sachs chunks",
    },
    {
        "id": "single_29",
        "query": "What technical questions are asked at JP Morgan for software engineering roles?",
        "category": "single-hop",
        "split": "test",
        "target_company": "JP Morgan",
        "expected_topics": ["ai_ml"],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "JP Morgan Tagged chunks",
    },
    {
        "id": "single_30",
        "query": "What behavioral and leadership questions are asked during Directi placement interviews?",
        "category": "single-hop",
        "split": "test",
        "target_company": "Directi",
        "expected_topics": ["behavioral"],
        "expected_role": "SDE",
        "interview_round": "Behavioral",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Directi interview chunks",
    },
    {
        "id": "single_31",
        "query": "What algorithmic questions are asked in Twitter technical coding rounds?",
        "category": "single-hop",
        "split": "test",
        "target_company": "Twitter",
        "expected_topics": ["ai_ml"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Twitter LeetCode chunks",
    },
    {
        "id": "single_32",
        "query": "What data structures and coding problems are tested at Expedia?",
        "category": "single-hop",
        "split": "test",
        "target_company": "Expedia",
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Expedia LeetCode chunk",
    },

    # ==================== MULTI-HOP (10 queries: 7 dev, 3 test) ====================
    {
        "id": "multi_01",
        "query": "Compare the technical interview focus between OpenAI and Anthropic.",
        "category": "multi-hop",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["system_design", "ai_ml"],
        "expected_role": "AI Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Compares OpenAI and Anthropic AI focus",
    },
    {
        "id": "multi_02",
        "query": "How do software engineering interview expectations differ between Amazon and Google?",
        "category": "multi-hop",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["dsa", "system_design", "behavioral"],
        "expected_role": "SDE",
        "interview_round": "Full Loop",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Compares Amazon LP/coding vs Google coding/system design",
    },
    {
        "id": "multi_03",
        "query": "Compare the distributed systems interview questions at Databricks and Snowflake.",
        "category": "multi-hop",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["system_design", "behavioral"],
        "expected_role": "SDE",
        "interview_round": "System Design",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Compares Databricks and Snowflake",
    },
    {
        "id": "multi_04",
        "query": "What are the common inference optimization and serving topics between Together AI and Groq?",
        "category": "multi-hop",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["ai_ml", "system_design"],
        "expected_role": "ML Systems Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Compares Together AI and Groq serving",
    },
    {
        "id": "multi_05",
        "query": "What is the typical sequence of interview rounds at Amazon, and what is tested in each?",
        "category": "multi-hop",
        "split": "dev",
        "target_company": "Amazon",
        "expected_topics": ["dsa", "behavioral", "system_design"],
        "expected_role": "SDE",
        "interview_round": "Full Loop",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Amazon full interview sequence",
    },
    {
        "id": "multi_06",
        "query": "What is the interview process at Google from the technical screen to the on-site rounds?",
        "category": "multi-hop",
        "split": "dev",
        "target_company": "Google",
        "expected_topics": ["dsa", "system_design"],
        "expected_role": "SDE",
        "interview_round": "Full Loop",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Google full interview process",
    },
    {
        "id": "multi_07",
        "query": "Walk me through Microsoft's interview loop, covering both technical coding and behavioral expectations.",
        "category": "multi-hop",
        "split": "dev",
        "target_company": "Microsoft",
        "expected_topics": ["dsa", "behavioral"],
        "expected_role": "SDE",
        "interview_round": "Full Loop",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "Microsoft full interview loop",
    },
    # Multi-hop TEST split (3 queries)
    {
        "id": "multi_08",
        "query": "How does SQL interview preparation differ between Oracle and Stripe?",
        "category": "multi-hop",
        "split": "test",
        "target_company": None,
        "expected_topics": ["sql"],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Compares Oracle vs Stripe SQL",
    },
    {
        "id": "multi_09",
        "query": "Compare behavioral interview expectations at Amazon (Leadership Principles) versus Meta.",
        "category": "multi-hop",
        "split": "test",
        "target_company": None,
        "expected_topics": ["behavioral", "dsa"],
        "expected_role": "SDE",
        "interview_round": "Behavioral",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Compares Amazon LP vs Meta",
    },
    {
        "id": "multi_10",
        "query": "What are the key differences between DSA coding problems tagged for Apple versus Uber?",
        "category": "multi-hop",
        "split": "test",
        "target_company": None,
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Compares Apple vs Uber DSA",
    },

    # ==================== METADATA (5 queries: 3 dev, 2 test) ====================
    {
        "id": "meta_01",
        "query": "Which companies in the repository have tagged LeetCode problems for SDE interviews?",
        "category": "metadata",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "All",
        "should_abstain": False,
        "difficulty": "Easy",
        "notes": "Metadata query for tagged LeetCode companies",
    },
    {
        "id": "meta_02",
        "query": "Which company interview materials specifically cover system design and distributed systems?",
        "category": "metadata",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["system_design"],
        "expected_role": "SDE",
        "interview_round": "System Design",
        "should_abstain": False,
        "difficulty": "Easy",
        "notes": "Metadata query for system design coverage",
    },
    {
        "id": "meta_03",
        "query": "Which companies have interview materials containing SQL and relational database questions?",
        "category": "metadata",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["sql"],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Easy",
        "notes": "Metadata query for SQL coverage",
    },
    # Metadata TEST split (2 queries)
    {
        "id": "meta_04",
        "query": "Which companies in the knowledge base provide dedicated behavioral interview preparation materials?",
        "category": "metadata",
        "split": "test",
        "target_company": None,
        "expected_topics": ["behavioral"],
        "expected_role": "SDE",
        "interview_round": "Behavioral",
        "should_abstain": False,
        "difficulty": "Easy",
        "notes": "Metadata query for behavioral round presence",
    },
    {
        "id": "meta_05",
        "query": "Which companies in the corpus have documents tagged with AI and Machine Learning topics?",
        "category": "metadata",
        "split": "test",
        "target_company": None,
        "expected_topics": ["ai_ml"],
        "expected_role": "ML Engineer",
        "interview_round": "Technical",
        "should_abstain": False,
        "difficulty": "Easy",
        "notes": "Metadata query for AI/ML topic coverage",
    },

    # ==================== CONCEPTUAL (8 queries: 6 dev, 2 test) ====================
    {
        "id": "concept_01",
        "query": "What are the common dynamic programming patterns asked in tech placement interviews?",
        "category": "conceptual",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Conceptual DP patterns in DSA",
    },
    {
        "id": "concept_02",
        "query": "Explain the key distributed systems concepts every candidate should know for system design rounds.",
        "category": "conceptual",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["system_design"],
        "expected_role": "SDE",
        "interview_round": "System Design",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Conceptual distributed systems fundamentals",
    },
    {
        "id": "concept_03",
        "query": "What are the most frequent graph algorithms tested in top tech coding interviews?",
        "category": "conceptual",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Conceptual graph algorithms (BFS, DFS, Dijkstra, TopoSort)",
    },
    {
        "id": "concept_04",
        "query": "How should a candidate approach LRU Cache implementation in a data structures interview?",
        "category": "conceptual",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "LRU cache hashmap + doubly linked list",
    },
    {
        "id": "concept_05",
        "query": "Explain how rate limiting and load balancing algorithms are evaluated in system design interviews.",
        "category": "conceptual",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["system_design"],
        "expected_role": "SDE",
        "interview_round": "System Design",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Rate limiting and load balancing concepts",
    },
    {
        "id": "concept_06",
        "query": "How does the STAR method structure responses for behavioral and leadership interviews?",
        "category": "conceptual",
        "split": "dev",
        "target_company": None,
        "expected_topics": ["behavioral"],
        "expected_role": "SDE",
        "interview_round": "Behavioral",
        "should_abstain": False,
        "difficulty": "Easy",
        "notes": "STAR method principles",
    },
    # Conceptual TEST split (2 queries)
    {
        "id": "concept_07",
        "query": "What are the common Trie and prefix tree problem patterns tested in technical interviews?",
        "category": "conceptual",
        "split": "test",
        "target_company": None,
        "expected_topics": ["dsa"],
        "expected_role": "SDE",
        "interview_round": "Technical Coding",
        "should_abstain": False,
        "difficulty": "Medium",
        "notes": "Trie / Prefix tree conceptual patterns",
    },
    {
        "id": "concept_08",
        "query": "How do interviewers evaluate tradeoffs between SQL ACID transactions and NoSQL eventual consistency in system design?",
        "category": "conceptual",
        "split": "test",
        "target_company": None,
        "expected_topics": ["system_design", "sql"],
        "expected_role": "SDE",
        "interview_round": "System Design",
        "should_abstain": False,
        "difficulty": "Hard",
        "notes": "SQL ACID vs NoSQL eventual consistency tradeoffs",
    },

    # ==================== UNANSWERABLE (10 queries: 7 dev, 3 test) ====================
    {
        "id": "unans_01",
        "query": "What coding questions and interview stages are used at Figma for product engineering?",
        "category": "unanswerable",
        "split": "dev",
        "target_company": "Figma",
        "expected_topics": [],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": True,
        "difficulty": "Medium",
        "notes": "Figma is not in the knowledge base; must abstain.",
    },
    {
        "id": "unans_02",
        "query": "What technical questions are asked during the Kroger data engineering interview?",
        "category": "unanswerable",
        "split": "dev",
        "target_company": "Kroger",
        "expected_topics": [],
        "expected_role": "Data Engineer",
        "interview_round": "Technical",
        "should_abstain": True,
        "difficulty": "Medium",
        "notes": "Kroger is not in the knowledge base; must abstain.",
    },
    {
        "id": "unans_03",
        "query": "What is the interview loop for software engineers at Notion?",
        "category": "unanswerable",
        "split": "dev",
        "target_company": "Notion",
        "expected_topics": [],
        "expected_role": "SDE",
        "interview_round": "Technical",
        "should_abstain": True,
        "difficulty": "Medium",
        "notes": "Notion is not in the knowledge base; must abstain.",
    },
    {
        "id": "unans_04",
        "query": "What quantitative coding questions are asked at Citadel Securities?",
        "category": "unanswerable",
        "split": "dev",
        "target_company": "Citadel",
        "expected_topics": [],
        "expected_role": "Quantitative Engineer",
        "interview_round": "Technical",
        "should_abstain": True,
        "difficulty": "Medium",
        "notes": "Citadel is not in the knowledge base; must abstain.",
    },
    {
        "id": "unans_05",
        "query": "How do you bake a traditional sourdough French baguette with crispy crust?",
        "category": "unanswerable",
        "split": "dev",
        "target_company": None,
        "expected_topics": [],
        "expected_role": None,
        "interview_round": None,
        "should_abstain": True,
        "difficulty": "Easy",
        "notes": "Out of domain recipe question; must abstain.",
    },
    {
        "id": "unans_06",
        "query": "Who won the English Premier League football championship in 2021?",
        "category": "unanswerable",
        "split": "dev",
        "target_company": None,
        "expected_topics": [],
        "expected_role": None,
        "interview_round": None,
        "should_abstain": True,
        "difficulty": "Easy",
        "notes": "Out of domain sports question; must abstain.",
    },
    {
        "id": "unans_07",
        "query": "What is the detailed mathematical proof of the Bell inequality in quantum physics?",
        "category": "unanswerable",
        "split": "dev",
        "target_company": None,
        "expected_topics": [],
        "expected_role": None,
        "interview_round": None,
        "should_abstain": True,
        "difficulty": "Hard",
        "notes": "Out of domain physics proof; must abstain.",
    },
    # Unanswerable TEST split (3 queries)
    {
        "id": "unans_08",
        "query": "What design challenge and portfolio presentation is expected at Canva for frontend roles?",
        "category": "unanswerable",
        "split": "test",
        "target_company": "Canva",
        "expected_topics": [],
        "expected_role": "Frontend Engineer",
        "interview_round": "Portfolio Review",
        "should_abstain": True,
        "difficulty": "Medium",
        "notes": "Canva is not in the knowledge base; must abstain.",
    },
    {
        "id": "unans_09",
        "query": "How do I diagnose and repair a noisy copper water pipe in a home plumbing system?",
        "category": "unanswerable",
        "split": "test",
        "target_company": None,
        "expected_topics": [],
        "expected_role": None,
        "interview_round": None,
        "should_abstain": True,
        "difficulty": "Easy",
        "notes": "Out of domain plumbing question; must abstain.",
    },
    {
        "id": "unans_10",
        "query": "What questions are asked in the Airbnb data science machine learning interview?",
        "category": "unanswerable",
        "split": "test",
        "target_company": "Airbnb",
        "expected_topics": [],
        "expected_role": "Data Scientist",
        "interview_round": "Technical",
        "should_abstain": True,
        "difficulty": "Medium",
        "notes": "Airbnb is not in the knowledge base; must abstain.",
    },
]


def build_and_validate_dataset() -> list[dict[str, Any]]:
    """Build dataset, verify against ChromaDB, attach ground truth chunk IDs."""
    final_dataset = []
    
    dev_count = sum(1 for q in QUERIES_SPEC if q["split"] == "dev")
    test_count = sum(1 for q in QUERIES_SPEC if q["split"] == "test")
    unans_count = sum(1 for q in QUERIES_SPEC if q["should_abstain"])
    multihop_count = sum(1 for q in QUERIES_SPEC if q["category"] == "multi-hop")

    print(f"Total Queries: {len(QUERIES_SPEC)}")
    print(f"Dev Split: {dev_count} ({dev_count / len(QUERIES_SPEC):.1%})")
    print(f"Test Split: {test_count} ({test_count / len(QUERIES_SPEC):.1%})")
    print(f"Unanswerables: {unans_count}")
    print(f"Multi-hop: {multihop_count}")
    
    assert len(QUERIES_SPEC) >= 60, "Must be at least 60 queries!"
    assert unans_count >= 8, "Must have at least 8 unanswerable queries!"
    assert multihop_count >= 8, "Must have at least 8 multi-hop queries!"

    for item in QUERIES_SPEC:
        q_copy = dict(item)
        if item["should_abstain"]:
            q_copy["relevant_chunk_ids"] = []
        else:
            cids = find_chunk_ids(item["target_company"], item["expected_topics"])
            q_copy["relevant_chunk_ids"] = cids
            if not cids:
                print(f"WARNING: No chunks found in ChromaDB for: {item['id']} ({item['target_company']}, {item['expected_topics']})")

        final_dataset.append(q_copy)

    BENCHMARK_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(BENCHMARK_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(final_dataset, f, indent=2)

    print(f"Successfully wrote {len(final_dataset)} validated benchmark queries to {BENCHMARK_OUTPUT}")
    return final_dataset


if __name__ == "__main__":
    build_and_validate_dataset()
