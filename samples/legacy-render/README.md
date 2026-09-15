# Legacy render

A previously generated CV (`index.html`) and the stylesheet it was built against, kept only as a
sample of what the pipeline produces. Nothing in `src/`, `tests/` or `config.yaml` references it.

It used to live in `public/`. That folder was moved here because Vite treats a `public/` directory as
a static asset root and copies its contents verbatim over the built site, which would have replaced
the web app's `index.html` with this CV.

The canonical base CV and stylesheet are in [`original/`](../../original/).
