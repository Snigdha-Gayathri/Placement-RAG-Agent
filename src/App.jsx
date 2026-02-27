import { useState, useRef, useEffect } from "react";

// ─── Startup Log ─────────────────────────────────────────────────────────────
console.log(
  `%c[Placement RAG Agent] App loaded — ${new Date().toISOString()}`,
  "color:#1E90FF;font-weight:bold"
);
if (!import.meta.env.VITE_GEMINI_API_KEY) {
  console.warn(
    "[Placement RAG Agent] VITE_GEMINI_API_KEY is not set. " +
    "AI responses will be unavailable until the variable is configured."
  );
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

// ─── Gemini API Call ─────────────────────────────────────────────────────────
async function callGeminiWithRAG(userMessage, ragContext) {
  const contextText = ragContext
    .map(
      (r) =>
        `[${r.company}]:\n` +
        r.matches.map((m) => `• ${m.q} (tags: ${m.tags.join(", ")})`).join("\n")
    )
    .join("\n\n");

  const systemPrompt = `You are an expert IT Interview Intelligence Agent. You have access to curated interview question databases from top tech companies: Google, Amazon, Microsoft, Meta, Netflix, and Apple.

When a user asks about interview questions for a company or topic, you MUST:
1. Analyze the retrieved knowledge base context provided to you
2. Synthesize a comprehensive, well-structured answer
3. Always cite which company each question or insight comes from using [Company] notation
4. Group questions by category/theme when possible
5. Add brief expert tips for each category
6. Keep responses focused, useful, and actionable

Format your response with clear sections using markdown. Be concise but thorough. Always end with a "Pro Tips" section.`;

  const userContent = ragContext.length > 0
    ? `User Query: ${userMessage}\n\n--- RETRIEVED CONTEXT FROM KNOWLEDGE BASES ---\n${contextText}\n--- END CONTEXT ---\n\nPlease synthesize the above knowledge base results into a helpful, well-cited answer.`
    : `User Query: ${userMessage}\n\nNote: No specific matches were found in the knowledge bases for this query. Please provide a helpful general response about IT interview preparation.`;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Placement RAG Agent] VITE_GEMINI_API_KEY is missing at runtime.");
    return "⚠️ Gemini API key not configured. The site administrator needs to set the VITE_GEMINI_API_KEY environment variable and redeploy.";
  }

  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userContent }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1000,
        },
      }),
    });
  } catch (networkErr) {
    console.error("[Placement RAG Agent] Network error calling Gemini API:", networkErr);
    return "⚠️ Network error — could not reach the Gemini API. Please check your connection and try again.";
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Placement RAG Agent] Gemini API ${response.status}:`, errorBody);
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n") || "I encountered an issue processing your request.";
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} style={{ color: "#1E90FF", fontSize: "0.85rem", fontFamily: "'Orbitron', 'Space Mono', monospace", marginTop: "1rem", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.12em", textShadow: "0 0 8px #1E90FF55, 0 0 20px #1E90FF22" }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} style={{ color: "#1E90FF", fontSize: "0.95rem", fontFamily: "'Orbitron', 'Space Mono', monospace", marginTop: "1.2rem", marginBottom: "0.4rem", borderBottom: "1px solid #1E90FF1A", paddingBottom: "0.3rem", textShadow: "0 0 10px #1E90FF55, 0 0 25px #1E90FF22" }}>{line.slice(3)}</h2>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<p key={i} style={{ color: "#e0e0e0", fontWeight: "bold", margin: "0.5rem 0 0.2rem" }}>{line.slice(2, -2)}</p>);
    } else if (line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.slice(2);
      // Handle inline bold and citations
      const parts = content.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g);
      elements.push(
        <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem", paddingLeft: "0.5rem" }}>
          <span style={{ color: "#1E90FF", flexShrink: 0 }}>▸</span>
          <span style={{ color: "#c8c8c8", fontSize: "0.88rem", lineHeight: 1.6 }}>
            {parts.map((p, j) => {
              if (p.startsWith("**") && p.endsWith("**")) return <strong key={j} style={{ color: "#fff" }}>{p.slice(2, -2)}</strong>;
              if (p.startsWith("[") && p.endsWith("]")) return <span key={j} style={{ color: "#1E90FF", fontFamily: "'Space Mono', monospace", fontSize: "0.8em", backgroundColor: "#1E90FF22", padding: "0 4px", borderRadius: "3px" }}>{p}</span>;
              return p;
            })}
          </span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: "0.4rem" }} />);
    } else {
      const parts = line.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g);
      elements.push(
        <p key={i} style={{ color: "#c8c8c8", fontSize: "0.88rem", lineHeight: 1.7, margin: "0.15rem 0" }}>
          {parts.map((p, j) => {
            if (p.startsWith("**") && p.endsWith("**")) return <strong key={j} style={{ color: "#fff" }}>{p.slice(2, -2)}</strong>;
            if (p.startsWith("[") && p.endsWith("]")) return <span key={j} style={{ color: "#1E90FF", fontFamily: "'Space Mono', monospace", fontSize: "0.85em", backgroundColor: "#1E90FF22", padding: "0 4px", borderRadius: "3px" }}>{p}</span>;
            return p;
          })}
        </p>
      );
    }
    i++;
  }
  return elements;
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
    <div className="glass-card" style={{
      border: `1px solid ${result.color}22`,
      borderLeft: `3px solid ${result.color}88`,
      borderRadius: "10px",
      marginBottom: "0.5rem",
      background: "rgba(10,18,35,0.6)",
      overflow: "hidden",
      transition: "all 0.3s ease",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      boxShadow: `0 0 15px ${result.color}0A`,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.8rem", cursor: "pointer" }}
      >
        <span style={{
          background: `linear-gradient(135deg, ${result.color}, ${result.color}cc)`,
          color: "#fff", borderRadius: "5px",
          padding: "2px 8px", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace", fontWeight: "bold",
          boxShadow: `0 0 10px ${result.color}44`,
          textShadow: "0 0 4px rgba(255,255,255,0.5)",
        }}>
          {result.icon || result.company[0]}
        </span>
        <span style={{ color: "#C8D8EA", fontSize: "0.82rem", fontFamily: "'Space Mono', monospace", flex: 1 }}>
          {result.company}
        </span>
        <span style={{ color: "#5A7A9A", fontSize: "0.75rem" }}>{result.matches.length} matches</span>
        <span style={{ color: result.color, fontSize: "0.8rem", transform: expanded ? "rotate(90deg)" : "none", transition: "0.25s", filter: `drop-shadow(0 0 4px ${result.color}66)` }}>▶</span>
      </div>
      {expanded && (
        <div style={{ padding: "0 0.8rem 0.6rem", borderTop: `1px solid ${result.color}15` }}>
          {result.matches.map((m, i) => (
            <div key={i} style={{ padding: "0.4rem 0", borderBottom: i < result.matches.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
              <p style={{ color: "#B8C8D8", fontSize: "0.82rem", margin: "0 0 0.2rem", lineHeight: 1.5 }}>{m.q}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {m.tags.map((t) => (
                  <span key={t} style={{
                    background: `${result.color}15`, color: result.color,
                    fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px",
                    fontFamily: "'Space Mono', monospace",
                    border: `1px solid ${result.color}1A`,
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
function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
        {!isUser && (
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "linear-gradient(135deg, #1E90FF, #0A5EB5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.6rem", fontWeight: "bold", color: "#fff", fontFamily: "'Space Mono', monospace",
            boxShadow: "0 0 12px #1E90FF44",
            textShadow: "0 0 4px rgba(255,255,255,0.5)",
          }}>AI</div>
        )}
        <span style={{ color: "#4A6A8A", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>
          {isUser ? "you" : "rag_agent"}
        </span>
        {isUser && (
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(30,144,255,0.08)",
            border: "1px solid rgba(30,144,255,0.2)",
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "0.7rem", color: "#6B9FD4",
          }}>U</div>
        )}
      </div>

      {isUser ? (
        <div className="glass-card" style={{
          background: "rgba(14,28,55,0.5)",
          border: "1px solid rgba(30,144,255,0.15)",
          borderRadius: "14px 14px 2px 14px",
          padding: "0.7rem 1rem", maxWidth: "70%", color: "#D0E0F0", fontSize: "0.88rem", lineHeight: 1.6,
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 2px 20px rgba(30,144,255,0.06)",
        }}>
          {msg.content}
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "100%" }}>
          {msg.loading ? (
            <div className="glass-card" style={{
              background: "rgba(10,18,35,0.5)", border: "1px solid rgba(30,144,255,0.12)",
              borderRadius: "2px 14px 14px 14px", padding: "0.7rem 1rem",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            }}>
              <TypingDots />
            </div>
          ) : (
            <>
              <div className="glass-card" style={{
                background: "rgba(10,18,35,0.5)", border: "1px solid rgba(30,144,255,0.12)",
                borderRadius: "2px 14px 14px 14px", padding: "0.9rem 1.2rem", marginBottom: "0.75rem",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                boxShadow: "0 4px 30px rgba(30,144,255,0.04)",
              }}>
                {renderMarkdown(msg.content)}
              </div>
              {msg.citations && msg.citations.length > 0 && (
                <div>
                  <p style={{ color: "#3A5A7A", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace", marginBottom: "0.4rem", letterSpacing: "0.1em" }}>
                    ◈ SOURCES ({msg.citations.length} knowledge bases)
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
  const apiKeyPresent = Boolean(import.meta.env.VITE_GEMINI_API_KEY);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `## Welcome to Interview RAG Agent\n\nI have access to **${COMPANIES.length} curated knowledge bases** from top IT companies:\n\n• **Google** — System design, algorithms, distributed systems\n• **Amazon** — Leadership principles, system design, DSA\n• **Microsoft** — OOP, cloud, real-time systems\n• **Meta** — ML systems, scale, product decisions\n• **Netflix** — Streaming architecture, resilience, data science\n• **Apple** — iOS, privacy, security, hardware-software\n\nAsk me about interview questions for any company or topic, and I'll search across all knowledge bases and provide cited answers.`,
      citations: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCompanies] = useState(new Set(COMPANIES));
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const query = text || input.trim();
    if (!query || loading) return;
    setInput("");

    const userMsg = { role: "user", content: query };
    const loadingMsg = { role: "assistant", content: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      // RAG: search knowledge bases
      const ragResults = searchKnowledgeBases(query);

      // Call Gemini with RAG context
      const aiResponse = await callGeminiWithRAG(query, ragResults);

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: aiResponse, citations: ragResults },
      ]);
    } catch (err) {
      console.error("[Placement RAG Agent] handleSend error:", err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: `⚠️ Something went wrong: ${err.message || "Unknown error"}. Please try again.`, citations: [] },
      ]);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050A15",
      fontFamily: "'Sora', 'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Sora:wght@300;400;500;600&family=Orbitron:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E90FF33; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #1E90FF66; }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float1 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -20px) scale(1.05); } 66% { transform: translate(-20px, 15px) scale(0.95); } }
        @keyframes float2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-40px, -30px) scale(1.1); } }
        @keyframes float3 { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(20px, -40px); } 50% { transform: translate(-15px, -20px); } 75% { transform: translate(25px, 10px); } }
        @keyframes borderGlow { 0%, 100% { border-color: rgba(30,144,255,0.13); box-shadow: 0 0 15px #1E90FF11; } 50% { border-color: rgba(30,144,255,0.28); box-shadow: 0 0 30px #1E90FF22; } }
        @keyframes neonPulse { 0%, 100% { text-shadow: 0 0 7px #1E90FF88, 0 0 20px #1E90FF44, 0 0 40px #1E90FF22; } 50% { text-shadow: 0 0 10px #1E90FFbb, 0 0 30px #1E90FF66, 0 0 60px #1E90FF33; } }
        @keyframes orbGlow { 0%, 100% { box-shadow: 0 0 20px #1E90FF33, inset 0 0 20px #1E90FF11; } 50% { box-shadow: 0 0 40px #1E90FF55, inset 0 0 30px #1E90FF22; } }
        .msg-enter { animation: fadeIn 0.3s ease forwards; }
        textarea:focus { outline: none; }
        textarea { resize: none; }
        .send-btn { transition: all 0.3s ease !important; }
        .send-btn:hover { background: linear-gradient(135deg, #1E90FF, #57B6FF) !important; transform: scale(1.05); box-shadow: 0 0 25px #1E90FF66 !important; }
        .send-btn:active { transform: scale(0.97); }
        .suggestion-btn { transition: all 0.3s ease !important; }
        .suggestion-btn:hover { background: rgba(30,144,255,0.12) !important; border-color: #1E90FF66 !important; color: #1E90FF !important; box-shadow: 0 0 20px #1E90FF22 !important; transform: translateY(-1px); }
        .company-badge { transition: all 0.3s ease !important; }
        .company-badge:hover { transform: translateY(-2px); filter: brightness(1.3); }
        .glass-card { backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
      `}</style>

      {/* Animated background layers */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {/* Base gradient */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 120% 80% at 20% -20%, #0D2347 0%, #07101F 40%, #050A15 70%)" }} />
        {/* Secondary glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(600px 400px at 80% 100%, #0A1E3D 0%, transparent 70%)" }} />
        {/* Dot pattern overlay */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "radial-gradient(#1E90FF 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

        {/* Floating orbs */}
        <div style={{
          position: "absolute", top: "8%", left: "5%", width: 120, height: 120, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #1E90FF33, #1E90FF11 40%, transparent 70%)",
          animation: "float1 12s ease-in-out infinite", filter: "blur(1px)",
          boxShadow: "0 0 40px #1E90FF22, inset 0 0 30px #1E90FF11",
        }} />
        <div style={{
          position: "absolute", top: "60%", right: "8%", width: 80, height: 80, borderRadius: "50%",
          background: "radial-gradient(circle at 40% 30%, #57B6FF22, #1E90FF0D 50%, transparent 70%)",
          animation: "float2 15s ease-in-out infinite", filter: "blur(1px)",
          boxShadow: "0 0 30px #1E90FF1A",
        }} />
        <div style={{
          position: "absolute", top: "30%", right: "15%", width: 50, height: 50, borderRadius: "50%",
          background: "radial-gradient(circle at 30% 30%, #89CEFF1A, transparent 60%)",
          animation: "float3 10s ease-in-out infinite",
          boxShadow: "0 0 20px #1E90FF11",
        }} />
        <div style={{
          position: "absolute", bottom: "15%", left: "12%", width: 60, height: 60, borderRadius: "50%",
          background: "radial-gradient(circle at 40% 35%, #1E90FF1A, transparent 60%)",
          animation: "float2 18s ease-in-out infinite reverse",
          boxShadow: "0 0 25px #1E90FF11",
        }} />
        <div style={{
          position: "absolute", top: "45%", left: "50%", width: 35, height: 35, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #57B6FF15, transparent 60%)",
          animation: "float1 20s ease-in-out infinite reverse",
        }} />
      </div>

      {/* Header */}
      <div className="glass-card" style={{
        borderBottom: "1px solid rgba(30,144,255,0.12)",
        padding: "0.9rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        background: "rgba(8,16,32,0.75)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        {/* Logo */}
        <div style={{
          width: 40, height: 40, borderRadius: "12px",
          background: "linear-gradient(135deg, #1E90FF, #0A5EB5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 25px #1E90FF44, 0 0 50px #1E90FF1A",
          animation: "orbGlow 4s ease-in-out infinite",
        }}>
          <span style={{ fontSize: "1.1rem", filter: "drop-shadow(0 0 4px #fff)" }}>⬡</span>
        </div>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', 'Space Mono', monospace", color: "#1E90FF",
            fontSize: "0.9rem", fontWeight: "700", letterSpacing: "0.15em",
            textShadow: "0 0 10px #1E90FF66, 0 0 30px #1E90FF22",
            animation: "neonPulse 4s ease-in-out infinite",
          }}>
            INTERVIEW RAG AGENT
          </h1>
          <p style={{ color: "#4A7DB8", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>
            {COMPANIES.length} knowledge bases • {Object.values(KNOWLEDGE_BASES).reduce((s, kb) => s + kb.questions.length, 0)} questions indexed
          </p>
        </div>

        {/* Company badges */}
        <div style={{ display: "flex", gap: "0.4rem", marginLeft: "auto", flexWrap: "wrap", maxWidth: "60%" }}>
          {COMPANIES.map((c) => (
            <div key={c} className="company-badge" style={{
              padding: "2px 8px", borderRadius: "4px", fontSize: "0.65rem",
              fontFamily: "'Space Mono', monospace", fontWeight: "bold",
              background: `${KNOWLEDGE_BASES[c].color}15`,
              border: `1px solid ${KNOWLEDGE_BASES[c].color}33`,
              color: KNOWLEDGE_BASES[c].color,
              textShadow: `0 0 8px ${KNOWLEDGE_BASES[c].color}44`,
              cursor: "default",
            }}>{c}</div>
          ))}
        </div>
      </div>

      {/* API key missing warning banner */}
      {!apiKeyPresent && (
        <div style={{
          background: "rgba(255,165,0,0.12)",
          border: "1px solid rgba(255,165,0,0.4)",
          borderRadius: "8px",
          padding: "0.7rem 1.2rem",
          margin: "0.75rem auto 0",
          maxWidth: "900px",
          width: "calc(100% - 3rem)",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          position: "relative",
          zIndex: 10,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}>
          <span style={{ fontSize: "1.25rem" }}>⚠️</span>
          <span style={{ color: "#FFA500", fontSize: "0.82rem", fontFamily: "'Space Mono', monospace", lineHeight: 1.5 }}>
            <strong>API Key Missing</strong> — VITE_GEMINI_API_KEY is not set. AI-powered answers are disabled.
            Set the environment variable in Render and redeploy, or add it to your local <code>.env</code> file.
          </span>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "1.5rem 1.5rem",
        maxWidth: "900px",
        width: "100%",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}>
        {messages.map((msg, i) => (
          <div key={i} className="msg-enter">
            <Message msg={msg} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{
          padding: "0 1.5rem 1rem",
          maxWidth: "900px",
          width: "100%",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}>
          <p style={{ color: "#3A6A9F", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace", marginBottom: "0.6rem", letterSpacing: "0.1em" }}>
            ◈ TRY ASKING
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                className="suggestion-btn"
                onClick={() => handleSend(s)}
                style={{
                  background: "rgba(30,144,255,0.05)",
                  border: "1px solid rgba(30,144,255,0.15)",
                  color: "#6B9FD4",
                  borderRadius: "8px",
                  padding: "0.45rem 0.9rem",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        borderTop: "1px solid rgba(30,144,255,0.1)",
        padding: "1rem 1.5rem",
        background: "rgba(8,16,32,0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        maxWidth: "900px",
        width: "100%",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-end",
          background: "rgba(10,20,40,0.6)",
          border: "1px solid rgba(30,144,255,0.15)",
          borderRadius: "14px",
          padding: "0.6rem 0.7rem",
          animation: "borderGlow 4s ease-in-out infinite",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}>
          <span style={{ color: "#1E90FF", fontFamily: "'Space Mono', monospace", fontSize: "0.8rem", marginBottom: "0.3rem", flexShrink: 0, textShadow: "0 0 8px #1E90FF66" }}>›</span>
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
              color: "#D0E0F0",
              fontSize: "0.88rem",
              fontFamily: "'Sora', sans-serif",
              lineHeight: 1.6,
              maxHeight: "120px",
              overflowY: "auto",
            }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            className="send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            style={{
              background: input.trim() && !loading ? "linear-gradient(135deg, #1E90FF, #3AA8FF)" : "rgba(30,144,255,0.1)",
              border: "none",
              borderRadius: "10px",
              width: 38, height: 38,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              flexShrink: 0,
              transition: "all 0.3s ease",
              color: input.trim() && !loading ? "#001830" : "#4a5f7f",
              fontSize: "1rem",
              boxShadow: input.trim() && !loading ? "0 0 20px #1E90FF44" : "none",
            }}
          >
            {loading ? "⏳" : "⬆"}
          </button>
        </div>
        <p style={{ textAlign: "center", color: "#2A4A6B", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace", marginTop: "0.5rem", letterSpacing: "0.05em" }}>
          Shift+Enter for new line • Enter to send
        </p>
      </div>
    </div>
  );
}
