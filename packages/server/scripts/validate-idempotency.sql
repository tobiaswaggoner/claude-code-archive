-- =============================================================================
-- Idempotency Validation Script
-- Checks for duplicate records that should not exist
-- =============================================================================

\echo '=========================================='
\echo 'Idempotency Validation Report'
\echo '=========================================='
\echo ''

-- -----------------------------------------------------------------------------
-- 1. Duplicate Git Commits (project_id + sha should be unique)
-- -----------------------------------------------------------------------------
\echo '1. Checking for duplicate Git commits...'

SELECT
    'DUPLICATE COMMITS' as issue,
    project_id,
    sha,
    COUNT(*) as count
FROM claude_archive.git_commit
GROUP BY project_id, sha
HAVING COUNT(*) > 1;

SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '   ✓ No duplicate commits found'
        ELSE '   ✗ Found duplicate commits!'
    END as result
FROM (
    SELECT project_id, sha
    FROM claude_archive.git_commit
    GROUP BY project_id, sha
    HAVING COUNT(*) > 1
) dups;

\echo ''

-- -----------------------------------------------------------------------------
-- 2. Duplicate Sessions (workspace_id + original_session_id should be unique)
-- -----------------------------------------------------------------------------
\echo '2. Checking for duplicate sessions...'

SELECT
    'DUPLICATE SESSIONS' as issue,
    workspace_id,
    original_session_id,
    COUNT(*) as count
FROM claude_archive.session
GROUP BY workspace_id, original_session_id
HAVING COUNT(*) > 1;

SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '   ✓ No duplicate sessions found'
        ELSE '   ✗ Found duplicate sessions!'
    END as result
FROM (
    SELECT workspace_id, original_session_id
    FROM claude_archive.session
    GROUP BY workspace_id, original_session_id
    HAVING COUNT(*) > 1
) dups;

\echo ''

-- -----------------------------------------------------------------------------
-- 3. Duplicate Entries (session_id + line_number should be unique)
-- -----------------------------------------------------------------------------
\echo '3. Checking for duplicate entries (by line number)...'

SELECT
    'DUPLICATE ENTRIES (line)' as issue,
    session_id,
    line_number,
    COUNT(*) as count
FROM claude_archive.entry
GROUP BY session_id, line_number
HAVING COUNT(*) > 1
LIMIT 20;

SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '   ✓ No duplicate entries found'
        ELSE '   ✗ Found duplicate entries!'
    END as result,
    COUNT(*) as duplicate_count
FROM (
    SELECT session_id, line_number
    FROM claude_archive.entry
    GROUP BY session_id, line_number
    HAVING COUNT(*) > 1
) dups;

\echo ''

-- -----------------------------------------------------------------------------
-- 4. Duplicate Entries by UUID (session_id + original_uuid should be unique)
-- -----------------------------------------------------------------------------
\echo '4. Checking for duplicate entries (by UUID)...'

SELECT
    'DUPLICATE ENTRIES (uuid)' as issue,
    session_id,
    original_uuid,
    COUNT(*) as count
FROM claude_archive.entry
WHERE original_uuid IS NOT NULL
GROUP BY session_id, original_uuid
HAVING COUNT(*) > 1
LIMIT 20;

SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '   ✓ No duplicate UUIDs found'
        ELSE '   ✗ Found duplicate UUIDs!'
    END as result,
    COUNT(*) as duplicate_count
FROM (
    SELECT session_id, original_uuid
    FROM claude_archive.entry
    WHERE original_uuid IS NOT NULL
    GROUP BY session_id, original_uuid
    HAVING COUNT(*) > 1
) dups;

\echo ''

-- -----------------------------------------------------------------------------
-- 5. Duplicate Workspaces (host + cwd should be unique)
-- -----------------------------------------------------------------------------
\echo '5. Checking for duplicate workspaces...'

SELECT
    'DUPLICATE WORKSPACES' as issue,
    host,
    cwd,
    COUNT(*) as count
FROM claude_archive.workspace
GROUP BY host, cwd
HAVING COUNT(*) > 1;

SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '   ✓ No duplicate workspaces found'
        ELSE '   ✗ Found duplicate workspaces!'
    END as result
FROM (
    SELECT host, cwd
    FROM claude_archive.workspace
    GROUP BY host, cwd
    HAVING COUNT(*) > 1
) dups;

\echo ''

-- -----------------------------------------------------------------------------
-- 6. Duplicate Git Repos (host + path should be unique)
-- -----------------------------------------------------------------------------
\echo '6. Checking for duplicate git repos...'

SELECT
    'DUPLICATE GIT REPOS' as issue,
    host,
    path,
    COUNT(*) as count
FROM claude_archive.git_repo
GROUP BY host, path
HAVING COUNT(*) > 1;

SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '   ✓ No duplicate git repos found'
        ELSE '   ✗ Found duplicate git repos!'
    END as result
FROM (
    SELECT host, path
    FROM claude_archive.git_repo
    GROUP BY host, path
    HAVING COUNT(*) > 1
) dups;

\echo ''

-- -----------------------------------------------------------------------------
-- 7. Duplicate Git Branches (git_repo_id + name should be unique)
-- -----------------------------------------------------------------------------
\echo '7. Checking for duplicate git branches...'

SELECT
    'DUPLICATE BRANCHES' as issue,
    git_repo_id,
    name,
    COUNT(*) as count
FROM claude_archive.git_branch
GROUP BY git_repo_id, name
HAVING COUNT(*) > 1;

SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '   ✓ No duplicate branches found'
        ELSE '   ✗ Found duplicate branches!'
    END as result
FROM (
    SELECT git_repo_id, name
    FROM claude_archive.git_branch
    GROUP BY git_repo_id, name
    HAVING COUNT(*) > 1
) dups;

\echo ''

-- -----------------------------------------------------------------------------
-- Summary Statistics
-- -----------------------------------------------------------------------------
\echo '=========================================='
\echo 'Record Counts'
\echo '=========================================='

SELECT 'projects' as table_name, COUNT(*) as count FROM claude_archive.project
UNION ALL
SELECT 'git_repos', COUNT(*) FROM claude_archive.git_repo
UNION ALL
SELECT 'git_branches', COUNT(*) FROM claude_archive.git_branch
UNION ALL
SELECT 'git_commits', COUNT(*) FROM claude_archive.git_commit
UNION ALL
SELECT 'workspaces', COUNT(*) FROM claude_archive.workspace
UNION ALL
SELECT 'sessions', COUNT(*) FROM claude_archive.session
UNION ALL
SELECT 'entries', COUNT(*) FROM claude_archive.entry
UNION ALL
SELECT 'tool_results', COUNT(*) FROM claude_archive.tool_result
UNION ALL
SELECT 'collectors', COUNT(*) FROM claude_archive.collector
ORDER BY table_name;

\echo ''
\echo '=========================================='
\echo 'Hosts in Database'
\echo '=========================================='

SELECT DISTINCT host, COUNT(*) as workspace_count
FROM claude_archive.workspace
GROUP BY host
ORDER BY host;

\echo ''
\echo 'Validation complete.'
