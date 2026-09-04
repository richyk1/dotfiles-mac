 ## Prompt
 
 Set up project documentation structure for this new project.
 
 Create the following:
 
 1. \*CLAUDE.md\* (project root) - Concise (<40 lines) entry point with:
     - One-line hypothesis/goal
     - "Start Here" pointing to docs/ROADMAP.md
     - Quick Reference (key commands)
     - Key Files table
     - Documentation links
     - "End of Session" protocol (append to docs/session_log.md)
 
 2. \*docs/ROADMAP.md\* - Status dashboard:
     - Current state table (what exists)
     - Blockers table (with links to plans)
     - Priority actions table (with links to plans)
     - Success criteria (minimum + publishable)
 
 3. \*docs/plans/\* directory with plan templates:
     - Each plan: Priority, Status, Depends on, Problem, Goal, Steps, Success Criteria
     - Name format: plan_descriptive_name.md (not numbered)
 
 4. \*docs/runbook.md\* - Common operations:
     - How to add new data sources
     - How to run analysis
     - How to run tests
 
 5. \*docs/session_log.md\* - Work history:
     - Template for session entries
     - "Prior Sessions" section for context
 
 6. \*docs/archive/\* - For completed/old docs
 
 If this is a data pipeline project, also set up:
  - SQLAlchemy + Pydantic architecture (see sqlalchemy_pydantic_template.zip)
  - tests/ directory with pytest structure
 - you can copy the file from ./generic_claude_project_src.zip to the current folder and unzip the copy. DO NOT modify the original file or try to move the original file
 
 Keep all docs concise. Link between docs rather than duplicating.
 
 ---
 
 ## After Setup Checklist
 
 - [ ] CLAUDE.md is <50 lines
  - [ ] ROADMAP.md fits on one screen
  - [ ] Each plan has clear success criteria
  - [ ] runbook.md has actual commands (not placeholders)
  - [ ] session_log.md has first entry from setup session
