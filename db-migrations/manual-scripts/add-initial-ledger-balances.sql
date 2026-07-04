-- Add initial balance entries for all existing accounts
-- This script creates the starting point for the account ledger

-- First, insert initial balance entries for each account
INSERT INTO account_ledger (
    transaction_type,
    description,
    debit_amount,
    credit_amount,
    balance,
    transaction_date,
    account_id,
    linked_entity_id,
    linked_entity_type,
    created_at,
    updated_at
)
SELECT 
    'Initial Balance' as transaction_type,
    CONCAT('Initial balance for ', a.name) as description,
    CASE 
        WHEN a.current_amount < 0 THEN ABS(a.current_amount)
        ELSE 0
    END as debit_amount,
    CASE 
        WHEN a.current_amount > 0 THEN a.current_amount
        ELSE 0
    END as credit_amount,
    COALESCE(a.current_amount, 0) as balance,
    NOW() as transaction_date, -- Using NOW() since account table doesn't have created_at
    a.id as account_id, -- No casting needed, both are UUID
    CONCAT('INIT-', a.id::text) as linked_entity_id,
    'Initial' as linked_entity_type,
    NOW() as created_at,
    NOW() as updated_at
FROM account a
WHERE NOT EXISTS (
    SELECT 1 
    FROM account_ledger al 
    WHERE al.account_id = a.id 
    AND al.linked_entity_type = 'Initial'
)
AND a.disable = false; -- Only add initial balances for active accounts

-- Now recalculate all existing ledger entry balances
-- This ensures all entries after the initial balance are correctly calculated
WITH ordered_ledger AS (
    SELECT 
        id,
        account_id,
        transaction_date,
        debit_amount,
        credit_amount,
        ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY transaction_date, id) as rn
    FROM account_ledger
),
running_balance AS (
    SELECT 
        l1.id,
        l1.account_id,
        SUM(COALESCE(l2.credit_amount, 0) - COALESCE(l2.debit_amount, 0)) as calculated_balance
    FROM ordered_ledger l1
    JOIN ordered_ledger l2 
        ON l1.account_id = l2.account_id 
        AND l2.rn <= l1.rn
    GROUP BY l1.id, l1.account_id
)
UPDATE account_ledger
SET balance = running_balance.calculated_balance
FROM running_balance
WHERE account_ledger.id = running_balance.id;

-- Verify the results
SELECT 
    al.id,
    a.name as account_name,
    al.transaction_date,
    al.transaction_type,
    al.description,
    al.debit_amount,
    al.credit_amount,
    al.balance
FROM account_ledger al
JOIN account a ON a.id = al.account_id
ORDER BY al.account_id, al.transaction_date, al.id;