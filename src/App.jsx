import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DeveloperDashboard from "./DeveloperDashboard";
import PipelineProgress from "./PipelineProgress";
import ConversationSidebar from "./ConversationSidebar";
import * as ConversationManager from "./conversationManager";

// ─── Startup Log ─────────────────────────────────────────────────────────────
console.log(
  `%c[Agentic Placement RAG] App loaded — ${new Date().toISOString()}`,
  "color:#1E90FF;font-weight:bold"
);
if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    "[Agentic Placement RAG] VITE_API_BASE_URL is not set. " +
    "Using same-origin API path /api/chat by default."
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getApiBase() {
  let apiBase = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (apiBase && !/^https?:\/\//i.test(apiBase)) {
    apiBase = `https://${apiBase}`;
  }
  return apiBase;
}

function getSessionId() {
  let sid = sessionStorage.getItem("rag_session_id");
  if (!sid) {
    sid = generateUUID();
    sessionStorage.setItem("rag_session_id", sid);
  }
  return sid;
}

// ─── Knowledge Bases ────────────────────────────────────────────────────────
const KNOWLEDGE_BASES = {
  Google: {
    color: "#4285F4",
    icon: "G",
    questions: [
      { q: "How would you design a URL shortening service like bit.ly?", tags: ["system design", "backend"] },
      { q: "Given an integer array, find two numbers that add up to a target sum.", tags: ["algorithms", "arrays"] },
      { q: "Explain the difference between process and thread.", tags: ["OS", "fundamentals"] },
      { q: "How does Google Search index the web?", tags: ["system design", "distributed"] },
      { q: "Design a key-value store with TTL support.", tags: ["system design", "data structures"] },
      { q: "What is the CAP theorem and how does it apply to distributed systems?", tags: ["distributed systems"] },
      { q: "How would you detect a cycle in a linked list?", tags: ["algorithms", "linked list"] },
      { q: "Describe how PageRank algorithm works.", tags: ["algorithms", "graphs"] },
      { q: "How would you implement autocomplete for Google Search?", tags: ["system design", "tries"] },
      { q: "Tell me about a time you had a technical disagreement with a teammate.", tags: ["behavioral"] },
      { q: "Two Sum", tags: ["dsa"] },
      { q: "3Sum", tags: ["dsa"] },
      { q: "Subarray Sum Equals K", tags: ["dsa"] },
      { q: "Product of Array Except Self", tags: ["dsa"] },
      { q: "Two Sum II - Input array is sorted", tags: ["dsa"] },
      { q: "Subarray Sums Divisible by K", tags: ["dsa"] },
      { q: "Insert Interval", tags: ["dsa"] },
      { q: "Merge Intervals", tags: ["dsa"] },
      { q: "Non-overlapping Intervals", tags: ["dsa"] },
      { q: "Meeting Rooms II", tags: ["dsa"] },
      { q: "Minimum Number of Arrows to Burst Balloons", tags: ["dsa"] },
      { q: "Binary Tree Level Order Traversal", tags: ["dsa"] },
      { q: "Binary Tree Zigzag Level Order Traversal", tags: ["dsa"] },
      { q: "Binary Tree Right Side View", tags: ["dsa"] },
      { q: "Lowest Common Ancestor of a Binary Tree", tags: ["dsa"] },
      { q: "Serialize and Deserialize Binary Tree", tags: ["dsa"] },
      { q: "Number of Islands", tags: ["dsa"] },
      { q: "Clone Graph", tags: ["dsa"] },
      { q: "Course Schedule", tags: ["dsa"] },
      { q: "Course Schedule II", tags: ["dsa"] },
      { q: "Accounts Merge", tags: ["dsa"] },
      { q: "Evaluate Division", tags: ["dsa"] },
      { q: "Word Ladder", tags: ["dsa"] },
      { q: "Coin Change", tags: ["dsa"] },
      { q: "Coin Change II", tags: ["dsa"] },
      { q: "Longest Increasing Subsequence", tags: ["dsa"] },
      { q: "Word Break", tags: ["dsa"] },
      { q: "Decode Ways", tags: ["dsa"] },
      { q: "Edit Distance", tags: ["dsa"] },
      { q: "House Robber", tags: ["dsa"] },
      { q: "House Robber II", tags: ["dsa"] },
      { q: "Word Search", tags: ["dsa"] },
      { q: "K Closest Points to Origin", tags: ["dsa"] },
      { q: "Top K Frequent Elements", tags: ["dsa"] },
      { q: "Median of Two Sorted Arrays", tags: ["dsa"] },
      { q: "Regular Expression Matching", tags: ["dsa"] },
      { q: "Wildcard Matching", tags: ["dsa"] },
      { q: "Longest Palindromic Substring", tags: ["dsa"] },
      { q: "Trapping Rain Water", tags: ["dsa"] },
      { q: "Minimum Window Substring", tags: ["dsa"] },
    ],
  },
  Amazon: {
    color: "#FF9900",
    icon: "A",
    questions: [
      { q: "Design Amazon's product recommendation engine.", tags: ["system design", "ML"] },
      { q: "Tell me about a time you had to make a decision with incomplete data.", tags: ["behavioral", "leadership principles"] },
      { q: "How would you design the Amazon warehouse fulfillment system?", tags: ["system design", "logistics"] },
      { q: "Implement LRU Cache from scratch.", tags: ["data structures", "algorithms"] },
      { q: "Describe a situation where you disagreed with your manager.", tags: ["behavioral"] },
      { q: "How would you design a distributed job scheduler?", tags: ["system design", "distributed"] },
      { q: "Find the longest palindromic substring in a string.", tags: ["algorithms", "dynamic programming"] },
      { q: "How does Amazon handle Black Friday traffic spikes?", tags: ["system design", "scalability"] },
      { q: "Tell me about a time you took ownership of a failing project.", tags: ["behavioral", "leadership"] },
      { q: "Design a notification system for 1 billion users.", tags: ["system design", "scale"] },
      { q: "Two Sum", tags: ["dsa"] },
      { q: "Two Sum II", tags: ["dsa"] },
      { q: "Two Sum IV - Input is a BST", tags: ["dsa"] },
      { q: "Three Sum", tags: ["dsa"] },
      { q: "Subarray Sum Equals K", tags: ["dsa"] },
      { q: "Subarrays with K Different Integers", tags: ["dsa"] },
      { q: "Longest Substring Without Repeating Characters", tags: ["dsa"] },
      { q: "Longest Repeating Character Replacement", tags: ["dsa"] },
      { q: "Minimum Window Substring", tags: ["dsa"] },
      { q: "Group Anagrams", tags: ["dsa"] },
      { q: "Valid Parentheses", tags: ["dsa"] },
      { q: "Generate Parentheses", tags: ["dsa"] },
      { q: "Merge Intervals", tags: ["dsa"] },
      { q: "Insert Interval", tags: ["dsa"] },
      { q: "Meeting Rooms II", tags: ["dsa"] },
      { q: "Trapping Rain Water", tags: ["dsa"] },
      { q: "Container With Most Water", tags: ["dsa"] },
      { q: "Best Time to Buy and Sell Stock", tags: ["dsa"] },
      { q: "Best Time to Buy and Sell Stock II", tags: ["dsa"] },
      { q: "Best Time to Buy and Sell Stock with Cooldown", tags: ["dsa"] },
      { q: "Product of Array Except Self", tags: ["dsa"] },
      { q: "Missing Number", tags: ["dsa"] },
      { q: "Find the Duplicate Number", tags: ["dsa"] },
      { q: "Search in Rotated Sorted Array", tags: ["dsa"] },
      { q: "Search a 2D Matrix II", tags: ["dsa"] },
      { q: "Top K Frequent Elements", tags: ["dsa"] },
      { q: "K Closest Points to Origin", tags: ["dsa"] },
      { q: "Kth Largest Element in an Array", tags: ["dsa"] },
      { q: "Task Scheduler", tags: ["dsa"] },
      { q: "LRU Cache", tags: ["dsa"] },
      { q: "Min Stack", tags: ["dsa"] },
      { q: "Binary Tree Level Order Traversal", tags: ["dsa"] },
      { q: "Binary Tree Zigzag Level Order Traversal", tags: ["dsa"] },
      { q: "Binary Tree Right Side View", tags: ["dsa"] },
      { q: "Serialize and Deserialize Binary Tree", tags: ["dsa"] },
      { q: "Lowest Common Ancestor of a Binary Tree", tags: ["dsa"] },
      { q: "Number of Islands", tags: ["dsa"] },
      { q: "Word Ladder", tags: ["dsa"] },
      { q: "Course Schedule", tags: ["dsa"] },
      { q: "Course Schedule II", tags: ["dsa"] },
      { q: "Clone Graph", tags: ["dsa"] },
      { q: "Coin Change", tags: ["dsa"] },
      { q: "Coin Change II", tags: ["dsa"] },
      { q: "Climbing Stairs", tags: ["dsa"] },
      { q: "Decode Ways", tags: ["dsa"] },
      { q: "House Robber", tags: ["dsa"] },
      { q: "House Robber II", tags: ["dsa"] },
    ],
  },
  Microsoft: {
    color: "#00A4EF",
    icon: "M",
    questions: [
      { q: "How would you design Microsoft Teams?", tags: ["system design", "real-time"] },
      { q: "Reverse a linked list iteratively and recursively.", tags: ["algorithms", "linked list"] },
      { q: "What is the difference between abstract class and interface in C#?", tags: ["OOP", "C#"] },
      { q: "Design a real-time collaborative document editor.", tags: ["system design", "CRDT"] },
      { q: "How would you implement Ctrl+Z (undo) functionality?", tags: ["data structures", "design patterns"] },
      { q: "Explain SOLID principles with examples.", tags: ["OOP", "design patterns"] },
      { q: "How does Azure handle multi-region failover?", tags: ["cloud", "distributed systems"] },
      { q: "Find all permutations of a string.", tags: ["algorithms", "recursion"] },
      { q: "How would you design a scalable email system?", tags: ["system design"] },
      { q: "Describe a time you improved a process significantly.", tags: ["behavioral"] },
      { q: "Two Sum", tags: ["dsa"] },
      { q: "3Sum Closest", tags: ["dsa"] },
      { q: "Subarray Sum Equals K", tags: ["dsa"] },
      { q: "Merge Sorted Array", tags: ["dsa"] },
      { q: "Rotate Array", tags: ["dsa"] },
      { q: "Set Matrix Zeroes", tags: ["dsa"] },
      { q: "Search a 2D Matrix", tags: ["dsa"] },
      { q: "Search in Rotated Sorted Array", tags: ["dsa"] },
      { q: "Binary Search in Infinite Array (conceptual)", tags: ["dsa"] },
      { q: "Validate Binary Search Tree", tags: ["dsa"] },
      { q: "Diameter of Binary Tree", tags: ["dsa"] },
      { q: "Balanced Binary Tree", tags: ["dsa"] },
      { q: "Flatten Binary Tree to Linked List", tags: ["dsa"] },
      { q: "Lowest Common Ancestor of a BST", tags: ["dsa"] },
      { q: "Clone Graph", tags: ["dsa"] },
      { q: "Number of Connected Components in an Undirected Graph", tags: ["dsa"] },
      { q: "Number of Islands", tags: ["dsa"] },
      { q: "Rotting Oranges", tags: ["dsa"] },
      { q: "Flood Fill", tags: ["dsa"] },
      { q: "LRU Cache", tags: ["dsa"] },
      { q: "LFU Cache", tags: ["dsa"] },
      { q: "Min Stack", tags: ["dsa"] },
      { q: "Implement Queue using Stacks", tags: ["dsa"] },
      { q: "Design HashMap", tags: ["dsa"] },
      { q: "Design HashSet", tags: ["dsa"] },
      { q: "Kth Largest Element in an Array", tags: ["dsa"] },
      { q: "Top K Frequent Elements", tags: ["dsa"] },
      { q: "Two Sum BST problem", tags: ["dsa"] },
      { q: "Sort Colors", tags: ["dsa"] },
      { q: "Koko Eating Bananas", tags: ["dsa"] },
      { q: "Nth Tribonacci Number", tags: ["dsa"] },
      { q: "K Inverse Pairs Array", tags: ["dsa"] },
    ],
  },
  Meta: {
    color: "#0866FF",
    icon: "fb",
    questions: [
      { q: "Design Facebook's News Feed ranking algorithm.", tags: ["system design", "ML", "ranking"] },
      { q: "How would you detect fake accounts at scale?", tags: ["ML", "trust & safety"] },
      { q: "Find if two binary trees are identical.", tags: ["algorithms", "trees"] },
      { q: "Design Instagram's photo storage and CDN.", tags: ["system design", "storage"] },
      { q: "How does WhatsApp ensure message delivery?", tags: ["system design", "messaging"] },
      { q: "Clone a graph with arbitrary connections.", tags: ["algorithms", "graphs"] },
      { q: "Design a system to count billions of likes in real time.", tags: ["system design", "distributed counters"] },
      { q: "Tell me about a product decision that required data analysis.", tags: ["behavioral", "product"] },
      { q: "How would you A/B test a new feature for 3 billion users?", tags: ["experimentation", "statistics"] },
      { q: "Flatten a nested dictionary.", tags: ["coding", "Python"] },
      { q: "Two Sum", tags: ["dsa"] },
      { q: "Add Two Numbers (Linked List)", tags: ["dsa"] },
      { q: "Merge Two Sorted Lists", tags: ["dsa"] },
      { q: "Merge k Sorted Lists", tags: ["dsa"] },
      { q: "Remove Nth Node From End of List", tags: ["dsa"] },
      { q: "Reverse Linked List", tags: ["dsa"] },
      { q: "Copy List with Random Pointer", tags: ["dsa"] },
      { q: "LRU Cache", tags: ["dsa"] },
      { q: "Min Stack", tags: ["dsa"] },
      { q: "Valid Parentheses", tags: ["dsa"] },
      { q: "Generate Parentheses", tags: ["dsa"] },
      { q: "Longest Valid Parentheses", tags: ["dsa"] },
      { q: "First Non-Repeating Character in a Stream", tags: ["dsa"] },
      { q: "First Non-Repeating Character in a String", tags: ["dsa"] },
      { q: "Group Anagrams", tags: ["dsa"] },
      { q: "Valid Anagram", tags: ["dsa"] },
      { q: "Valid Palindrome", tags: ["dsa"] },
      { q: "Longest Palindromic Substring", tags: ["dsa"] },
      { q: "Longest Substring Without Repeating Characters", tags: ["dsa"] },
      { q: "Minimum Window Substring", tags: ["dsa"] },
      { q: "Word Break", tags: ["dsa"] },
      { q: "Word Ladder", tags: ["dsa"] },
      { q: "Minimum Window Subsequence", tags: ["dsa"] },
      { q: "Number of Islands", tags: ["dsa"] },
      { q: "Clone Graph", tags: ["dsa"] },
      { q: "Course Schedule", tags: ["dsa"] },
      { q: "Course Schedule II", tags: ["dsa"] },
      { q: "Binary Tree Level Order Traversal", tags: ["dsa"] },
      { q: "Binary Tree Right Side View", tags: ["dsa"] },
      { q: "Binary Tree Zigzag Level Order Traversal", tags: ["dsa"] },
      { q: "Binary Tree to DLL", tags: ["dsa"] },
      { q: "Serialize and Deserialize Binary Tree", tags: ["dsa"] },
      { q: "Kth Smallest Element in a BST", tags: ["dsa"] },
      { q: "Top K Frequent Elements", tags: ["dsa"] },
      { q: "Product of Array Except Self", tags: ["dsa"] },
      { q: "Subarray Sum Equals K", tags: ["dsa"] },
      { q: "Count Square Submatrices with All Ones", tags: ["dsa"] },
      { q: "Maximal Square", tags: ["dsa"] },
      { q: "Best Time to Buy and Sell Stock", tags: ["dsa"] },
      { q: "Best Time to Buy and Sell Stock II", tags: ["dsa"] },
    ],
  },
  Netflix: {
    color: "#E50914",
    icon: "N",
    questions: [
      { q: "Design Netflix's video streaming architecture.", tags: ["system design", "streaming", "CDN"] },
      { q: "How does Netflix implement its recommendation system?", tags: ["ML", "recommendations"] },
      { q: "How would you handle 200 million concurrent streams?", tags: ["system design", "scalability"] },
      { q: "Design a chaos engineering framework like Netflix's Chaos Monkey.", tags: ["resilience", "distributed"] },
      { q: "How does Netflix decide what content to produce?", tags: ["data science", "product"] },
      { q: "Implement a rate limiter for API requests.", tags: ["system design", "algorithms"] },
      { q: "How would you design adaptive bitrate streaming?", tags: ["system design", "video"] },
      { q: "Find the most frequently watched category per user.", tags: ["SQL", "data analysis"] },
      { q: "How does Netflix handle multi-region data replication?", tags: ["distributed systems", "Cassandra"] },
      { q: "Tell me about a time you made a high-stakes technical decision.", tags: ["behavioral"] },
      { q: "Two Sum", tags: ["dsa"] },
      { q: "Subarray Sum Equals K", tags: ["dsa"] },
      { q: "Product of Array Except Self", tags: ["dsa"] },
      { q: "Meeting Rooms II", tags: ["dsa"] },
      { q: "Merge Intervals", tags: ["dsa"] },
      { q: "Insert Interval", tags: ["dsa"] },
      { q: "Task Scheduler", tags: ["dsa"] },
      { q: "Task Scheduling with Cooldown style problems", tags: ["dsa"] },
      { q: "Kth Largest Element in an Array", tags: ["dsa"] },
      { q: "K Closest Points to Origin", tags: ["dsa"] },
      { q: "Top K Frequent Elements", tags: ["dsa"] },
      { q: "Longest Substring Without Repeating Characters", tags: ["dsa"] },
      { q: "Minimum Window Substring", tags: ["dsa"] },
      { q: "Median of Two Sorted Arrays", tags: ["dsa"] },
      { q: "LRU Cache", tags: ["dsa"] },
      { q: "Design Rate Limiter (system + DSA)", tags: ["dsa"] },
      { q: "Design Hit Counter", tags: ["dsa"] },
      { q: "Random Pick with Weight", tags: ["dsa"] },
      { q: "Random Pick Index", tags: ["dsa"] },
    ],
  },
  Apple: {
    color: "#555555",
    icon: "",
    questions: [
      { q: "How would you design iCloud's syncing architecture?", tags: ["system design", "sync"] },
      { q: "What makes SwiftUI different from UIKit?", tags: ["iOS", "Swift"] },
      { q: "How does Face ID work under the hood?", tags: ["security", "ML", "hardware"] },
      { q: "Design a battery optimization system for iOS.", tags: ["system design", "mobile", "OS"] },
      { q: "How would you implement end-to-end encryption for iMessage?", tags: ["security", "cryptography"] },
      { q: "Describe the memory management model in Swift (ARC).", tags: ["Swift", "memory management"] },
      { q: "How would you build a privacy-preserving analytics system?", tags: ["privacy", "system design"] },
      { q: "Find duplicates in an array using O(1) space.", tags: ["algorithms", "arrays"] },
      { q: "How does the App Store review process work at scale?", tags: ["system design", "operations"] },
      { q: "Tell me about a time you had to balance user experience vs. performance.", tags: ["behavioral", "product"] },
      { q: "Two Sum", tags: ["dsa"] },
      { q: "3Sum", tags: ["dsa"] },
      { q: "4Sum", tags: ["dsa"] },
      { q: "Subarray Sum Equals K", tags: ["dsa"] },
      { q: "Product of Array Except Self", tags: ["dsa"] },
      { q: "Best Time to Buy and Sell Stock", tags: ["dsa"] },
      { q: "Container With Most Water", tags: ["dsa"] },
      { q: "Trapping Rain Water", tags: ["dsa"] },
      { q: "Merge Intervals", tags: ["dsa"] },
      { q: "Insert Interval", tags: ["dsa"] },
      { q: "Meeting Rooms II", tags: ["dsa"] },
      { q: "Search in Rotated Sorted Array", tags: ["dsa"] },
      { q: "Median of Two Sorted Arrays", tags: ["dsa"] },
      { q: "Longest Substring Without Repeating Characters", tags: ["dsa"] },
      { q: "Minimum Window Substring", tags: ["dsa"] },
      { q: "Group Anagrams", tags: ["dsa"] },
      { q: "Valid Parentheses", tags: ["dsa"] },
      { q: "Generate Parentheses", tags: ["dsa"] },
      { q: "Binary Tree Inorder Traversal", tags: ["dsa"] },
      { q: "Binary Tree Level Order Traversal", tags: ["dsa"] },
      { q: "Lowest Common Ancestor of a Binary Tree", tags: ["dsa"] },
      { q: "Serialize and Deserialize Binary Tree", tags: ["dsa"] },
      { q: "Number of Islands", tags: ["dsa"] },
      { q: "Course Schedule", tags: ["dsa"] },
      { q: "Course Schedule II", tags: ["dsa"] },
      { q: "LRU Cache", tags: ["dsa"] },
    ],
  },
  Flipkart: {
    color: "#2874F0",
    icon: "F",
    questions: [
      { q: "Find Middle of Linked List", tags: ["dsa"] },
      { q: "Detect Loop in Linked List", tags: ["dsa"] },
      { q: "Remove Loop in Linked List", tags: ["dsa"] },
      { q: "Intersection Point of Two Y Shaped Linked Lists", tags: ["dsa"] },
      { q: "Reverse a Linked List in Groups of Given Size", tags: ["dsa"] },
      { q: "Implement Queue using Stacks", tags: ["dsa"] },
      { q: "Implement Stack using Queues", tags: ["dsa"] },
      { q: "LRU Cache (design)", tags: ["dsa"] },
      { q: "Left View of Binary Tree", tags: ["dsa"] },
      { q: "Right View of Binary Tree", tags: ["dsa"] },
      { q: "Top View of Binary Tree", tags: ["dsa"] },
      { q: "Bottom View of Binary Tree", tags: ["dsa"] },
      { q: "Vertical Order Traversal of Binary Tree", tags: ["dsa"] },
      { q: "Maximum Width of Binary Tree", tags: ["dsa"] },
      { q: "Reverse Level Order Traversal", tags: ["dsa"] },
      { q: "Level Order Traversal of Binary Tree", tags: ["dsa"] },
      { q: "Check for Balanced Binary Tree", tags: ["dsa"] },
      { q: "Diameter of Binary Tree", tags: ["dsa"] },
      { q: "Check if Binary Tree is Sum Tree", tags: ["dsa"] },
      { q: "Sum of Dependencies in a Graph", tags: ["dsa"] },
      { q: "Detect Cycle in an Undirected Graph", tags: ["dsa"] },
      { q: "Detect Cycle in a Directed Graph", tags: ["dsa"] },
      { q: "Topological Sort", tags: ["dsa"] },
      { q: "Shortest Path in Directed Acyclic Graph", tags: ["dsa"] },
      { q: "Length of Longest Subarray", tags: ["dsa"] },
      { q: "Length of Smallest Subarray to be Sorted (Length of Unsorted Subarray)", tags: ["dsa"] },
      { q: "Count Pairs with Given Sum", tags: ["dsa"] },
      { q: "Count Triplets with Given Sum", tags: ["dsa"] },
      { q: "Missing Number in Array", tags: ["dsa"] },
      { q: "Find the Duplicate Number", tags: ["dsa"] },
      { q: "Sort an Array of 0s, 1s and 2s", tags: ["dsa"] },
    ],
  },
  Zoho: {
    color: "#E74C3C",
    icon: "Z",
    questions: [
      { q: "Check if a String is Palindrome", tags: ["dsa"] },
      { q: "Remove Vowels from String", tags: ["dsa"] },
      { q: "String Compression (Run Length Encoding)", tags: ["dsa"] },
      { q: "Count Frequency of Characters in String", tags: ["dsa"] },
      { q: "Check Anagram of Strings", tags: ["dsa"] },
      { q: "Reverse Words in a Sentence", tags: ["dsa"] },
      { q: "Find First Non-Repeating Character in String", tags: ["dsa"] },
      { q: "Implement atoi (String to Integer Conversion)", tags: ["dsa"] },
      { q: "Balanced Parentheses Check", tags: ["dsa"] },
      { q: "Infix to Postfix Conversion", tags: ["dsa"] },
      { q: "Evaluate Postfix Expression", tags: ["dsa"] },
      { q: "Implement Stack using Array", tags: ["dsa"] },
      { q: "Implement Queue using Array", tags: ["dsa"] },
      { q: "Implement Circular Queue", tags: ["dsa"] },
      { q: "Check for Prime Numbers in Range", tags: ["dsa"] },
      { q: "Generate Fibonacci Series", tags: ["dsa"] },
      { q: "Find GCD and LCM", tags: ["dsa"] },
      { q: "Find Factorial of a Number (Iterative and Recursive)", tags: ["dsa"] },
      { q: "Binary Search", tags: ["dsa"] },
      { q: "Bubble Sort", tags: ["dsa"] },
      { q: "Selection Sort", tags: ["dsa"] },
      { q: "Insertion Sort", tags: ["dsa"] },
      { q: "Merge Sort", tags: ["dsa"] },
      { q: "Quick Sort", tags: ["dsa"] },
      { q: "Find Missing Number in an Array", tags: ["dsa"] },
      { q: "Find Duplicate Elements in an Array", tags: ["dsa"] },
      { q: "Find Second Largest Element in an Array", tags: ["dsa"] },
      { q: "Matrix Rotation by 90 Degrees", tags: ["dsa"] },
      { q: "Spiral Order Traversal of Matrix", tags: ["dsa"] },
    ],
  },
  NVIDIA: {
    color: "#76B900",
    icon: "N",
    questions: [
      { q: "Two Sum", tags: ["dsa"] },
      { q: "Three Sum", tags: ["dsa"] },
      { q: "Longest Subarray with Sum K (prefix sum + hash map)", tags: ["dsa"] },
      { q: "Subarray Sum Equals K", tags: ["dsa"] },
      { q: "Product of Array Except Self", tags: ["dsa"] },
      { q: "Kth Largest Element in an Array", tags: ["dsa"] },
      { q: "Top K Frequent Elements", tags: ["dsa"] },
      { q: "Meeting Rooms II", tags: ["dsa"] },
      { q: "Merge Intervals", tags: ["dsa"] },
      { q: "Number of Islands", tags: ["dsa"] },
      { q: "Course Schedule", tags: ["dsa"] },
      { q: "Course Schedule II", tags: ["dsa"] },
      { q: "Clone Graph", tags: ["dsa"] },
      { q: "Binary Tree Level Order Traversal", tags: ["dsa"] },
      { q: "Lowest Common Ancestor of a Binary Tree", tags: ["dsa"] },
      { q: "Serialize and Deserialize Binary Tree", tags: ["dsa"] },
      { q: "LRU Cache", tags: ["dsa"] },
      { q: "Min Stack", tags: ["dsa"] },
      { q: "Implement Blocking Queue / Producer-Consumer (DS + concurrency flavor)", tags: ["dsa"] },
    ],
  },
  TCS: {
    color: "#0070C0",
    icon: "T",
    questions: [
      { q: "Check Palindrome (String)", tags: ["dsa"] },
      { q: "Reverse a String", tags: ["dsa"] },
      { q: "Check Anagram", tags: ["dsa"] },
      { q: "Count Vowels and Consonants in String", tags: ["dsa"] },
      { q: "Find Factorial of Number", tags: ["dsa"] },
      { q: "Check Prime Number", tags: ["dsa"] },
      { q: "Fibonacci Series", tags: ["dsa"] },
      { q: "Armstrong Number", tags: ["dsa"] },
      { q: "Strong Number", tags: ["dsa"] },
      { q: "Binary Search", tags: ["dsa"] },
      { q: "Linear Search", tags: ["dsa"] },
      { q: "Bubble Sort", tags: ["dsa"] },
      { q: "Selection Sort", tags: ["dsa"] },
      { q: "Insertion Sort", tags: ["dsa"] },
      { q: "Merge Sort (basic)", tags: ["dsa"] },
      { q: "Quick Sort (basic)", tags: ["dsa"] },
      { q: "Find Largest and Smallest in Array", tags: ["dsa"] },
      { q: "Find Second Largest in Array", tags: ["dsa"] },
      { q: "Sum of Elements of Array", tags: ["dsa"] },
      { q: "Reverse an Array", tags: ["dsa"] },
      { q: "Rotate Array by k Positions", tags: ["dsa"] },
      { q: "Check if Array is Sorted", tags: ["dsa"] },
      { q: "Matrix Addition", tags: ["dsa"] },
      { q: "Matrix Multiplication", tags: ["dsa"] },
      { q: "Transpose of Matrix", tags: ["dsa"] },
    ],
  },
  Infosys: {
    color: "#0F9D58",
    icon: "I",
    questions: [
      { q: "Reverse String", tags: ["dsa"] },
      { q: "Check Palindrome String", tags: ["dsa"] },
      { q: "Check Anagram", tags: ["dsa"] },
      { q: "Find Non-Repeating Character in String", tags: ["dsa"] },
      { q: "Count Words in Sentence", tags: ["dsa"] },
      { q: "Remove Duplicate Characters in String", tags: ["dsa"] },
      { q: "Reverse Words in a Sentence", tags: ["dsa"] },
      { q: "Binary Search", tags: ["dsa"] },
      { q: "Linear Search", tags: ["dsa"] },
      { q: "Bubble Sort", tags: ["dsa"] },
      { q: "Selection Sort", tags: ["dsa"] },
      { q: "Insertion Sort", tags: ["dsa"] },
      { q: "Find Largest and Second Largest Element in Array", tags: ["dsa"] },
      { q: "Rotate Array by k", tags: ["dsa"] },
      { q: "Check if Array is Sorted", tags: ["dsa"] },
      { q: "Matrix Diagonal Sum", tags: ["dsa"] },
      { q: "Spiral Traversal of Matrix", tags: ["dsa"] },
      { q: "Check Armstrong Number", tags: ["dsa"] },
      { q: "Check Strong Number", tags: ["dsa"] },
      { q: "Fibonacci Series using Recursion", tags: ["dsa"] },
    ],
  },
  Capgemini: {
    color: "#2E5BFF",
    icon: "C",
    questions: [
      { q: "Reverse a String", tags: ["dsa"] },
      { q: "Check Palindrome String", tags: ["dsa"] },
      { q: "Count Frequency of Each Character in a String", tags: ["dsa"] },
      { q: "Check Anagram of Two Strings", tags: ["dsa"] },
      { q: "Remove Duplicates from String", tags: ["dsa"] },
      { q: "Binary Search", tags: ["dsa"] },
      { q: "Bubble Sort", tags: ["dsa"] },
      { q: "Selection Sort", tags: ["dsa"] },
      { q: "Insertion Sort", tags: ["dsa"] },
      { q: "Find Largest and Second Largest in Array", tags: ["dsa"] },
      { q: "Find Missing Number in Sequence", tags: ["dsa"] },
      { q: "Rotate Array", tags: ["dsa"] },
      { q: "Check if Two Arrays are Equal", tags: ["dsa"] },
      { q: "Count Pairs with Given Sum in Array", tags: ["dsa"] },
      { q: "Reverse a Linked List", tags: ["dsa"] },
      { q: "Detect Loop in Linked List", tags: ["dsa"] },
    ],
  },
  Cognizant: {
    color: "#1B75BC",
    icon: "C",
    questions: [
      { q: "Reverse a String", tags: ["dsa"] },
      { q: "Check Palindrome String", tags: ["dsa"] },
      { q: "Count Vowels and Consonants", tags: ["dsa"] },
      { q: "Check Anagram", tags: ["dsa"] },
      { q: "Remove Spaces in String", tags: ["dsa"] },
      { q: "Binary Search", tags: ["dsa"] },
      { q: "Linear Search", tags: ["dsa"] },
      { q: "Bubble Sort", tags: ["dsa"] },
      { q: "Selection Sort", tags: ["dsa"] },
      { q: "Insertion Sort", tags: ["dsa"] },
      { q: "Find Largest, Smallest, Second Largest in Array", tags: ["dsa"] },
      { q: "Rotate Array", tags: ["dsa"] },
      { q: "Check for Duplicate Elements in Array", tags: ["dsa"] },
      { q: "Sum of Diagonals in Matrix", tags: ["dsa"] },
      { q: "Transpose of Matrix", tags: ["dsa"] },
    ],
  },
  Accenture: {
    color: "#A100FF",
    icon: "A",
    questions: [
      { q: "Reverse String", tags: ["dsa"] },
      { q: "Check Palindrome", tags: ["dsa"] },
      { q: "Check Anagram", tags: ["dsa"] },
      { q: "Remove Duplicates from String", tags: ["dsa"] },
      { q: "Count Occurrences of Character in String", tags: ["dsa"] },
      { q: "Reverse Words in Sentence", tags: ["dsa"] },
      { q: "Binary Search", tags: ["dsa"] },
      { q: "Bubble Sort", tags: ["dsa"] },
      { q: "Selection Sort", tags: ["dsa"] },
      { q: "Insertion Sort", tags: ["dsa"] },
      { q: "Rotate Array", tags: ["dsa"] },
      { q: "Find Missing Number", tags: ["dsa"] },
      { q: "Find Duplicate Elements in Array", tags: ["dsa"] },
      { q: "Count Pairs with Given Sum", tags: ["dsa"] },
      { q: "Check for Prime Number", tags: ["dsa"] },
      { q: "Fibonacci Series", tags: ["dsa"] },
      { q: "Factorial Using Recursion", tags: ["dsa"] },
    ],
  },
  LTIMindtree: {
    color: "#0067A5",
    icon: "L",
    questions: [
      { q: "Reverse String", tags: ["dsa"] },
      { q: "Check Palindrome", tags: ["dsa"] },
      { q: "Check Anagram", tags: ["dsa"] },
      { q: "Count Vowels and Consonants", tags: ["dsa"] },
      { q: "Binary Search", tags: ["dsa"] },
      { q: "Bubble Sort", tags: ["dsa"] },
      { q: "Selection Sort", tags: ["dsa"] },
      { q: "Insertion Sort", tags: ["dsa"] },
      { q: "Find Largest and Second Largest in Array", tags: ["dsa"] },
      { q: "Rotate Array", tags: ["dsa"] },
      { q: "Check if Array is Sorted", tags: ["dsa"] },
      { q: "Fibonacci Series", tags: ["dsa"] },
      { q: "Factorial Using Recursion", tags: ["dsa"] },
      { q: "Check Prime Number", tags: ["dsa"] },
      { q: "Reverse Linked List", tags: ["dsa"] },
    ],
  },
  Uber: {
    color: "#000000",
    icon: "U",
    questions: [
      { q: "Two Sum", tags: ["dsa"] },
      { q: "3Sum", tags: ["dsa"] },
      { q: "Subarray Sum Equals K", tags: ["dsa"] },
      { q: "Longest Substring Without Repeating Characters", tags: ["dsa"] },
      { q: "Minimum Window Substring", tags: ["dsa"] },
      { q: "Group Anagrams", tags: ["dsa"] },
      { q: "Median of Two Sorted Arrays", tags: ["dsa"] },
      { q: "Merge Intervals", tags: ["dsa"] },
      { q: "Insert Interval", tags: ["dsa"] },
      { q: "Meeting Rooms II", tags: ["dsa"] },
      { q: "Employee Free Time (interval merging)", tags: ["dsa"] },
      { q: "K Closest Points to Origin", tags: ["dsa"] },
      { q: "Kth Largest Element in an Array", tags: ["dsa"] },
      { q: "Top K Frequent Elements", tags: ["dsa"] },
      { q: "Number of Islands", tags: ["dsa"] },
      { q: "Clone Graph", tags: ["dsa"] },
      { q: "Course Schedule", tags: ["dsa"] },
      { q: "Course Schedule II", tags: ["dsa"] },
      { q: "LRU Cache", tags: ["dsa"] },
      { q: "Design Hit Counter", tags: ["dsa"] },
      { q: "Design Rate Limiter", tags: ["dsa"] },
    ],
  },
  Oracle: {
    color: "#F80000",
    icon: "O",
    questions: [
      { q: "Reverse String", tags: ["dsa"] },
      { q: "Check Palindrome", tags: ["dsa"] },
      { q: "Check Anagram", tags: ["dsa"] },
      { q: "Remove Duplicates from String", tags: ["dsa"] },
      { q: "First Non-Repeating Character in String", tags: ["dsa"] },
      { q: "Binary Search", tags: ["dsa"] },
      { q: "Linear Search", tags: ["dsa"] },
      { q: "Bubble Sort", tags: ["dsa"] },
      { q: "Selection Sort", tags: ["dsa"] },
      { q: "Insertion Sort", tags: ["dsa"] },
      { q: "Merge Sort (conceptual)", tags: ["dsa"] },
      { q: "Find Largest, Second Largest in Array", tags: ["dsa"] },
      { q: "Rotate Array by k", tags: ["dsa"] },
      { q: "Find Missing Number in Array", tags: ["dsa"] },
      { q: "Find Duplicate Number in Array", tags: ["dsa"] },
      { q: "Check for Prime", tags: ["dsa"] },
      { q: "Fibonacci Series", tags: ["dsa"] },
      { q: "Factorial (Iterative and Recursive)", tags: ["dsa"] },
      { q: "Reverse Linked List", tags: ["dsa"] },
    ],
  },
  IBM: {
    color: "#1F70C1",
    icon: "I",
    questions: [
      { q: "Reverse String", tags: ["dsa"] },
      { q: "Check Palindrome", tags: ["dsa"] },
      { q: "Check Anagram", tags: ["dsa"] },
      { q: "Count Vowels and Consonants", tags: ["dsa"] },
      { q: "Binary Search", tags: ["dsa"] },
      { q: "Linear Search", tags: ["dsa"] },
      { q: "Bubble Sort", tags: ["dsa"] },
      { q: "Selection Sort", tags: ["dsa"] },
      { q: "Insertion Sort", tags: ["dsa"] },
      { q: "Find Largest and Second Largest in Array", tags: ["dsa"] },
      { q: "Rotate Array", tags: ["dsa"] },
      { q: "Find Missing Number in Sequence", tags: ["dsa"] },
      { q: "Check Prime Number", tags: ["dsa"] },
      { q: "Fibonacci Series", tags: ["dsa"] },
      { q: "Factorial Using Recursion", tags: ["dsa"] },
      { q: "Matrix Addition", tags: ["dsa"] },
      { q: "Matrix Multiplication", tags: ["dsa"] },
    ],
  },
  "Goldman Sachs": {
    color: "#7399C6",
    icon: "GS",
    questions: [
      { q: "Reverse Words in a String", tags: ["dsa"] },
      { q: "Reverse String", tags: ["dsa"] },
      { q: "Check Palindrome String", tags: ["dsa"] },
      { q: "Non-Repeating Character in a String", tags: ["dsa"] },
      { q: "Check Anagram", tags: ["dsa"] },
      { q: "Stock Buy and Sell (Max Profit)", tags: ["dsa"] },
      { q: "Stock Buy and Sell with Multiple Transactions", tags: ["dsa"] },
      { q: "Total Decoding Messages (Decode Ways)", tags: ["dsa"] },
      { q: "Overlapping Rectangles", tags: ["dsa"] },
      { q: "Activity Selection / Interval Scheduling", tags: ["dsa"] },
      { q: "Sum Tree in Binary Tree", tags: ["dsa"] },
      { q: "Check for Balanced Binary Tree", tags: ["dsa"] },
      { q: "Binary Tree to DLL", tags: ["dsa"] },
      { q: "Flatten a Linked List", tags: ["dsa"] },
      { q: "Intersection Point in Y-Shaped Linked Lists", tags: ["dsa"] },
      { q: "Get Minimum Element from Stack (Design Min Stack)", tags: ["dsa"] },
      { q: "LRU Cache (frequent variant)", tags: ["dsa"] },
      { q: "Check if a Number is a Power of 2", tags: ["dsa"] },
      { q: "Count Set Bits in Integer", tags: ["dsa"] },
    ],
  },
  "JP Morgan": {
    color: "#2D2D2D",
    icon: "JPM",
    questions: [
      { q: "Reverse String", tags: ["dsa"] },
      { q: "Check Palindrome", tags: ["dsa"] },
      { q: "Check Anagram", tags: ["dsa"] },
      { q: "First Non-Repeating Character in String", tags: ["dsa"] },
      { q: "Count Frequency of Characters in String", tags: ["dsa"] },
      { q: "Subarray with Given Sum", tags: ["dsa"] },
      { q: "Two Sum", tags: ["dsa"] },
      { q: "Pair with Given Sum in Array", tags: ["dsa"] },
      { q: "Find Missing Number in Array", tags: ["dsa"] },
      { q: "Find Duplicate in Array", tags: ["dsa"] },
      { q: "Move Zeroes to End", tags: ["dsa"] },
      { q: "Sort 0s, 1s and 2s", tags: ["dsa"] },
      { q: "Merge Two Sorted Arrays", tags: ["dsa"] },
      { q: "Binary Search", tags: ["dsa"] },
      { q: "Check if Linked List has Cycle", tags: ["dsa"] },
      { q: "Find Middle of Linked List", tags: ["dsa"] },
      { q: "Reverse Linked List", tags: ["dsa"] },
      { q: "Basic Stock Buy and Sell", tags: ["dsa"] },
      { q: "Count Number of Digits / Sum of Digits (implementation warmups)", tags: ["dsa"] },
    ],
  },
};

const COMPANIES = Object.keys(KNOWLEDGE_BASES);

// ─── RAG Search ──────────────────────────────────────────────────────────────
function searchKnowledgeBases(query) {
  const q = query.toLowerCase();
  const results = [];
  const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedQuery = normalize(query);

  for (const [company, kb] of Object.entries(KNOWLEDGE_BASES)) {
    const companyLower = company.toLowerCase();
    const normalizedCompany = normalize(company);
    const companyMentioned = q.includes(companyLower) || normalizedQuery.includes(normalizedCompany);
    const matched = kb.questions.filter((item) => {
      const text = (item.q + " " + item.tags.join(" ") + " " + companyLower).toLowerCase();
      // Score by keyword overlap
      const words = q.split(/\s+/).filter((w) => w.length > 3);
      return words.some((w) => text.includes(w));
    });
    if (companyMentioned) {
      results.push({ company, color: kb.color, icon: kb.icon, matches: kb.questions });
      continue;
    }
    if (matched.length > 0) {
      results.push({ company, color: kb.color, icon: kb.icon, matches: matched.slice(0, 5) });
    }
  }
  return results;
}

// ─── Secure Backend API Call ────────────────────────────────────────────────
async function callGeminiWithRAG(userMessage, sessionId, requestId) {
  const apiBase = getApiBase();
  const apiKey = import.meta.env.VITE_API_KEY || "rag-client-key-2026";

  let response;
  try {
    response = await fetch(`${apiBase}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        query: userMessage,
        session_id: sessionId,
        request_id: requestId,
      }),
    });
  } catch (networkErr) {
    console.error("[Placement RAG Agent] Network error calling secure API:", networkErr);
    throw new Error("⚠️ Network error — could not reach the secure RAG API. Please check your connection and try again.");
  }

  if (!response.ok) {
    let detail = "Request could not be processed.";
    try {
      const body = await response.json();
      detail = body?.detail || detail;
    } catch (_err) {
      // Keep generic detail to avoid leaking internals.
    }
    throw new Error(detail);
  }

  const data = await response.json();
  return data;
}

// ─── Enhanced Markdown Renderer ──────────────────────────────────────────────
// ─── Production-Quality GFM Markdown Renderer (Handbook Typography) ──────────
function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div
      className="markdown-body"
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        color: "#F3F6F9",
        lineHeight: "1.75",
        fontSize: "1.08rem",
        width: "100%",
        maxWidth: "100%",
        wordBreak: "break-word",
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: "1.85rem",
                fontWeight: "700",
                color: "#FFFFFF",
                marginTop: "2.4rem",
                marginBottom: "1.1rem",
                lineHeight: "1.3",
                borderBottom: "1px solid rgba(30, 144, 255, 0.28)",
                boxShadow: "0 1px 0 rgba(0, 0, 0, 0.9)",
                paddingBottom: "0.5rem",
              }}
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: "1.52rem",
                fontWeight: "700",
                color: "#FFFFFF",
                marginTop: "2.1rem",
                marginBottom: "0.9rem",
                lineHeight: "1.35",
                borderBottom: "1px solid rgba(30, 144, 255, 0.18)",
                paddingBottom: "0.4rem",
              }}
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: "1.28rem",
                fontWeight: "600",
                color: "#F8FAFC",
                marginTop: "1.7rem",
                marginBottom: "0.6rem",
                lineHeight: "1.4",
              }}
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: "1.14rem",
                fontWeight: "600",
                color: "#F1F5F9",
                marginTop: "1.4rem",
                marginBottom: "0.5rem",
                lineHeight: "1.4",
              }}
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: "1.08rem",
                lineHeight: "1.75",
                color: "#F3F6F9",
                marginTop: "0.3rem",
                marginBottom: "1.3rem",
              }}
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: "1.08rem",
                lineHeight: "1.75",
                color: "#F3F6F9",
                marginTop: "0.5rem",
                marginBottom: "1.4rem",
                paddingLeft: "1.8rem",
                listStyleType: "disc",
              }}
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: "1.08rem",
                lineHeight: "1.75",
                color: "#F3F6F9",
                marginTop: "0.5rem",
                marginBottom: "1.4rem",
                paddingLeft: "1.8rem",
                listStyleType: "decimal",
              }}
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li
              style={{
                marginBottom: "0.6rem",
                lineHeight: "1.75",
                color: "#F3F6F9",
              }}
              {...props}
            />
          ),
          hr: ({ node, ...props }) => (
            <hr
              style={{
                border: "none",
                height: "1px",
                background: "rgba(255, 255, 255, 0.08)",
                boxShadow: "0 1px 0 rgba(30, 144, 255, 0.15)",
                margin: "2.4rem 0",
              }}
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              style={{
                borderLeft: "4px solid rgba(30, 144, 255, 0.65)",
                background: "#040404",
                boxShadow: "inset 3px 3px 7px rgba(0, 0, 0, 0.85), inset -2px -2px 5px rgba(255, 255, 255, 0.02)",
                borderRadius: "0 10px 10px 0",
                paddingTop: "0.6rem",
                paddingBottom: "0.6rem",
                paddingLeft: "1.2rem",
                paddingRight: "1rem",
                paddingY: "0.6rem",
                margin: "1.4rem 0",
                color: "#C9CFD6",
                fontStyle: "italic",
                lineHeight: "1.75",
                fontFamily: "'Times New Roman', Times, serif",
              }}
              {...props}
            />
          ),
          strong: ({ node, ...props }) => (
            <strong style={{ fontWeight: "700", color: "#FFFFFF" }} {...props} />
          ),
          em: ({ node, ...props }) => (
            <em style={{ fontStyle: "italic", color: "#E2E8F0" }} {...props} />
          ),
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && (match || String(children).includes("\n")) ? (
              <pre
                style={{
                  background: "#040404",
                  border: "1px solid rgba(0, 0, 0, 0.85)",
                  boxShadow: "inset 4px 4px 10px rgba(0, 0, 0, 0.9), inset -3px -3px 8px rgba(255, 255, 255, 0.02)",
                  borderRadius: "12px",
                  padding: "1.2rem",
                  margin: "1.5rem 0",
                  overflowX: "auto",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.9rem",
                  lineHeight: "1.6",
                  color: "#A7B7CC",
                }}
              >
                <code className={className} style={{ fontFamily: "'Space Mono', monospace" }} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code
                style={{
                  background: "#101010",
                  padding: "0.15em 0.45em",
                  borderRadius: "6px",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.88em",
                  color: "#57B6FF",
                  border: "1px solid rgba(0, 0, 0, 0.8)",
                  borderTop: "1px solid rgba(255, 255, 255, 0.07)",
                  borderLeft: "1px solid rgba(255, 255, 255, 0.07)",
                  boxShadow: "1px 1px 3px rgba(0, 0, 0, 0.6)",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          a: ({ node, ...props }) => (
            <a
              style={{
                color: "#1E90FF",
                textDecoration: "underline",
                fontWeight: "500",
              }}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div style={{ overflowX: "auto", margin: "1.8rem 0", width: "100%", maxWidth: "100%" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "1rem",
                  fontFamily: "'Times New Roman', Times, serif",
                  color: "#F3F6F9",
                  border: "1px solid rgba(0, 0, 0, 0.8)",
                  borderRadius: "12px",
                  background: "#040404",
                  boxShadow: "inset 4px 4px 10px rgba(0, 0, 0, 0.85), inset -3px -3px 8px rgba(255, 255, 255, 0.02), 3px 3px 8px rgba(0, 0, 0, 0.5)",
                }}
                {...props}
              />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              style={{
                background: "linear-gradient(180deg, #101010, #0a0a0a)",
                boxShadow: "inset 0 -2px 0 rgba(30, 144, 255, 0.35)",
              }}
              {...props}
            />
          ),
          tbody: ({ node, ...props }) => <tbody {...props} />,
          tr: ({ node, ...props }) => (
            <tr
              style={{
                borderBottom: "1px solid rgba(0, 0, 0, 0.55)",
              }}
              {...props}
            />
          ),
          th: ({ node, ...props }) => (
            <th
              style={{
                padding: "0.85rem 1.1rem",
                textAlign: "left",
                fontWeight: "700",
                color: "#FFFFFF",
                borderBottom: "2px solid rgba(30, 144, 255, 0.45)",
                borderRight: "1px solid rgba(0, 0, 0, 0.5)",
                whiteSpace: "nowrap",
              }}
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              style={{
                padding: "0.85rem 1.1rem",
                color: "#F3F6F9",
                borderRight: "1px solid rgba(0, 0, 0, 0.45)",
                lineHeight: "1.65",
              }}
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Typing Animation ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center", padding: "0.5rem 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #57B6FF, #1E90FF)",
          animation: "pulse 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
          opacity: 0.7,
          boxShadow: "0 0 10px #1E90FF66, 0 0 20px #1E90FF22",
        }} />
      ))}
    </div>
  );
}

// ─── Citation Card ─────────────────────────────────────────────────────────────
function CitationCard({ result, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      border: "1px solid rgba(0, 0, 0, 0.65)",
      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      borderLeft: "3px solid #1E90FF",
      borderRadius: "12px",
      marginBottom: "0.5rem",
      background: "#0B0B0B",
      boxShadow: "var(--shadow-raised)",
      overflow: "hidden",
      transition: "all 0.25s ease",
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.6rem 0.95rem", cursor: "pointer", userSelect: "none" }}
      >
        <span style={{
          background: "#1E90FF",
          color: "#fff",
          borderRadius: "8px",
          padding: "2px 8px",
          fontSize: "0.68rem",
          fontFamily: "'Space Mono', monospace",
          fontWeight: "bold",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.6), inset 1px 1px 1px rgba(255, 255, 255, 0.35), 0 0 10px rgba(30, 144, 255, 0.35)",
          textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
        }}>
          {result.icon || result.company[0]}
        </span>
        <span style={{ color: "#F5F5F5", fontSize: "0.82rem", fontFamily: "'Space Mono', monospace", flex: 1, fontWeight: "bold" }}>
          {result.company}
        </span>
        <span style={{ color: "#8A8A8A", fontSize: "0.75rem", fontFamily: "'Space Mono', monospace" }}>{result.matches.length} matches</span>
        <span style={{ color: "#1E90FF", fontSize: "0.8rem", transform: expanded ? "rotate(90deg)" : "none", transition: "0.2s", filter: expanded ? "drop-shadow(0 0 4px rgba(30, 144, 255, 0.5))" : "none" }}>▶</span>
      </div>
      {expanded && (
        <div style={{ padding: "0.2rem 0.95rem 0.75rem", borderTop: "1px solid rgba(0,0,0,0.7)", boxShadow: "inset 3px 3px 6px rgba(0,0,0,0.85), inset -2px -2px 5px rgba(255,255,255,0.02)", background: "#040404" }}>
          {result.matches.map((m, i) => (
            <div key={i} style={{ padding: "0.5rem 0", borderBottom: i < result.matches.length - 1 ? "1px solid rgba(0,0,0,0.45)" : "none" }}>
              <p style={{ color: "#F5F5F5", fontSize: "0.82rem", margin: "0 0 0.3rem", lineHeight: 1.5 }}>{m.q}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {m.tags.map((t) => (
                  <span key={t} style={{
                    background: "#0B0B0B",
                    color: "#8A8A8A",
                    fontSize: "0.65rem",
                    padding: "1px 6px",
                    borderRadius: "6px",
                    fontFamily: "'Space Mono', monospace",
                    border: "1px solid rgba(0,0,0,0.6)",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "1px 1px 3px rgba(0,0,0,0.55)",
                  }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Message ──────────────────────────────────────────────────────────────────
function Message({ msg, apiBase }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ marginBottom: "1.75rem", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.4rem" }}>
        {!isUser && (
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(145deg, #101010, #080808)",
            border: "1px solid rgba(0, 0, 0, 0.7)",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.6rem", fontWeight: "bold", color: "#1E90FF", fontFamily: "'Space Mono', monospace",
            boxShadow: "var(--shadow-raised-sm), 0 0 8px rgba(30, 144, 255, 0.25)",
          }}>AI</div>
        )}
        <span style={{ color: "#8A8A8A", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>
          {isUser ? "you" : "rag_agent"}
        </span>
        {isUser && (
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(145deg, #101010, #080808)",
            border: "1px solid rgba(0, 0, 0, 0.7)",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "0.7rem", color: "#8A8A8A",
            boxShadow: "var(--shadow-raised-sm)",
          }}>U</div>
        )}
      </div>

      {isUser ? (
        <div style={{
          background: "linear-gradient(145deg, #1565C0, #1976D2)",
          border: "1px solid rgba(100, 181, 255, 0.45)",
          borderTop: "1px solid rgba(144, 202, 249, 0.35)",
          borderLeft: "1px solid rgba(144, 202, 249, 0.35)",
          boxShadow: "0 4px 18px rgba(30, 144, 255, 0.45), 0 0 0 1px rgba(100, 181, 255, 0.15), inset 0 1px 0 rgba(255,255,255,0.15)",
          borderRadius: "14px 14px 4px 14px",
          padding: "0.75rem 1.1rem",
          maxWidth: "75%",
          color: "#E3F2FD",
          fontSize: "0.88rem",
          lineHeight: 1.6,
        }}>
          {msg.content}
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "100%" }}>
          {msg.loading ? (
            <div style={{
              background: "linear-gradient(145deg, #0a0a0a, #060606)",
              border: "1px solid rgba(0, 0, 0, 0.7)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
              borderRight: "1px solid rgba(255, 255, 255, 0.04)",
              boxShadow: "var(--shadow-inset)",
              borderRadius: "4px 14px 14px 14px",
              padding: "0.85rem 1.1rem",
            }}>
              {msg.requestId ? (
                <PipelineProgress
                  requestId={msg.requestId}
                  apiBase={apiBase}
                  onComplete={() => {}}
                />
              ) : (
                <TypingDots />
              )}
            </div>
          ) : (
            <>
              {/* Rewritten query indicator */}
              {msg.rewrittenQuery && msg.rewrittenQuery !== msg.originalQuery && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  marginBottom: "0.4rem",
                  padding: "0.3rem 0.6rem",
                  background: "#040404",
                  boxShadow: "var(--shadow-inset)",
                  borderRadius: 8,
                  border: "1px solid rgba(0, 0, 0, 0.75)",
                }}>
                  <span style={{ color: "#8A8A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>↻ QUERY REWRITTEN:</span>
                  <span style={{ color: "#1E90FF", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace", fontStyle: "italic", textShadow: "0 0 6px rgba(30, 144, 255, 0.35)" }}>
                    {msg.rewrittenQuery}
                  </span>
                </div>
              )}
              <div style={{
                background: "linear-gradient(145deg, #0c0c0c, #070707)",
                border: "1px solid rgba(0, 0, 0, 0.65)",
                borderTop: "1px solid rgba(255, 255, 255, 0.07)",
                borderLeft: "1px solid rgba(255, 255, 255, 0.07)",
                boxShadow: "var(--shadow-raised-high)",
                borderRadius: "4px 16px 16px 16px",
                padding: "1.4rem 1.8rem",
                marginBottom: "0.85rem",
              }}>
                <MarkdownRenderer content={msg.content} />
              </div>
              {msg.citations && msg.citations.length > 0 && (
                <div style={{ marginTop: "0.6rem" }}>
                  <p style={{ color: "#8A8A8A", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace", marginBottom: "0.45rem", letterSpacing: "0.1em" }}>
                    ◈ SOURCES ({msg.citations.length} company profiles)
                  </p>
                  {msg.citations.map((c, i) => <CitationCard key={i} result={c} index={i} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Suggested Queries ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What system design questions does Google ask?",
  "What behavioral questions does Amazon focus on?",
  "What are Netflix's streaming architecture questions?",
  "Compare algorithm questions across all companies",
  "What security questions does Apple ask?",
  "What ML questions does Meta ask?",
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCompanies] = useState(new Set(COMPANIES));
  // The Gemini API key lives server-side only (never exposed to the browser).
  // Show the warning only when no backend URL is configured at all.
  const apiKeyPresent = Boolean(import.meta.env.VITE_API_BASE_URL);

  // New state: dashboard, session, and request tracking
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [lastRequestId, setLastRequestId] = useState(null);
  const [sessionId] = useState(() => getSessionId());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const apiBase = getApiBase();

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const query = text || input.trim();
    if (!query || loading) return;
    setInput("");

    // Generate a unique request_id for this interaction
    const requestId = generateUUID();
    setLastRequestId(requestId);

    const userMsg = { role: "user", content: query };
    const loadingMsg = { role: "assistant", content: "", loading: true, requestId };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      // Call backend /chat with session_id and request_id
      const aiResponse = await callGeminiWithRAG(query, sessionId, requestId);

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: aiResponse?.answer || aiResponse?.text || "I encountered an issue processing your request.",
          citations: aiResponse?.meta?.citations || aiResponse?.citations || [],
          requestId,
          rewrittenQuery: aiResponse?.pipeline_data?.rewritten_query || aiResponse?.rewritten_query || null,
          originalQuery: query,
          pipelineData: aiResponse?.pipeline_data || null,
        },
      ]);
    } catch (err) {
      console.error("[Placement RAG Agent] handleSend error:", err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: `⚠️ Something went wrong: ${err.message || "Unknown error"}. Please try again.`, citations: [], requestId },
      ]);
    }
    setLoading(false);
  };

  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      background: "#050505",
      fontFamily: "'Sora', 'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      color: "#F5F5F5",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Sora:wght@300;400;500;600&family=Orbitron:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .suggestion-btn {
          background: linear-gradient(145deg, #0d0d0d, #080808);
          border: 1px solid rgba(0, 0, 0, 0.6);
          border-top-color: rgba(255, 255, 255, 0.07);
          border-left-color: rgba(255, 255, 255, 0.07);
          color: #8A8A8A;
          border-radius: 999px;
          padding: 0.55rem 1.1rem;
          font-size: 0.75rem;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          box-shadow: var(--shadow-raised-sm);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }
        .suggestion-btn:hover {
          color: #57B6FF;
          border-color: rgba(30, 144, 255, 0.4);
          box-shadow: var(--shadow-raised-sm), 0 0 10px rgba(30, 144, 255, 0.25);
        }
        .suggestion-btn:focus-visible {
          border-color: #1E90FF;
          box-shadow: var(--shadow-raised-sm), 0 0 8px rgba(30, 144, 255, 0.45);
        }
        .suggestion-btn:active {
          background: #030303;
          box-shadow: var(--shadow-pressed);
          border-color: rgba(0, 0, 0, 0.8);
          color: #8A8A8A;
        }
      `}</style>

      {/* ── Fixed Header across 100% viewport width ── */}
      <div style={{
        flexShrink: 0,
        width: "100%",
        borderBottom: "1px solid rgba(0, 0, 0, 0.75)",
        boxShadow: "0 6px 16px rgba(0, 0, 0, 0.6), inset 0 -1px 0 rgba(255, 255, 255, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        padding: "0.85rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1.1rem",
        background: "linear-gradient(180deg, #0c0c0c, #080808)",
        zIndex: 20,
      }}>
        <img 
          src="/favicon.jpeg" 
          alt="Agentic Placement RAG Logo"
          style={{
            width: 40,
            height: 40,
            borderRadius: "12px",
            border: "1px solid rgba(0, 0, 0, 0.65)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "var(--shadow-raised-sm), 0 0 10px rgba(30, 144, 255, 0.25)",
            objectFit: "cover",
          }}
        />
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: "'Orbitron', 'Space Mono', monospace",
            color: "#1E90FF",
            fontSize: "0.9rem",
            fontWeight: "bold",
            letterSpacing: "0.15em",
            textShadow: "0 0 8px rgba(30, 144, 255, 0.45)",
          }}>
            AGENTIC PLACEMENT RAG
          </h1>
          <p style={{ color: "#8A8A8A", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>
            Agentic Multi-Source Intelligence • 50 Company Knowledge Bases • Retrieval, Reasoning & Reranking
          </p>
        </div>

        <button
          className={dashboardOpen ? "neo-button active" : "neo-button"}
          onClick={() => setDashboardOpen(!dashboardOpen)}
          style={{
            borderRadius: "999px",
            padding: "7px 16px",
            fontSize: "0.7rem",
            fontFamily: "'Space Mono', monospace",
            fontWeight: "bold",
            background: dashboardOpen ? "#030303" : "linear-gradient(145deg, #2A6FDB, #1E5BC6)",
            border: "1px solid rgba(30, 144, 255, 0.4)",
            borderTop: "1px solid rgba(255, 255, 255, 0.15)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#E0F0FF",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            flexShrink: 0,
            transition: "all 0.2s ease",
            boxShadow: dashboardOpen
              ? "var(--shadow-pressed)"
              : "var(--shadow-raised-sm), 0 0 12px rgba(30, 144, 255, 0.35)",
          }}
          title="Toggle Developer Dashboard"
        >
          <span style={{ fontSize: "0.8rem", color: "#E0F0FF" }}>🛠</span>
          <span>Developer Dashboard</span>
        </button>
      </div>

      {/* API key missing warning banner */}
      {!apiKeyPresent && (
        <div style={{
          background: "linear-gradient(145deg, #0d0d0d, #080808)",
          border: "1px solid rgba(255, 165, 0, 0.35)",
          borderTop: "1px solid rgba(255, 255, 255, 0.07)",
          borderLeft: "3px solid #FFA500",
          borderRadius: "12px",
          padding: "0.6rem 1.2rem",
          margin: "0.75rem 1.5rem 0",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          zIndex: 15,
          flexShrink: 0,
          boxShadow: "var(--shadow-raised)",
        }}>
          <span style={{ fontSize: "1.25rem" }}>⚠️</span>
          <span style={{ color: "#FFA500", fontSize: "0.82rem", fontFamily: "'Space Mono', monospace", lineHeight: 1.5 }}>
            <strong>API Key Missing</strong> — Backend GEMINI_API_KEY is not set. AI-powered answers are disabled.
            Set the environment variable in your backend configuration and restart.
          </span>
        </div>
      )}

      {/* ── Main Workspace Row (takes all remaining height below Header) ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "row",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}>
        {/* ── Chat Panel (Left side / Full width when dashboard closed) ── */}
        <div style={{
          flex: (!dashboardOpen || isMobile) ? "1 1 100%" : "1 1 66%",
          width: (!dashboardOpen || isMobile) ? "100%" : "66%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          transition: "flex 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          background: "#050505",
        }}>
          {/* 1. Conversation Area (ONLY this area scrolls) */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem 1.5rem",
            position: "relative",
          }}>
            {messages.map((msg, i) => (
              <div key={i} className="msg-enter">
                <Message msg={msg} apiBase={apiBase} />
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 2. Suggestions (only show when no messages) */}
          {messages.length === 0 && (
            <div style={{
              padding: "0 1.5rem 1.25rem",
              flexShrink: 0,
            }}>
              <p style={{ color: "#8A8A8A", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace", marginBottom: "0.6rem", letterSpacing: "0.1em" }}>
                ◈ TRY ASKING
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="suggestion-btn"
                    onClick={() => handleSend(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Input Bar (Sticks to bottom of active Chat Panel) */}
          <div style={{
            flexShrink: 0,
            borderTop: "1px solid rgba(0, 0, 0, 0.75)",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            padding: "1rem 1.5rem",
            background: "#050505",
          }}>
            <div style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-end",
              background: "#030303",
              border: "1px solid rgba(0, 0, 0, 0.85)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
              borderRight: "1px solid rgba(255, 255, 255, 0.03)",
              borderRadius: "18px",
              padding: "0.65rem 0.8rem",
              boxShadow: "var(--shadow-inset-deep), 0 0 0 1px rgba(255, 255, 255, 0.02)",
            }}>
              <span style={{ color: "#1E90FF", fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", marginBottom: "0.3rem", flexShrink: 0, textShadow: "0 0 6px rgba(30, 144, 255, 0.5)" }}>›</span>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask about interview questions... (e.g. 'What does Google ask about system design?')"
                rows={1}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "#F5F5F5",
                  fontSize: "0.88rem",
                  fontFamily: "'Sora', sans-serif",
                  lineHeight: 1.6,
                  maxHeight: "120px",
                  overflowY: "auto",
                  outline: "none",
                }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                style={{
                  background: input.trim() && !loading ? "linear-gradient(145deg, #101010, #090909)" : "#020202",
                  border: "1px solid rgba(0, 0, 0, 0.7)",
                  borderTop: input.trim() && !loading ? "1px solid rgba(255, 255, 255, 0.09)" : "1px solid rgba(0, 0, 0, 0.7)",
                  borderLeft: input.trim() && !loading ? "1px solid rgba(255, 255, 255, 0.09)" : "1px solid rgba(0, 0, 0, 0.7)",
                  borderRadius: "12px",
                  width: 38, height: 38,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                  color: input.trim() && !loading ? "#1E90FF" : "#555555",
                  fontSize: "1rem",
                  boxShadow: input.trim() && !loading
                    ? "var(--shadow-raised-sm), 0 0 10px rgba(30, 144, 255, 0.3)"
                    : "var(--shadow-pressed)",
                }}
              >
                {loading ? "⏳" : "⬆"}
              </button>
            </div>
            <p style={{ textAlign: "center", color: "#666666", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace", marginTop: "0.5rem", letterSpacing: "0.03em" }}>
              ⚠️ AI may occasionally have a mind of its own. Snigdha's Agentic Placement RAG can make mistakes. Please verify important results.
            </p>
          </div>
        </div>

        {/* ── Developer Dashboard Panel (Right side ~34% on desktop, slide-over on mobile) ── */}
        <DeveloperDashboard
          isOpen={dashboardOpen}
          isMobile={isMobile}
          onClose={() => setDashboardOpen(false)}
          requestId={lastRequestId}
          apiBase={apiBase}
          isChatLoading={loading}
        />
      </div>
    </div>
  );
}
