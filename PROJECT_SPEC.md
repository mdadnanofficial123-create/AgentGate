# PROJECT SPECIFICATION: AgentGate (CI/CD AI Agent Guardrail)

> **Tagline:** The 15-Minute, Zero-Trust CI/CD Guardrail for AI Agents.

---

## 1. Project Overview & Vision

**AgentGate** is a lightweight, zero-trust evaluation gate for AI agents and LLM applications. It integrates directly into developer CI/CD workflows (e.g., GitHub Actions) to run automated, synthetic user conversations against staging AI agents before code or prompt updates reach production.

### Core Value Drivers
* **Zero-Trust Security:** Executes entirely inside the client's CI/CD runner—no customer data ever leaves their network.
* **Declarative Configuration:** YAML-first design allows Product Managers and QA leads to write test scenarios without writing code.
* **15-Minute Integration:** Drop a single `.github/workflows/agentgate.yml` action into any repository for instant coverage.

---

## 2. Problem Statement

AI agents are probabilistic. Updating a system prompt, modifying a RAG pipeline, or upgrading a model version often leads to unexpected side effects in production:

1. **Prompt Regression:** Fixing one edge case breaks handling for another.
2. **Multi-Turn Exploits:** Agents reveal private instructions after 3–5 back-and-forth messages.
3. **Silent Hallucinations & Schema Breaks:** Agents return invalid JSON or wrong facts.
4. **Manual Testing Bottleneck:** Engineers spend hours manually typing test messages into chat windows prior to release.

---

## 3. Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────┐
│                    DEVELOPER REPOSITORY                 │
│                                                         │
│   Git Push / PR ──► GitHub Action ──► eval.yaml Specs   │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    AGENTGATE RUNNER                     │
│                                                         │
│  ┌──────────────────┐        ┌───────────────────────┐  │
│  │  Simulated User  │ ─────► │  Staging Agent API    │  │
│  │ (Adversarial LLM)│ ◄───── │ (Target Application)  │  │
│  └──────────────────┘        └───────────────────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  EVALUATION & GATE PASS                 │
│                                                         │
│  1. Fast Regex / Schema Filters                         │
│  2. LLM-as-a-Judge Rubric (G-Eval Score)                │
│  3. HTML Dashboard + GitHub PR Status (Pass/Fail)       │
└─────────────────────────────────────────────────────────┘