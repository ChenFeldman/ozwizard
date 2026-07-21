# Package fact — `deb` (Debian / APT) advisory metadata is per-**repository**

A quirk a reviewer must know to review the scanner correctly. It is **not visible
in the code**: the code path for `deb` looks identical to `npm`/`pypi`, but the
runtime cost is completely different.

## The fact

For `npm` and `pypi`, advisory/metadata is **per package**: to check one package
you fetch one small record. Grouping these ecosystems and processing them one
dependency at a time inside a request is fine — each lookup is tiny.

For **`deb`**, advisory/metadata is **per repository**, not per package. A Debian
repository publishes a single index (the `Packages` / `Sources` file) that lists
**thousands of packages at once**. There is no cheap "just this one package"
fetch — the unit of retrieval and parsing is the whole repository index.

## Why per-request processing fails

If the scanner treats `deb` like a per-package ecosystem and loads its source
**inside the per-dependency loop**, then for an artifact with N `deb` dependencies
it loads and parses the entire repository index **N times** within one request.
On a real repository index this is seconds of parse work per pass, so a handful
of dependencies blows past the **30-second request timeout** and the scan fails.

The mock data hides this: the in-memory advisory list is tiny, so the code
_runs_ fine in the demo. In production against a real `deb` repository it times
out. That is exactly why this bug is only catchable **with this fact** — the code
is structurally wrong for `deb` while looking correct.

## The correct approach

`deb` repository indexes must be **pre-computed once** (offline / cached ingest),
producing a per-package lookup table that a request reads from. The per-request
scan path must **never** parse a `deb` repository index per dependency (or even
once per request) — it looks up already-ingested data.

So `deb` does **not** belong in the "load per package, inside the request loop"
group. It needs a pre-computed source, resolved before the request runs.
