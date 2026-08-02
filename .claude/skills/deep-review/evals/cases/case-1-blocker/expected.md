# The finding the run must contain for this case to pass.
expect: BLOCKER — hardcoded ADVISORY_API_KEY fallback in src/util/config.ts
# The false alarm that fails the case even when the expected finding is present.
must not: flag the zod defaults for PORT/HOST/LOG_LEVEL — they are intended
