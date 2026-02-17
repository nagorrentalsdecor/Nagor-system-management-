-- USERS & EMPLOYEES
create table
  public.employees (
    id uuid not null default gen_random_uuid (),
    name text not null,
    role text not null,
    phone text null,
    salary numeric null,
    join_date timestamp with time zone null default now(),
    status text null default 'ACTIVE'::text,
    loan_balance numeric null default 0,
    pending_deductions numeric null default 0,
    leave_balance numeric null default 0,
    performance_rating numeric null default 0,
    address text null,
    guarantor_phone text null,
    has_system_access boolean null default false,
    username text null,
    password text null,
    password_last_changed timestamp with time zone null,
    photo_url text null,
    guarantor_name text null,
    bank_account text null,
    mobile_money_account text null,
    ghana_card_front_url text null,
    ghana_card_back_url text null,
    temp_password text null,
    is_first_login boolean null default false,
    password_change_required boolean null default false,
    constraint employees_pkey primary key (id),
    constraint employees_username_key unique (username)
  ) tablespace pg_default;

-- ITEMS / INVENTORY
create table
  public.items (
    id uuid not null default gen_random_uuid (),
    name text not null,
    category text null,
    color text null,
    total_quantity integer not null default 0,
    quantity_in_maintenance integer null default 0,
    price numeric not null default 0,
    status text null default 'AVAILABLE'::text,
    image_url text null,
    constraint items_pkey primary key (id)
  ) tablespace pg_default;

-- CUSTOMERS
create table
  public.customers (
    id uuid not null default gen_random_uuid (),
    name text not null,
    phone text null,
    address text null,
    email text null,
    notes text null,
    total_rentals integer null default 0,
    id_card_url text null,
    guarantor_name text null,
    guarantor_phone text null,
    is_blacklisted boolean null default false,
    risk_notes text null,
    constraint customers_pkey primary key (id)
  ) tablespace pg_default;

-- BOOKINGS
create table
  public.bookings (
    id uuid not null default gen_random_uuid (),
    customer_id uuid null,
    customer_name text null,
    start_date timestamp with time zone null,
    end_date timestamp with time zone null,
    status text null default 'PENDING'::text,
    total_amount numeric null default 0,
    paid_amount numeric null default 0,
    late_fee numeric null default 0,
    notes text null,
    created_at timestamp with time zone null default now(),
    date_returned timestamp with time zone null,
    constraint bookings_pkey primary key (id),
    constraint bookings_customer_id_fkey foreign key (customer_id) references customers (id)
  ) tablespace pg_default;

-- BOOKING ITEMS (Junction Table)
create table
  public.booking_items (
    id uuid not null default gen_random_uuid (),
    booking_id uuid not null,
    item_id uuid not null,
    item_name text null,
    quantity integer not null default 1,
    price_at_booking numeric not null default 0,
    constraint booking_items_pkey primary key (id),
    constraint booking_items_booking_id_fkey foreign key (booking_id) references bookings (id) on delete cascade,
    constraint booking_items_item_id_fkey foreign key (item_id) references items (id)
  ) tablespace pg_default;

-- PENALTIES
create table
  public.penalties (
    id uuid not null default gen_random_uuid (),
    booking_id uuid not null,
    type text not null,
    amount numeric not null default 0,
    description text null,
    date timestamp with time zone null default now(),
    constraint penalties_pkey primary key (id),
    constraint penalties_booking_id_fkey foreign key (booking_id) references bookings (id) on delete cascade
  ) tablespace pg_default;

-- TRANSACTIONS
create table
  public.transactions (
    id uuid not null default gen_random_uuid (),
    date timestamp with time zone null default now(),
    amount numeric not null default 0,
    type text not null,
    description text null,
    booking_id uuid null,
    property_id text null,
    reference_number text null,
    status text null default 'PENDING'::text,
    submitted_by text null,
    approved_by text null,
    approval_notes text null,
    approved_at timestamp with time zone null,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null,
    constraint transactions_pkey primary key (id),
    constraint transactions_booking_id_fkey foreign key (booking_id) references bookings (id)
  ) tablespace pg_default;

-- AUDIT LOGS
create table
  public.audit_logs (
    id uuid not null default gen_random_uuid (),
    action text not null,
    details text null,
    user_id text null,
    user_name text null,
    timestamp timestamp with time zone null default now(),
    metadata jsonb null,
    constraint audit_logs_pkey primary key (id)
  ) tablespace pg_default;

-- SETTINGS
create table
  public.settings (
    id text not null,
    label text null,
    description text null,
    type text null,
    value text null,
    section text null,
    options jsonb null,
    constraint settings_pkey primary key (id)
  ) tablespace pg_default;

-- PAYROLL RUNS
create table
  public.payroll_runs (
    id uuid not null default gen_random_uuid (),
    month integer not null,
    year integer not null,
    total_amount numeric not null default 0,
    status text null default 'PENDING'::text,
    created_at timestamp with time zone null default now(),
    items jsonb null,
    constraint payroll_runs_pkey primary key (id)
  ) tablespace pg_default;
