import "dotenv/config";
import { Client } from "pg";
const SQL = `
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS subcategories;
DROP TABLE IF EXISTS categories;

CREATE TABLE
    categories (id SERIAL PRIMARY KEY, name TEXT);

CREATE TABLE
    subcategories (
        id SERIAL PRIMARY KEY,
        name TEXT,
        genre_id INTEGER,
        category_id INTEGER REFERENCES categories (id)
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
        reviewAverage DECIMAL(3, 2),
        shopName TEXT,
        shopCode TEXT,
        availability INTEGER,
        wc_product_id TEXT,
        wc_pushed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW (),
        last_updated_at TIMESTAMP DEFAULT NOW (),
        missed_scrapes INTEGER DEFAULT 0,
        subcategory_id INTEGER REFERENCES subcategories (id)
    );

INSERT INTO
    categories (name)
VALUES
    ('Running Gear'),
    ('Training'),
    ('Nutrition & Supplements'),
    ('Recovery & Care'),
    ('Sportswear');

-- category_id: 1=Running Gear, 2=Training, 3=Nutrition & Supplements, 4=Recovery & Care, 5=Sportswear
INSERT INTO
    subcategories (name, genre_id, category_id)
VALUES
    ('Shoes', 565768, 1),
    ('Wear', 565767, 1),
    ('GPS/Watch', 565769, 1),
    ('Running Pouch', 568476, 1),
    ('Armbands/Smartphone Bands', 564507, 1),
    ('Insole', 568475, 1),
    ('Fitness Machines', 565772, 2),
    ('Wear', 201869, 2),
    ('Shoes', 565771, 2),
    ('Protein Shaker', 567756, 2),
    ('Track & Field', 205074, 2),
    ('Yoga / Pilates', 407916, 2),
    ('Triathlon', 568218, 2),
    ('Sports Drinks', 559936, 3),
    ('Protein', 567603, 3),
    ('Amino Acid', 567604, 3),
    ('Vitamin', 201485, 3),
    ('Mineral', 302658, 3),
    ('Dietary Fiber', 402614, 3),
    ('Collagen', 567605, 3),
    ('Citric Acid', 402589, 3),
    ('Probiotics', 208149, 3),
    ('Fatty Acids and Oils', 567611, 3),
    ('Massage Products', 214828, 4),
    ('Stretching Equipment', 214822, 4),
    ('Foot Care', 204750, 4),
    ('Sports Care Products', 565744, 4),
    ('Junior Apparel', 565778, 5),
    ('Women Apparel', 502027, 5),
    ('Men Apparel', 402463, 5),
    ('Sports Underwear', 565743, 5),
    ('Sports Bag', 208118, 5),
    ('Sportswear / Accessories', 551942, 5);


`;


async function main() {
	console.log('seeding...');
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});
	await client.connect();
	await client.query(SQL);
	await client.end();
	console.log('done');
}

main();
