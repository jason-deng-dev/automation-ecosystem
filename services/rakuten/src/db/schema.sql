CREATE DATABASE rakutenDB;

CREATE TABLE
    categories (id SERIAL PRIMARY KEY, name TEXT);

CREATE TABLE subcategories (
  id SERIAL PRIMARY KEY,
  name TEXT,
  genre_id INTEGER,
  category_id INTEGER REFERENCES categories(id)
);



CREATE TABLE
    products (
        id SERIAL PRIMARY KEY,
        itemName TEXT,
        itemPrice INTEGER,
        itemCaption TEXT,
        itemURL TEXT,
        smallImageUrls JSONB,
		mediumImageUrls JSONB,
		reviewCount INTEGER,
		reviewAverage DECIMAL(3,2),
		shopName TEXT,
		shopCode TEXT,
        stock_status BOOLEAN,
        wc_product_id TEXT,
        wc_pushed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW (),
        last_updated_at TIMESTAMP DEFAULT NOW (),
        missed_scrapes INTEGER DEFAULT 0,
        subcategory_id INTEGER REFERENCES subcategories(id)
    );

