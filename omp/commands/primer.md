Prime yourself on this project before doing any work.

This is a method, not a checklist to complete. Adapt every step to what the
project actually is: a library, a service, a monorepo, a pile of scripts. Skip
what does not apply and say you skipped it. Reading everything is not the goal;
being able to answer section 7 is.

Sections 0 to 3 are cheap; redo them whenever you arrive. Sections 4 to 6 are
facts about the project rather than about your session, so if a previous session
already established them and nothing relevant has changed, carry them forward and
say you did rather than paying for them twice.

## 0. The project's own instructions outrank this file

Read these first, in this order, and prefer them wherever they disagree with
anything below:

- `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `CONTRIBUTING.md`
- The same files one directory up, and in any subproject you are about to touch
- A `LOCAL.md` or similarly uncommitted note, which often holds the operational
  knowledge nobody wanted in git

Some repos guard their documentation and will reject prose that restates a value
belonging in code. If a project tells you where numbers live, believe it.

## 1. Inventory, cheaply

- `git ls-files` for the true file list. Ignore what is gitignored.
- The manifest tells you the stack faster than any prose: `package.json`,
  `Cargo.toml`, `pyproject.toml`, `go.mod`, `*.csproj`.
- Whatever that manifest uses to declare tasks is the project's own idea of its
  workflow: a `scripts` block, a `Makefile`, a `justfile`, a `bacon.toml`, or a
  documented command list. Find it before inventing commands of your own. Some
  ecosystems keep it in the manifest and some keep it nowhere, in which case the
  project's own instructions from section 0 are the command list.
- How is the code partitioned, and what does the split buy? Workspace members,
  packages, modules, a pure core with the I/O at the edges. This is very often
  the one architectural fact section 7 asks you to name, so notice it early.
- `git log --oneline -20` and `git log --stat -3`. Recent commits show what is
  moving and what the author cares about right now.

## 2. Separate what is authoritative from what is stale

This is the step people skip and then pay for. Documentation drifts; code does
not. Establish the hierarchy for THIS project before trusting anything:

1. Behaviour you have observed yourself, just now
2. The code that implements it
3. Tests, which are executable claims about intent
4. Docs written by the same author as the code, dated or version-referenced
5. Prose with no date, no source and no test behind it

Actively look for contradictions between these, because finding one early is
worth an hour later. A comment naming a constant that the code no longer uses, a
README describing a removed flag, an architecture doc pointing at a moved file:
each is a sign the docs are decorative rather than maintained, which tells you
how much of the rest to trust.

When two sources disagree and it matters, settle it empirically. One command that
prints the real answer beats a long argument from documentation.

## 3. Find what will reject your change

Cheap to discover now, expensive to discover after you have written something:

- The gate the project runs before merge: `make check`, `npm test`,
  `cargo clippy`, a `check` script, a pre-commit config
- CI definitions under `.github/workflows`, `.gitlab-ci.yml`, `.gitea/workflows`
- What the gate actually checks, which is not always three separate configs. Some
  ecosystems fold type checking, linting and formatting into one command; others
  want a file each. Find the command first and the configuration only if you need
  it. "No linter" is often deliberate: do not add one uninvited.
- Custom guards: repos sometimes enforce their own invariants with a script.
  These are the most informative files in a codebase, because each one exists in
  response to a specific past mistake.

Run the gate once before you change anything, so you know it was green when you
arrived.

## 4. Understand the blast radius

- **Does any part of this act on the real world by itself?** A bot, an agent
  loop, a scheduled job, anything holding a live credential for an external
  account. Find it by name before touching anything near it. This is a category
  worse than a bad deploy, because it keeps running while you think.
- `git log` for incident-shaped commits: `fix:`, `revert:`, "stop X from Y-ing",
  "prevent". Past incidents are the cheapest possible map of where the sharp
  edges are, and they are usually undocumented anywhere else.
- Does this deploy anywhere, and does that target host anything else? A shared
  machine turns a careless cleanup command into someone else's outage.
- What is irreversible: data deletion, published artifacts, anything touching a
  live account or real money.
- If there is a database, what is the migration discipline? Forward-only or
  reversible, and may an applied migration ever be edited? Getting this wrong
  corrupts the ledger rather than just the data, and the rule is almost never
  discoverable from the migration files themselves.
- What is load-bearing but looks removable. Ask what a name is for before
  deleting it, especially when it looks redundant.

## 5. Map the neighbours

- Sibling repositories, and what each is authoritative for. Related projects
  frequently hold the domain knowledge, and re-deriving it is waste.
- External services: databases, auth providers, third-party APIs, queues.
- Which direction calls flow, and what happens when each dependency is absent.
  A project that degrades cleanly without a dependency is telling you that
  dependency is optional; treat it that way.
- Where credentials come from, and where they must never go.

## 6. Learn how a change is proven here

Before writing anything, know what evidence this project accepts:

- What do existing tests actually assert? Behaviour, or implementation detail?
- Are there fixtures, and are they real captures or synthetic?
- Is there a way to exercise the real thing, and is doing so safe?
- What is deliberately not tested, and why?

Match the existing convention. A project verified by frozen fixtures and one
verified by live integration tests want different work from you.

## 7. You are primed when you can answer these

Without looking anything up again:

- What does this project do, and for whom?
- What is the one architectural fact that, if I got it wrong, would make
  everything else I did wrong too?
- What command must pass before I commit, and what does it reject?
- Which docs here are maintained, and which are decorative?
- What is the most dangerous thing I could do, and what makes it dangerous?
- Which repository or service is authoritative for the domain I am about to
  change?
- How will I prove my change works, using this project's own idea of proof?

Cannot answer one of these? That is the next thing to investigate, and it is
usually faster to ask the user than to keep reading.

## Leaving the map better than you found it

If priming was harder than it should have been, say so and offer to fix it. A
missing pointer to a sibling repo, an undocumented gate, a stale constant: these
cost every future session the same tax you just paid.

Update documentation to match the project's own convention, not this file's. If
the project keeps values in code and pointers in prose, do that. Never add a
number to a document that a guard or a test already owns.
