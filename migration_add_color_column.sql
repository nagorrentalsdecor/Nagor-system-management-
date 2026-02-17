-- Migration: Add color column to items table
-- Date: 2026-02-17
-- Description: Adds an optional color field to inventory items

ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS color text null;

-- Add comment for documentation
COMMENT ON COLUMN public.items.color IS 'Optional color specification for inventory items (e.g., Red, Blue, White)';
