-- Migration: 002_security_hardening.sql
-- Description: Fixes RLS issues and secures exposed tables.

-- ==============================================================================
-- 1. Enable RLS on all exposed tables
-- ==============================================================================

ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimizations ENABLE ROW LEVEL SECURITY;

-- Note: 'analyses' and 'fund_master' already have RLS enabled in migration 001.

-- ==============================================================================
-- 2. Master Data Tables (Public Read, Admin Write)
-- Tables: benchmarks, funds, navs, fund_master (update)
-- ==============================================================================

-- Benchmarks
DROP POLICY IF EXISTS "Public read access" ON public.benchmarks;
CREATE POLICY "Public read access" ON public.benchmarks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin insert access" ON public.benchmarks;
CREATE POLICY "Admin insert access" ON public.benchmarks FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admin update access" ON public.benchmarks;
CREATE POLICY "Admin update access" ON public.benchmarks FOR UPDATE USING (auth.role() = 'service_role');

-- Funds
DROP POLICY IF EXISTS "Public read access" ON public.funds;
CREATE POLICY "Public read access" ON public.funds FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin insert access" ON public.funds;
CREATE POLICY "Admin insert access" ON public.funds FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- NAVs
DROP POLICY IF EXISTS "Public read access" ON public.navs;
CREATE POLICY "Public read access" ON public.navs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin insert access" ON public.navs;
CREATE POLICY "Admin insert access" ON public.navs FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Fund Master (Fixing permissive policies)
DROP POLICY IF EXISTS "Public insert access" ON public.fund_master;
DROP POLICY IF EXISTS "Public update access" ON public.fund_master;

DROP POLICY IF EXISTS "Admin insert access" ON public.fund_master;
CREATE POLICY "Admin insert access" ON public.fund_master FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admin update access" ON public.fund_master;
CREATE POLICY "Admin update access" ON public.fund_master FOR UPDATE USING (auth.role() = 'service_role');
-- Keep "Public read access" from migration 001 if valid, or recreate:
-- CREATE POLICY "Public read access" ON public.fund_master FOR SELECT USING (true);


-- ==============================================================================
-- 3. Restricted Tables (Service Role Only)
-- Tables: users, clients, portfolios, optimizations
-- These tables do not appear to be used in the current frontend application.
-- To pass security checks (enable RLS) but avoid "uuid vs integer" type errors,
-- we will Enable RLS and providing NO public policies, effectively locking them down
-- to Service Role (Admin) access only.
-- ==============================================================================

-- RLS is already enabled in Section 1.
-- No policies = Default Deny All (except Service Role).

-- If access is needed in future, create specific policies like:
-- CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid()::text = id::text);

-- Keeping 'analyses' public insert as defined above.

-- Analyses (Fixing permissive policies)
DROP POLICY IF EXISTS "Public insert access" ON public.analyses;
DROP POLICY IF EXISTS "Public read access" ON public.analyses;
-- Since 'user_id' column does not appear to exist in the code usage (Step7FinalReport.jsx),
-- we will allow public inserts (anonymous analysis) but restrict updates/deletes.
CREATE POLICY "Public insert access" ON public.analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read access" ON public.analyses FOR SELECT USING (true);

-- If you want to link analyses to users, you must adding a user_id column first:
-- ALTER TABLE public.analyses ADD COLUMN user_id uuid REFERENCES auth.users(id);
-- Then enable: CREATE POLICY "Users can view own analyses" ...

-- ==============================================================================
-- 4. Cleanup & Corrections
-- ==============================================================================

-- Remove policies for tables that might not use standard auth (to avoid uuid=integer error)
-- If 'users' table has integer ID, it's likely a legacy or non-auth-linked table.
-- We will skip applying specific auth-linked policies to 'users', 'clients', 'portfolios'
-- unless we are sure of the schema.
-- Instead, we ensure they are ENABLED RLS so they aren't completely exposed.
-- (Users will need to define specific policies based on their actual schema).

-- For now, we revert RLS enable for potential integer-id tables to verify basic access works first
-- OR we apply a generic "Service Role Only" policy for safety if they are unused.
-- But given 'users' likely holds app data, we'll leave it RLS enabled but with a warning comment.

-- All policies handled in main sections above.
-- End of migration.

