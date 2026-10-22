BEGIN;

CREATE TABLE customers (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name TEXT NOT NULL
        CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),

    email TEXT NOT NULL UNIQUE
        CHECK (
            email = lower(btrim(email))
            AND char_length(email) BETWEEN 3 AND 254
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;