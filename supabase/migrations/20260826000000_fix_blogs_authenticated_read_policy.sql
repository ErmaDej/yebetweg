-- Restore read access to `blogs` for authenticated sessions.
--
-- Regression: after the custom-auth policy churn (20260729 / 20260730),
-- anonymous visitors can read `blogs` but ANY signed-in user receives zero
-- rows — which blanked the Knowledge Hub ("No matching articles") for every
-- logged-in user. All other content tables read correctly for both roles.
--
-- Fix: add a clean permissive SELECT policy for `authenticated`. Postgres
-- OR-combines permissive policies, so this restores access regardless of what
-- the pre-existing authenticated-scoped policy evaluates to. No destructive
-- changes; the anon read policy stays untouched.

DROP POLICY IF EXISTS "Authenticated users can read blogs" ON public.blogs;

CREATE POLICY "Authenticated users can read blogs"
ON public.blogs
FOR SELECT
TO authenticated
USING (true);
