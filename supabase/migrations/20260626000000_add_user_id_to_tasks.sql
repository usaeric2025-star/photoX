-- Add user_id to tasks table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='tasks' AND COLUMN_NAME='user_id') THEN
    ALTER TABLE tasks ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Update RLS Policy
DROP POLICY IF EXISTS "Users can manage their own tasks" ON tasks;
CREATE POLICY "Users can manage their own tasks" ON tasks
  FOR ALL
  USING (auth.uid() = user_id);

-- Allow authenticated users to insert tasks with their own user_id
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
