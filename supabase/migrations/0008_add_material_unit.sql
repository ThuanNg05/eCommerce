-- Optional inventory unit for materials, for example kg, m, sheet, or piece.
-- The field is nullable so legacy rows remain valid. Applied via the Supabase SQL Editor.

alter table material add column if not exists unit varchar(50);
