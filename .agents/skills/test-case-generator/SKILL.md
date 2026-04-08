---
name: test-case-generator
description: Generates structured, requirement-driven test cases from PRDs, user stories, or code to ensure comprehensive QA coverage. Use when creating test plans, identifying edge cases, or generating Jest/Playwright test suites for API, web, or mobile apps.
---

# Test Case Generator

## Overview

The Test Case Generator skill streamlines the quality assurance process by transforming complex product requirements or code into detailed, actionable test cases. It ensures complete coverage across happy paths, edge cases, error handling, and state transitions, providing a clear traceability matrix between requirements and tests.

## Core Capabilities

### 1. Happy Path Testing
Focuses on the primary, intended use cases of the feature to ensure core functionality works as expected.
- **Example:** "A user successfully logs in with valid credentials and is redirected to the dashboard."

### 2. Edge Case & Boundary Analysis
Identifies and tests conditions at the extreme ends of input ranges or unusual usage patterns.
- **Example:** "Testing password fields with maximum character limits, or uploading files exactly at the size limit."

### 3. Error Handling & Negative Testing
Ensures the system gracefully handles invalid inputs and unexpected states.
- **Example:** "Submitting a form with missing required fields, or attempting to access a restricted resource without proper permissions."

### 4. State Transition Mapping
Maps how the application moves between different states (e.g., 'Draft' to 'Published') to ensure consistency and prevent invalid transitions.

## Workflow

### Step 1: Analyze Requirements
Read the PRD, user story, or source code to identify key functional requirements, data models, and business logic.

### Step 2: Generate Test Cases
Create structured test cases using the following format:
- **ID:** Unique identifier (e.g., TC-001)
- **Title:** Concise description of the test
- **Priority:** High/Medium/Low
- **Preconditions:** What must be true before the test starts
- **Steps:** Sequential actions to perform
- **Expected Result:** What the system should do
- **Actual Result:** (Placeholder for execution)

### Step 3: Map Traceability
Create a matrix linking each test case back to its original requirement (e.g., REQ-001 -> TC-001, TC-002).

### Step 4: Generate Implementation (Optional)
If requested, translate the structured test cases into executable code using the project's testing frameworks:
- **API Tests:** Jest with Supertest/Drizzle
- **Web/Mobile Tests:** Playwright or Jest/React Native Testing Library

## Best Practices
- **Pragmatic Testing:** Focus on high-impact areas first (Happy Paths and critical Errors).
- **Independence:** Each test case should be self-contained and not depend on the outcome of another.
- **Clear Assertions:** Define exactly what "success" looks like for every test.
- **Refer to Project Standards:** See [references/test-patterns.md](references/test-patterns.md) for project-specific examples.
