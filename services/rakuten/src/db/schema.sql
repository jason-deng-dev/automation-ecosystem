CREATE TABLE
    categories (id SERIAL PRIMARY KEY, name TEXT);

CREATE TABLE
    subcategories (
        id SERIAL PRIMARY KEY,
        name TEXT,
        genre_ids INTEGER[],
        category_id INTEGER REFERENCES categories (id)
    );

CREATE TABLE
    products (
        id SERIAL PRIMARY KEY,
        itemName TEXT,
        itemPrice INTEGER,
        itemCaption TEXT,
        itemURL TEXT UNIQUE,
        smallImageUrls JSONB,
        mediumImageUrls JSONB,
        reviewCount INTEGER,
        reviewAverage DECIMAL(3, 2),
        shopName TEXT,
        shopCode TEXT,
        availability INTEGER,
        wc_product_id INTEGER,
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
    subcategories (name, genre_ids, category_id)
VALUES
    ('Shoes', ARRAY[565768, 206878, 206906, 403961, 509058, 563969, 565850], 1),
    ('Wear', ARRAY[565767, 205055, 302491, 304000, 501879, 509066, 565849], 1),
    ('GPS/Watch', ARRAY[565769, 101904, 301981, 302181, 554973, 564895, 568380], 1),
    ('Running Pouch', ARRAY[568476, 302518, 303257, 304904, 402303, 567450], 1),
    ('Armbands/Smartphone Bands', ARRAY[564507, 560271, 560287], 1),
    ('Insole', ARRAY[568475, 216173, 568478, 568503], 1),
    ('Wear', ARRAY[201869, 201872, 206709, 409365, 501876, 565899], 2),
    ('Shoes', ARRAY[565771, 201873, 204982, 302277, 564562, 565922, 568212], 2),
    ('Protein Shaker', ARRAY[567756, 567617, 567619], 2),
    ('Track & Field', ARRAY[205074, 201958, 302523, 302542, 402483, 502013, 502026, 502028, 502034, 551180], 2),
    ('Yoga / Pilates', ARRAY[407916, 204700, 400795, 565770], 2),
    ('Triathlon', ARRAY[568218, 101954, 208817, 208945, 209068, 402369, 407693, 501753, 505779, 565737, 567264], 2),
    ('Sports Drinks', ARRAY[559936, 402279], 3),
    ('Protein', ARRAY[567603, 200946, 214194, 567615, 567616], 3),
    ('Amino Acid', ARRAY[567604, 216307, 402631, 550091, 567621, 567623], 3),
    ('Vitamin', ARRAY[201485, 100991, 100992, 100993, 100995, 101033, 402594, 402667, 567602, 567607, 567625], 3),
    ('Mineral', ARRAY[302658, 201489, 214787, 564996], 3),
    ('Dietary Fiber', ARRAY[402614, 101020, 204771, 208151, 214781, 402571], 3),
    ('Collagen', ARRAY[567605, 302654, 402726, 554985, 567606], 3),
    ('Citric Acid', ARRAY[402589, 101784, 101839, 216012, 216027, 216834, 568537], 3),
    ('Probiotics', ARRAY[208149, 208150, 407992, 407994, 407996, 407997, 567624], 3),
    ('Fatty Acids and Oils', ARRAY[567611, 201258, 201260, 201491, 402546, 567639, 567640], 3),
    ('Massage Products', ARRAY[214828, 101049, 101877, 204748, 204749, 210695, 214811, 214830, 214835, 215525, 402748, 403731, 510096, 565119, 566718, 567515], 4),
    ('Stretching Equipment', ARRAY[214822, 204696, 208215, 214823, 214826, 565120], 4),
    ('Foot Care', ARRAY[204750, 210676, 212528, 304760, 304761, 403975, 553421], 4),
    ('Sports Care Products', ARRAY[565744], 4),
    ('Junior Apparel', ARRAY[565778, 213870, 214507, 214508, 501797, 565825, 566063], 5),
    ('Women Apparel', ARRAY[502027], 5),
    ('Men Apparel', ARRAY[402463], 5),
    ('Sports Underwear', ARRAY[565743, 200851, 201812, 206695, 213906, 302237, 554954, 565795, 566003], 5),
    ('Sports Bag', ARRAY[208118, 110976, 111926, 206858, 210811, 302529, 303213, 402145, 402300, 408789, 508414, 566334, 567262], 5),
    ('Sportswear / Accessories', ARRAY[551942, 101801, 112905, 201870, 303656, 501882, 553029, 565900, 565902], 5),
    ('Sports Sunglasses', ARRAY[208124, 110894, 200175], 5),
    ('Face Cover / Neck Cover', ARRAY[568384, 208212], 5),
    ('Windbreaker', ARRAY[565741, 214494, 214504, 500996, 502530, 551933, 555087, 558873, 563887, 565905, 566037, 566094], 5),
    ('Sports Towel', ARRAY[505980, 101841, 301059, 551732, 551736], 5),
    ('Arm Covers', ARRAY[568211, 100691, 101836, 403755, 403761, 502556, 565293], 5),
    ('Middle/Long Distance Running Shoes', ARRAY[565780, 502009, 565890, 565891], 1),
    ('Short Distance Running Shoes', ARRAY[565779, 502011, 565889], 1),
    ('Trail Running Shoes', ARRAY[302384, 509075], 1),
    ('Running Socks', ARRAY[205085, 403725, 408907, 551939, 566226], 1),
    ('Running Cap', ARRAY[200180, 403736, 408922], 1),
    ('Running Tights', ARRAY[566225, 304049, 501874], 1),
    ('Compression Tights', ARRAY[214635, 304002, 501872, 510833, 510851, 562553, 565908], 1),
    ('Running Belt', ARRAY[565220, 101893, 302551, 303235, 408791], 1),
    ('Leg Warmer', ARRAY[568338, 101888, 562555], 1),
    ('Neck Warmer', ARRAY[205132, 207314, 408914, 564008], 1),
    ('Yoga Wear', ARRAY[501880, 206440, 206725, 501881, 501883], 2),
    ('Yoga Mat', ARRAY[204688, 204689, 214824, 214829], 2),
    ('Resistance Band', ARRAY[200480, 565859], 2),
    ('Jump Rope', ARRAY[208062, 302252], 2),
    ('BCAA', ARRAY[567620], 3),
    ('Energy Gel', ARRAY[508605, 100286, 100304, 101886, 201490, 203252, 302661, 408052, 508618, 563197], 3),
    ('Pre-workout', ARRAY[402663, 111907], 3),
    ('Massage Gun', ARRAY[204202, 212524], 4),
    ('Foam Roller', ARRAY[100985, 568297, 568340], 4),
    ('Icing / Cold Therapy', ARRAY[208007, 214257, 563786, 565793], 4),
    ('Sports Taping', ARRAY[302562], 4),
    ('Knee / Joint Support', ARRAY[214656, 402778], 4),
    ('Sports Bra', ARRAY[566228, 110854], 5),
    ('Running Shorts', ARRAY[502019, 558846, 567589], 5),
    ('Compression Socks', ARRAY[402401, 111969, 402360, 407692, 506143], 5),
    ('Sports Gloves', ARRAY[101113, 101991, 207685, 303413, 304542, 402511, 407691, 505948, 551938, 565855], 5);
