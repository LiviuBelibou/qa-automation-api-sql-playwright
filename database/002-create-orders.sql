BEGIN;

CREATE TABLE orders (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    customer_id INTEGER NOT NULL
        REFERENCES customers(id) ON DELETE RESTRICT,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'cancelled')),

    currency TEXT NOT NULL DEFAULT 'EUR'
        CHECK (currency = 'EUR'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_id INTEGER NOT NULL
        REFERENCES orders(id) ON DELETE CASCADE,

    product_name TEXT NOT NULL
        CHECK (char_length(btrim(product_name)) BETWEEN 1 AND 100),

    quantity INTEGER NOT NULL
        CHECK (quantity BETWEEN 1 AND 1000),

    unit_price_cents INTEGER NOT NULL
        CHECK (unit_price_cents BETWEEN 1 AND 1000000)
);

CREATE INDEX orders_customer_id_idx
    ON orders (customer_id);

CREATE INDEX order_items_order_id_idx
    ON order_items (order_id);

COMMIT;