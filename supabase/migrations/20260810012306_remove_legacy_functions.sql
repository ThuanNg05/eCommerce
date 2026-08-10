-- These functions belong to the retired plural-table schema from the previous
-- application (products, invoices, invoice_details, inventorytransactions,
-- materials, listplanks and detailprices). The current .NET application uses
-- the singular-table schema and implements these workflows in backend services.
--
-- Use exact signatures and RESTRICT (the default) so the migration fails rather
-- than silently removing an unexpected dependent object.

begin;

drop function if exists public.calculate_product_base_price() restrict;
drop function if exists public.delete_invoice_and_revert(text) restrict;
drop function if exists public.process_frame_to_planks(text, integer, bigint, jsonb) restrict;
drop function if exists public.increment_inventory(text, integer) restrict;
drop function if exists public.update_all_products_on_price_change() restrict;
drop function if exists public.create_full_invoice(jsonb, jsonb, jsonb) restrict;
drop function if exists public.get_annual_report(integer) restrict;

commit;
