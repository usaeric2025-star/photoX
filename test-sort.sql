CREATE TEMP TABLE test_pin (id INT, is_pinned BOOLEAN);
INSERT INTO test_pin VALUES (1, NULL), (2, TRUE), (3, FALSE), (4, NULL);
SELECT * FROM test_pin ORDER BY is_pinned DESC;
