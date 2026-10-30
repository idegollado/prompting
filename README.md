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
