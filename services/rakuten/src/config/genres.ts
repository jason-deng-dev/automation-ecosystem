
const Genres = {
    Triathlon: 568218,
    'Track&Field': 205074,
    'Yoga / Pilates': 407916,
    'Running / Marathon': 509057,
    'Fitness / Training': 200170,
    'Sportswear / Accessories': 551942,
};

const trackAndFieldGenres = {
    'Junior apparel': 565778,
    'Women apparel': 502027,
    'Men apparel': 402463,
    'Middle/Long distance running shoes': 565780,
    'Short distance running shoes': 565779,
};

const yogaAndPilatesGenres = {
    Wear: 501880,
    'Yoga mat': 204688,
};

const runningAndMarathonGenres = {
    Shoes: 565768,
    Wear: 565767,
    'GPS/Watch': 565769,
    'Running Pouch': 568476,
    'Armbands/Smartphone Bands': 564507,
    Insole: 568475,
    'Trail Running Shoes': 302384,
    'Running Socks': 205085,
    'Running Cap': 200180,
    'Running Tights': 566225,
    'Compression Tights': 214635,
    'Reflective Vest': 101870,
    'Running Belt': 565220,
    'Leg Warmer': 568338,
    'Neck Warmer': 205132,
};

const fitnessAndTrainingGenres = {
    Wear: 201869,
    Shoes: 565771,
    'Protein Shaker': 567756,
    'Resistance Band': 200480,
    'Jump Rope': 208062,
};

const sportsApparelGenres = {
    'Sports Care Products': 565744,
    'Sports Underwear': 565743,
    'Sports Bag': 208118,
    'Sports Sunglasses': 208124,
    'Face Cover / Neck Cover': 568384,
    Windbreaker: 565741,
    'Sports Towel': 505980,
    'Arm Covers': 568211,
    'Sports Bra': 566228,
    'Running Shorts': 502019,
    'Compression Socks': 402401,
    'Sports Gloves': 101113,
    // Bibs/Vests: TODO — real Rakuten genre ID needed
};

const relaxAndMassageProducts = {
    'Massage Products': 214828,
    'Stretching Equipment': 214822,
    'Foot Care': 204750,
    'Massage Gun': 204202,
    'Foam Roller': 100985,
    'Icing / Cold Therapy': 208007,
    'Sports Taping': 302562,
    'Knee / Joint Support': 214656,
};

const consumableGenres = {
    'Sports Drinks': 559936,
    'Protein': 567603,
    'Amino Acid': 567604,
    'Vitamin': 201485,
    'Mineral': 302658,
    'Dietary Fiber': 402614,
    'Collagen': 567605,
    'Citric Acid': 402589,
    'Probiotics': 208149,
    'Fatty Acids and Oils': 567611,
    'BCAA': 567620,
    'Energy Gel': 508605,
    'Pre-workout': 402663,
};

const categories = {
    'Running Gear': [565768, 565767, 565769, 568476, 564507, 568475, 565780, 565779, 302384, 205085, 200180, 566225, 214635, 101870, 565220, 568338, 205132],
    'Training': [201869, 565771, 567756, 205074, 407916, 568218, 501880, 204688, 200480, 208062],
    'Nutrition & Supplements': [559936, 567603, 567604, 201485, 302658, 402614, 567605, 402589, 208149, 567611, 567620, 508605, 402663],
    'Recovery & Care': [214828, 214822, 204750, 565744, 204202, 100985, 208007, 302562, 214656],
    'Sportswear': [502027, 402463, 565743, 208118, 551942, 208124, 568384, 565741, 505980, 568211, 566228, 502019, 402401, 101113],
};

// Flat name → ID map passed to Claude for keyword genre assignment
const allGenres: Record<string, number> = {
    ...runningAndMarathonGenres,
    ...fitnessAndTrainingGenres,
    ...trackAndFieldGenres,
    ...yogaAndPilatesGenres,
    ...consumableGenres,
    ...relaxAndMassageProducts,
    ...sportsApparelGenres,
};

export { categories, allGenres };
