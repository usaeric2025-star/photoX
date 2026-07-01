ALTER TABLE furniture_items ALTER COLUMN name TYPE text USING (COALESCE(name->>'en', name->>'zh', ''));
