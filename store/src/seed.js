// Starter catalogue. PRICES AND STOCK ARE SAMPLES — the owner should review
// and change them from the admin panel (Products) before going live.

export const slugify = (s) =>
  String(s).toLowerCase().replace(/["']/g, "").replace(/½/g, "half").replace(/¾/g, "three-quarter")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const CATEGORIES = [
  ["wires-cables", "Wires & Cables", "تاریں", "E", "wire"],
  ["switches-sockets", "Switches & Sockets", "سوئچ ساکٹ", "E", "switch"],
  ["breakers-boards", "Breakers & Boards", "بریکر", "E", "breaker"],
  ["lights-fans", "Lights & Fans", "لائٹیں پنکھے", "E", "bulb"],
  ["taps-mixers", "Taps & Mixers", "ٹونٹیاں", "S", "tap"],
  ["basins-commodes", "Basins & Commodes", "واش بیسن", "S", "basin"],
  ["pipes-fittings", "Pipes & Fittings", "پائپ فٹنگ", "S", "pipe"],
  ["water-drainage", "Water & Drainage", "پانی کا سامان", "S", "drop"],
  ["tools", "Hand & Power Tools", "اوزار", "H", "wrench"],
  ["fixings", "Fixings & Fasteners", "پیچ کیل", "H", "screw"],
  ["tapes-sealants", "Tapes, Glue & Sealants", "ٹیپ سلوشن", "H", "tape"],
  ["locks-doors", "Locks & Door Fittings", "تالے", "H", "lock"]
];

// [category, title, urdu, unit, price, compare, stock, featured, description, variants?]
// variants: [name, price, stock]
const PRODUCTS = [
  ["wires-cables", "House Wiring Cable (Single Core, PVC)", "وائرنگ تار", "coil (90 m)", 0, null, 0, 1,
    "Single-core, PVC-insulated copper cable for house wiring. Choose the size for your load: 3/29 for lights, 7/29 for sockets, 7/36 and 7/44 for ACs and mains.",
    [["3/29", 6500, 20], ["7/29", 11500, 15], ["7/36", 17500, 8], ["7/44", 26000, 5]]],
  ["wires-cables", "Flexible Twin Wire", "لچکدار تار", "metre", 0, null, 0, 0,
    "Two-core flexible wire for appliances, extension boards and fan points. Cut to the length you order.",
    [["23/76", 90, 500], ["40/76", 140, 400]]],
  ["wires-cables", "PVC Conduit Pipe", "کنڈیوٹ پائپ", "length", 0, null, 0, 0,
    "Rigid PVC conduit for concealed wiring inside walls and roofs.",
    [["3/4\"", 180, 120], ["1\"", 260, 90]]],
  ["wires-cables", "PVC Wire Casing (Patti)", "وائر پٹی", "length", 0, null, 0, 0,
    "Surface casing to run wires neatly along walls. Snap-on cover.",
    [["1\"", 120, 150], ["1.5\"", 170, 100]]],

  ["switches-sockets", "One-Way Switch", "سوئچ", "piece", 120, 150, 300, 0,
    "Standard 10A one-way switch module for modular plates."],
  ["switches-sockets", "3-Pin Socket 13A", "تھری پن ساکٹ", "piece", 260, null, 200, 0,
    "13A three-pin socket module for general appliances."],
  ["switches-sockets", "Switch Plate (Gang)", "سوئچ پلیٹ", "piece", 0, null, 0, 1,
    "Modular switch plate with frame. Pick the number of gangs (slots) you need.",
    [["2 gang", 180, 80], ["4 gang", 260, 80], ["6 gang", 340, 60], ["8 gang", 420, 40]]],
  ["switches-sockets", "Metal Back Box", "بیک باکس", "piece", 0, null, 0, 0,
    "Galvanised metal back box for concealed switch boards.",
    [["3×3", 90, 150], ["3×6", 140, 120], ["4×6", 170, 90]]],
  ["switches-sockets", "Fan Dimmer / Regulator", "پنکھا ریگولیٹر", "piece", 650, null, 60, 0,
    "Step-type fan regulator module with smooth speed control."],

  ["breakers-boards", "MCB Single Pole", "سنگل بریکر", "piece", 0, null, 0, 1,
    "Miniature circuit breaker for individual circuits. Pick the rating to match your wire size.",
    [["10A", 650, 40], ["16A", 650, 40], ["20A", 650, 35], ["32A", 750, 25]]],
  ["breakers-boards", "MCB Double Pole", "ڈبل بریکر", "piece", 0, null, 0, 0,
    "Double-pole breaker for main lines and AC circuits.",
    [["40A", 1900, 15], ["63A", 2400, 10]]],
  ["breakers-boards", "Change-Over Switch 63A", "چینج اوور", "piece", 2800, null, 12, 0,
    "Manual change-over between WAPDA and UPS / generator supply."],
  ["breakers-boards", "Distribution Box (DB)", "ڈی بی باکس", "piece", 0, null, 0, 0,
    "Surface or flush distribution box for MCBs, with DIN rail and cover.",
    [["4-way", 1800, 10], ["8-way", 2900, 8]]],

  ["lights-fans", "LED Bulb (Cool White)", "ایل ای ڈی بلب", "piece", 0, null, 0, 1,
    "Energy-saving LED bulb, B22 pin base, cool daylight.",
    [["9W", 280, 120], ["12W", 350, 150], ["18W", 520, 80], ["24W", 750, 50]]],
  ["lights-fans", "LED Tube Light 4 ft (20W)", "ٹیوب لائٹ", "piece", 750, null, 70, 0,
    "4-foot LED tube with batten, ready to fix."],
  ["lights-fans", "Ceiling Fan 56\"", "چھت کا پنکھا", "piece", 14500, 16000, 10, 1,
    "56-inch copper-winding ceiling fan with downrod and canopy."],
  ["lights-fans", "Exhaust Fan", "ایگزاسٹ فین", "piece", 0, null, 0, 0,
    "Metal exhaust fan for kitchens and bathrooms.",
    [["10\"", 3200, 15], ["12\"", 3800, 12]]],
  ["lights-fans", "Fan Capacitor", "پنکھا کپیسٹر", "piece", 0, null, 0, 0,
    "Replacement running capacitor for ceiling and pedestal fans.",
    [["2.5 µF", 220, 100], ["3.5 µF", 260, 80]]],

  ["taps-mixers", "Basin Mixer (Single Lever)", "بیسن مکسر", "piece", 6500, 7800, 14, 1,
    "Chrome single-lever hot and cold basin mixer with flexible connectors."],
  ["taps-mixers", "Bib Cock (Wall Tap)", "ٹونٹی", "piece", 1200, null, 50, 0,
    "Brass chrome wall tap for washrooms, kitchens and outdoor use."],
  ["taps-mixers", "Kitchen Sink Mixer", "کچن مکسر", "piece", 8500, null, 8, 0,
    "Swivel-spout kitchen mixer, hot and cold."],
  ["taps-mixers", "Muslim Shower Set", "مسلم شاور", "piece", 1400, null, 40, 1,
    "Hand shower with hose and wall holder."],
  ["taps-mixers", "Angle Valve", "اینگل والو", "piece", 650, null, 80, 0,
    "Chrome ½\" angle valve for basins, commodes and geysers."],

  ["basins-commodes", "Wash Basin with Pedestal", "واش بیسن", "set", 9500, null, 6, 0,
    "White ceramic wash basin with full pedestal."],
  ["basins-commodes", "One-Piece Commode", "کموڈ", "set", 32000, 36000, 3, 0,
    "One-piece ceramic commode with soft-close seat and dual flush."],
  ["basins-commodes", "Plastic Flush Tank", "فلش ٹینک", "piece", 3500, null, 12, 0,
    "Wall-mounted flush tank with fittings."],
  ["basins-commodes", "Steel Kitchen Sink (Single Bowl)", "کچن سنک", "piece", 7500, null, 7, 0,
    "Stainless steel single-bowl kitchen sink with drainer."],

  ["pipes-fittings", "PPR Pipe (4 m)", "پی پی آر پائپ", "length", 0, null, 0, 1,
    "PPR pressure pipe for hot and cold water lines.",
    [["½\"", 520, 100], ["¾\"", 780, 80], ["1\"", 1150, 60]]],
  ["pipes-fittings", "PPR Elbow", "پی پی آر ایلبو", "piece", 0, null, 0, 0,
    "90° PPR elbow, heat-fusion joint.",
    [["½\"", 35, 600], ["¾\"", 55, 400], ["1\"", 90, 250]]],
  ["pipes-fittings", "PPR Tee", "پی پی آر ٹی", "piece", 0, null, 0, 0,
    "Equal PPR tee, heat-fusion joint.",
    [["½\"", 45, 400], ["¾\"", 70, 300], ["1\"", 110, 200]]],
  ["pipes-fittings", "Brass Ball Valve", "بال والو", "piece", 0, null, 0, 0,
    "Full-bore brass ball valve with lever handle.",
    [["½\"", 750, 60], ["¾\"", 1100, 40], ["1\"", 1650, 30]]],
  ["pipes-fittings", "PVC Drainage Pipe 4\" (13 ft)", "سیوریج پائپ", "length", 1800, null, 25, 0,
    "4-inch PVC pipe for drainage and sewerage lines."],

  ["water-drainage", "Floor Drain (Steel Jaali)", "فرش جالی", "piece", 0, null, 0, 0,
    "Stainless steel floor drain with removable grating.",
    [["4\"", 450, 60], ["6\"", 650, 40]]],
  ["water-drainage", "Float Valve ½\"", "فلوٹ والو", "piece", 900, null, 30, 0,
    "Brass float valve to stop overflow in water tanks."],
  ["water-drainage", "Water Tank Float Switch", "فلوٹ سوئچ", "piece", 1500, null, 20, 0,
    "Automatic float switch to start and stop the water motor."],
  ["water-drainage", "Flexible Connection Pipe", "کنکشن پائپ", "piece", 0, null, 0, 0,
    "Braided steel connector for basins, commodes and geysers.",
    [["18\"", 280, 100], ["24\"", 340, 80]]],

  ["tools", "Combination Pliers 8\"", "پلاس", "piece", 950, null, 30, 0,
    "Insulated-grip combination pliers for electricians."],
  ["tools", "Screwdriver Set", "پیچ کس سیٹ", "set", 1500, null, 25, 0,
    "Flat and Phillips screwdrivers with magnetic tips."],
  ["tools", "Line Tester", "ٹیسٹر", "piece", 150, null, 150, 0,
    "Neon voltage tester screwdriver."],
  ["tools", "Pipe Wrench", "پائپ رینچ", "piece", 0, null, 0, 0,
    "Heavy-duty adjustable pipe wrench.",
    [["14\"", 2200, 12], ["18\"", 2900, 8]]],
  ["tools", "Impact Drill 13 mm", "ڈرل مشین", "piece", 9500, 11000, 6, 1,
    "Corded impact drill for brick, concrete, wood and metal."],
  ["tools", "Measuring Tape", "فیتہ", "piece", 0, null, 0, 0,
    "Steel measuring tape with lock.",
    [["5 m", 550, 40], ["7.5 m", 750, 30]]],

  ["fixings", "Rawl Plugs (Pack of 100)", "راول پلگ", "pack", 250, null, 80, 0,
    "Plastic wall plugs for screws in brick and concrete."],
  ["fixings", "Wood Screws (Box of 100)", "پیچ", "box", 0, null, 0, 0,
    "Countersunk wood screws.",
    [["1\"", 300, 50], ["1.5\"", 350, 50], ["2\"", 400, 40]]],
  ["fixings", "Cable Clips (Pack of 100)", "کیبل کلپ", "pack", 200, null, 90, 0,
    "Nail-in cable clips for surface wiring."],
  ["fixings", "Tower Bolt 6\"", "ٹاور بولٹ", "piece", 280, null, 60, 0,
    "Steel tower bolt for doors and windows."],

  ["tapes-sealants", "PVC Insulation Tape", "ٹیپ", "roll", 0, null, 0, 0,
    "Electrical insulation tape.",
    [["Single roll", 60, 400], ["Pack of 10", 550, 60]]],
  ["tapes-sealants", "Teflon Tape", "ٹیفلون ٹیپ", "roll", 50, null, 400, 0,
    "Thread seal tape for water fittings."],
  ["tapes-sealants", "PVC Solution (250 ml)", "سلوشن", "tin", 450, null, 50, 0,
    "Solvent cement for joining PVC pipes and fittings."],
  ["tapes-sealants", "Silicone Sealant", "سلیکون", "tube", 950, null, 30, 0,
    "Waterproof silicone for basins, sinks and glass."],

  ["locks-doors", "Padlock 50 mm", "تالا", "piece", 1100, null, 30, 0,
    "Hardened steel padlock with 3 keys."],
  ["locks-doors", "Mortise Lock Set", "مورٹس لاک", "set", 3500, null, 12, 0,
    "Mortise lock body with handles and keys."],
  ["locks-doors", "Door Handle (Pair)", "دروازے کا ہینڈل", "pair", 1800, null, 20, 0,
    "Stainless steel lever handles."],
  ["locks-doors", "Hydraulic Door Closer", "ڈور کلوزر", "piece", 3800, null, 8, 0,
    "Adjustable hydraulic door closer for medium doors."]
];

export function seed(db) {
  const insCat = db.prepare("INSERT INTO categories(slug, name, name_ur, trade, icon, sort) VALUES(?,?,?,?,?,?)");
  const catIds = {};
  CATEGORIES.forEach(([slug, name, ur, trade, icon], i) => {
    catIds[slug] = Number(insCat.run(slug, name, ur, trade, icon, i).lastInsertRowid);
  });
  const icons = Object.fromEntries(CATEGORIES.map((c) => [c[0], c[4]]));

  const insP = db.prepare(`INSERT INTO products(slug, title, title_ur, category_id, description, unit, price, compare_price, sku, stock, icon, featured)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insV = db.prepare("INSERT INTO variants(product_id, name, price, compare_price, sku, stock, sort) VALUES(?,?,?,?,?,?,?)");

  PRODUCTS.forEach(([cat, title, ur, unit, price, compare, stock, featured, desc, variants], i) => {
    const sku = "MS-" + String(1001 + i);
    let p = price, s = stock;
    if (variants) { p = Math.min(...variants.map((v) => v[1])); s = variants.reduce((a, v) => a + v[2], 0); }
    const id = Number(insP.run(slugify(title), title, ur, catIds[cat], desc, unit, p, compare, sku, s, icons[cat], featured).lastInsertRowid);
    if (variants) variants.forEach(([name, vp, vs], j) => insV.run(id, name, vp, null, `${sku}-${j + 1}`, vs, j));
  });

  db.prepare("INSERT INTO discounts(code, type, value, min_subtotal) VALUES(?,?,?,?)").run("WELCOME5", "percent", 5, 3000);
}
