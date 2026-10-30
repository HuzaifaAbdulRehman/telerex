# Verification record

Checked 30 October 2026, before the challenge deadline.

- Clean `npm ci`: successful; npm audit reported zero vulnerabilities.
- `npm test`: 30 passing behavioral and HTTP tests.
- `npm run build`: strict TypeScript check and Vite production build passed.
- `npm run test:browser`: seven passing Chromium tests, including keyboard input, JSON export, missing model, cancellation, incomplete streams and reduced-motion mobile layout.
- LSP diagnostics for the main React view and HTTP server: no errors.
- Real browser run: six local Gemma calls, complete JSON export, no page errors or nonlocal browser requests. The inspected 67-second video and screenshots use fictional stories and actual model outputs.
- Six initial cases: 36 calls. Two recorded repeats: 12 further calls. Original evidence preserved. Exact source, settings, model identity and changed-stage counts checked against the repeat records.
- Local document links and evaluation record structure checked.

The default app configuration correctly reported unavailable Ollama at port 11434. Changing the app port and Ollama endpoint to the project-only server at 11436 produced real ready metadata. A changed missing model produced MODEL_MISSING. The development server served transformed React code and the real health endpoint on another port.

A fresh whole-project review covered commit `40f7a65`. Two findings were fixed: default HTTP port normalization, and instructions for setting OLLAMA_HOST in both terminals. The HTTP fix has a regression test observed failing before the change and passing afterward. The full test suite, production build and browser checks then passed. Repeats added after that review received the consistency checks above; no second whole-project review was performed.

Choices: use the new empty clone as the isolated workspace; label factual review as assistant-authored; leave model/runtime nondeterminism unexplained; keep hosting and multiuser operation outside this local prototype. These limit claims about factuality, reproducibility and deployment readiness. No unresolved review finding was deferred.
