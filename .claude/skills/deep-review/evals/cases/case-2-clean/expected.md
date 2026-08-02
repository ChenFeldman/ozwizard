# The gate must stay quiet on correct code.
expect: no BLOCKER anywhere — verdict APPROVE or APPROVE-WITH-NITS

# The point of the pair: it must key on "committed", not on the word "key".
must not: call reading MAILER_API_KEY from the environment a secret — that is the correct pattern
