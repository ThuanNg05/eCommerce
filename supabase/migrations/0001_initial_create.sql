CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    migration_id character varying(150) NOT NULL,
    product_version character varying(32) NOT NULL,
    CONSTRAINT pk___ef_migrations_history PRIMARY KEY (migration_id)
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260803042005_InitialCreate') THEN
    CREATE TABLE invoices (
        id uuid NOT NULL,
        number character varying(32) NOT NULL,
        customer_name character varying(256) NOT NULL,
        status integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        issued_at timestamp with time zone,
        subtotal numeric(18,2) NOT NULL,
        tax_rate numeric(6,4) NOT NULL,
        tax_amount numeric(18,2) NOT NULL,
        total numeric(18,2) NOT NULL,
        CONSTRAINT pk_invoices PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260803042005_InitialCreate') THEN
    CREATE TABLE products (
        id uuid NOT NULL,
        sku character varying(64) NOT NULL,
        name character varying(256) NOT NULL,
        description character varying(1024),
        unit_price numeric(18,2) NOT NULL,
        quantity_on_hand integer NOT NULL,
        reorder_level integer NOT NULL,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_products PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260803042005_InitialCreate') THEN
    CREATE TABLE invoice_lines (
        id uuid NOT NULL,
        invoice_id uuid NOT NULL,
        product_id uuid NOT NULL,
        sku character varying(64) NOT NULL,
        description character varying(512) NOT NULL,
        quantity integer NOT NULL,
        unit_price numeric(18,2) NOT NULL,
        line_total numeric(18,2) NOT NULL,
        CONSTRAINT pk_invoice_lines PRIMARY KEY (id),
        CONSTRAINT fk_invoice_lines_invoices_invoice_id FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
        CONSTRAINT fk_invoice_lines_products_product_id FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260803042005_InitialCreate') THEN
    CREATE INDEX ix_invoice_lines_invoice_id ON invoice_lines (invoice_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260803042005_InitialCreate') THEN
    CREATE INDEX ix_invoice_lines_product_id ON invoice_lines (product_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260803042005_InitialCreate') THEN
    CREATE INDEX ix_invoices_created_at ON invoices (created_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260803042005_InitialCreate') THEN
    CREATE UNIQUE INDEX ix_invoices_number ON invoices (number);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260803042005_InitialCreate') THEN
    CREATE INDEX ix_products_quantity_on_hand ON products (quantity_on_hand);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260803042005_InitialCreate') THEN
    CREATE UNIQUE INDEX ix_products_sku ON products (sku);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "migration_id" = '20260803042005_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
    VALUES ('20260803042005_InitialCreate', '8.0.11');
    END IF;
END $EF$;
COMMIT;

