# Promptfolio

A local-first workspace for building, versioning, and evaluating structured prompts.

## Run

Requires Node.js 22 or newer. No dependencies or API keys are needed.

```sh
npm start
```

Open http://localhost:3000 in your browser. Set `PORT` to use a different port. `npm run dev` restarts the server when server files change. Run `npm test` for the model tests.

## Workflow

1. Create a project, then create a prompt with tags and role, objectives, context, tasks, and examples. A sample project is included on first use.
   Examples are a list: use **Add example** to create separate entries with an input, expected output, and optional notes. Edit or remove entries when creating a prompt or its next version. Existing text examples and older backups are preserved as a single entry. Example lists are included in prompt copying, version comparisons, and JSON backups.
2. Copy the prompt into your chosen AI tool. Replace input placeholders such as `{{transcript}}` yourself.
3. Open Evaluate for the relevant version. Record the test scenario, observed output, six quality ratings, and improvement notes. Scores are manual assessments, not AI-generated judgments. Low ratings generate targeted revision guidance.
4. Create the next version with a change note. Earlier versions and their evaluations remain intact. Select earlier versions and compare their fields in the Versions tab.
5. Export JSON backups regularly; import can restore a backup after confirmation.

Data is saved in localStorage in the current browser and origin. It is not shared between users, devices, browsers, or different ports. There is no account system, cloud synchronization, or automatic model execution. Clearing site data removes the library. If browser storage is unavailable, the app shows a warning and work can still be exported. The server only serves static application files and does not receive prompt content.

## Browser validation

With the server running, Playwright available in Node's module path, and Chromium installed, run `npm run test:browser`. Set `CHROMIUM_PATH` if Chromium is elsewhere. The check uses an isolated browser profile and exercises project and prompt creation, example scaffolds, evaluations and diagnosis, version comparison, reload persistence, JSON export/import, and mobile overflow. Screenshots and a test backup are written under `/tmp`.

Feedback includes result categories (too generic, incorrect, ambiguous, missed task, wrong format, invented facts) with diagnostic questions and practical techniques for each. The example helper creates editable scaffolds; it does not call an AI service.

## Prompting documentation

Open **Prompting guide** in the sidebar for an editable handbook. Starter sections cover prompt structure, representative examples, and feedback techniques. Use **Add section** or **Edit Markdown** to edit a section title and Markdown source with a live preview; press **Save section** to retain the changes. You can delete a section after confirmation, add sections from `.md` files (under 1 MB), and download individual sections as Markdown.

The preview supports headings, paragraphs, bold, italics, inline and fenced code, ordered and unordered lists, and blockquotes. Raw HTML is displayed as text; embedded HTML and external resources do not execute. Documentation is stored in the same browser library and included in JSON backups. Older backups without documentation receive starter sections; an intentionally empty documentation list stays empty.

For a server on a different port, set `APP_URL` when running the browser test, for example `APP_URL=http://127.0.0.1:3001 npm run test:browser`.

## Projects, roles, skills, and workflows

Use the sidebar planning views to prepare work manually:

- **Projects** store shared goals, context, and resources. Use **Edit project** to update these without changing prompt histories.
- **Skills** reuse the existing prompt records. Every existing prompt is available as a skill with its original versions, separate examples, evaluations, tags, and improvement guidance. **New skill** opens the structured prompt editor. Optional **Skill inputs** and **Expected outputs** are saved per version, included when copying, and compared alongside instructions.
- **Roles** define reusable responsibilities, expertise, activities, boundaries, and available skills. Save skills first, then select them when creating or editing a role. These role records are separate from the free-text role instructions in existing prompt versions.
- **Workflows** connect a project and a saved perspective role (**Acting as**) with an objective, decision authority, escalation boundaries, and success criteria. Add ordered steps with a responsible role, one of that role's available skills, a specific skill version, inputs, expected outputs, and an explicit handoff recipient and acceptance conditions. Steps can be moved, removed, and edited. A later skill revision does not change the version referenced by a saved workflow. A role's skill cannot be removed while a workflow step uses it.

For example, create a **QA Lead** role, give it the relevant saved skills, then plan **Release readiness** from that role's perspective. Add steps to assess release risk, prepare coverage, validate fixes, review unresolved defects, and produce a release recommendation. Record who accepts each output, and distinguish authority to recommend a release from authority to approve deployment. All execution and decision making remain manual; the app does not call AI services.

Planning records use the existing browser storage and JSON backup/restore. Older backups receive empty role and workflow collections without rewriting prompt histories or examples. Imports validate planning references before replacing the library. Backups containing planning data should be restored with this version of Promptfolio or newer.

Run `npm test` for model, documentation, migration, and planning-reference checks. With the app running and Chromium/Playwright available, run `npm run test:browser` for existing functionality and `npm run test:planning` for project context, role skills, ordered release planning, editing, version pinning, reload persistence, backup round trips, legacy imports, invalid reference rejection, and mobile layouts. Both browser commands support `APP_URL` and `CHROMIUM_PATH`.
