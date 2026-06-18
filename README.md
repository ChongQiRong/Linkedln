# Job Tailor

A Next.js web app for general job seekers. The user fills in one form, the app researches the target company, then outputs a tailored resume, cover letter, and tailoring rationale. Each output is viewable in a tab and downloadable as PDF or DOCX.

## Implemented

- Screen 1: single scrollable input form with sections A-H
- Repeatable Work Experience, Education, and Projects blocks
- Backend validation for required workflow fields
- Screen 2: loading/progress stages
- Screen 3: Resume / Cover Letter / Tailoring Rationale tabs
- PDF and DOCX export for each tab
- Sequential backend pipeline for parsing, research, relevance mapping, document generation, and rationale

## Company research

Set this environment variable for live company search:

```bash
TAVILY_API_KEY=your_key_here
```

Without it, the app still runs using job-description/profile-derived signals and displays a research warning.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
```
