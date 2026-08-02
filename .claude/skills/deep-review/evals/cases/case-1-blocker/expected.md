# What the reviewer MUST find. If it misses this, the gate is broken.
expect: BLOCKER — the API key is hardcoded in subject.ts instead of read from the environment

# What the reviewer MUST NOT do. A gate that flags everything is worthless.
must not: report a second BLOCKER — there is exactly one problem in this file
