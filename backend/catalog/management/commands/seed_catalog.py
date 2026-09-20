from django.core.management.base import BaseCommand

from catalog.models import GarmentType, PrintZone, GarmentStyleOption

DEPT = GarmentType.Department
CAT = GarmentType.Category

# svg_key, slug, name, department, category, base price, description
GARMENTS = [
    ('tee', 'classic-tee', 'Classic Tee', DEPT.UNISEX, CAT.TEES, 699.00,
     'A regular-fit crew-neck tee — the everyday canvas.'),
    ('womens-tee', 'womens-tee', "Women's Tee", DEPT.WOMEN, CAT.TEES, 699.00,
     'Scoop neck with a shaped waist and a softly curved hem.'),
    ('tank', 'tank-top', 'Tank Top', DEPT.UNISEX, CAT.TEES, 549.00,
     'Sleeveless, wide armholes — warm-weather printing.'),
    ('crop-top', 'crop-top', 'Crop Top', DEPT.WOMEN, CAT.TEES, 649.00,
     'Cropped at the waist with a straight hem.'),
    ('polo', 'polo-shirt', 'Polo Shirt', DEPT.UNISEX, CAT.SHIRTS, 999.00,
     'Ribbed collar and a three-button placket. Takes embroidery well.'),
    ('shirt', 'formal-shirt', 'Formal Shirt', DEPT.UNISEX, CAT.SHIRTS, 1299.00,
     'Full-placket button-through shirt with a curved shirttail hem.'),
    ('sweatshirt', 'sweatshirt', 'Sweatshirt', DEPT.UNISEX, CAT.SWEATS, 1199.00,
     'Midweight crew-neck with ribbed cuffs and hem.'),
    ('hoodie', 'pullover-hoodie', 'Pullover Hoodie', DEPT.UNISEX, CAT.SWEATS, 1399.00,
     'Midweight pullover hoodie with a kangaroo pocket and drawstrings.'),
    ('womens-hoodie', 'womens-hoodie', "Women's Hoodie", DEPT.WOMEN, CAT.SWEATS, 1399.00,
     'Fitted pullover hoodie with a shaped waist.'),
    ('bomber', 'bomber-jacket', 'Bomber Jacket', DEPT.UNISEX, CAT.OUTERWEAR, 2499.00,
     'Full-zip bomber with a mandarin collar and ribbed trims.'),

    # ---- Indian & ethnic wear ----
    ('kurta', 'mens-kurta', "Men's Kurta", DEPT.MEN, CAT.ETHNIC, 1499.00,
     'Straight-cut kurta with a mandarin collar, side slits and a short placket.'),
    ('kurti', 'kurti', 'Kurti', DEPT.WOMEN, CAT.ETHNIC, 1299.00,
     'A-line kurti with a V neck, three-quarter sleeves and side slits.'),
    ('anarkali', 'anarkali', 'Anarkali', DEPT.WOMEN, CAT.ETHNIC, 2499.00,
     'Fitted bodice falling into a full flared sweep.'),
    ('salwar-kameez', 'salwar-kameez', 'Salwar Kameez', DEPT.WOMEN, CAT.ETHNIC, 2199.00,
     'Long kameez with a mandarin neckline and deep side slits.'),
    ('saree-blouse', 'saree-blouse', 'Saree Blouse', DEPT.WOMEN, CAT.ETHNIC, 899.00,
     'Cropped fitted blouse with cap sleeves.'),
    ('sherwani', 'sherwani', 'Sherwani', DEPT.MEN, CAT.ETHNIC, 6999.00,
     'Full-length ceremonial sherwani with a buttoned placket.'),
    ('nehru-jacket', 'nehru-jacket', 'Nehru Jacket', DEPT.MEN, CAT.ETHNIC, 1999.00,
     'Sleeveless mandarin-collar jacket worn over a kurta.'),
    ('lehenga', 'lehenga', 'Lehenga', DEPT.WOMEN, CAT.ETHNIC, 5999.00,
     'Floor-length flared skirt with a gathered waistband.'),
    ('dupatta', 'dupatta', 'Dupatta', DEPT.WOMEN, CAT.ETHNIC, 699.00,
     'A long draped stole — a wide, uninterrupted print surface.'),

    # ---- dresses & accessories ----
    ('dress', 'a-line-dress', 'A-Line Dress', DEPT.WOMEN, CAT.DRESSES, 1699.00,
     'Scoop neck falling into a clean A-line skirt.'),
    ('tote', 'tote-bag', 'Tote Bag', DEPT.UNISEX, CAT.ACCESSORIES, 449.00,
     'Heavy cotton tote — a big flat panel, the easiest thing to print.'),
    ('cap', 'cap', 'Cap', DEPT.UNISEX, CAT.ACCESSORIES, 499.00,
     'Six-panel cap. Front panel suits embroidery more than print.'),
]

# Print zones are the *recommended* max print area per side. Artwork can now
# be placed anywhere on the garment, so these are a guide rather than a
# constraint — they mark where a press can actually reach.
# svg_key: (front zone, back zone) as x, y, w, h
ZONES = {
    'tee': ((62, 92, 76, 92), (62, 88, 76, 100)),
    'womens-tee': ((66, 92, 68, 82), (66, 88, 68, 90)),
    'tank': ((70, 92, 60, 86), (70, 88, 60, 92)),
    'crop-top': ((68, 88, 64, 48), (68, 86, 64, 50)),
    'polo': ((62, 104, 76, 80), (62, 92, 76, 96)),
    'shirt': ((62, 104, 76, 80), (62, 92, 76, 100)),
    'sweatshirt': ((62, 92, 76, 92), (62, 88, 76, 100)),
    'hoodie': ((64, 96, 72, 50), (62, 92, 76, 100)),
    'womens-hoodie': ((68, 94, 64, 46), (66, 90, 68, 94)),
    'bomber': ((66, 96, 68, 80), (62, 92, 76, 92)),
    'kurta': ((62, 118, 76, 108), (62, 96, 76, 140)),
    'kurti': ((66, 100, 68, 110), (66, 94, 68, 126)),
    'anarkali': ((66, 96, 68, 90), (66, 92, 68, 100)),
    'salwar-kameez': ((66, 104, 68, 116), (66, 96, 68, 132)),
    'saree-blouse': ((70, 84, 60, 32), (70, 82, 60, 34)),
    'sherwani': ((62, 110, 76, 130), (62, 96, 76, 154)),
    'nehru-jacket': ((64, 92, 72, 88), (62, 88, 76, 98)),
    'lehenga': ((44, 120, 112, 118), (44, 120, 112, 118)),
    'dupatta': ((48, 60, 104, 156), (48, 60, 104, 156)),
    'dress': ((66, 92, 68, 104), (66, 88, 68, 112)),
    'tote': ((52, 110, 96, 110), (52, 110, 96, 110)),
    'cap': ((70, 104, 60, 34), (70, 104, 60, 34)),
}

# Style options per garment, keyed by svg_key. Each entry is
# (category, category_label, key, label, price delta, is_default).
COMMON_FIT = [
    ('fit', 'Fit', 'regular', 'Regular', 0, True),
    ('fit', 'Fit', 'slim', 'Slim', 150, False),
    ('fit', 'Fit', 'oversized', 'Oversized', 250, False),
]
SLEEVE_SHORT_LONG = [
    ('sleeve', 'Sleeve Length', 'short', 'Short Sleeve', 0, True),
    ('sleeve', 'Sleeve Length', 'long', 'Long Sleeve', 300, False),
]
ETHNIC_LENGTH = [
    ('length', 'Length', 'regular', 'Regular', 0, True),
    ('length', 'Length', 'ankle', 'Ankle Length', 400, False),
]
NECK_ETHNIC = [
    ('neckline', 'Neckline', 'mandarin', 'Mandarin', 0, True),
    ('neckline', 'Neckline', 'round', 'Round', 0, False),
    ('neckline', 'Neckline', 'v', 'V Neck', 0, False),
]
FABRIC_ETHNIC = [
    ('fabric', 'Fabric', 'cotton', 'Cotton', 0, True),
    ('fabric', 'Fabric', 'silk-blend', 'Silk Blend', 900, False),
    ('fabric', 'Fabric', 'linen', 'Linen', 600, False),
]

STYLE_OPTIONS = {
    'tee': COMMON_FIT + SLEEVE_SHORT_LONG,
    'womens-tee': COMMON_FIT + SLEEVE_SHORT_LONG,
    'tank': COMMON_FIT,
    'crop-top': COMMON_FIT,
    'polo': COMMON_FIT,
    'shirt': COMMON_FIT + [
        ('cuff', 'Cuff', 'button', 'Button Cuff', 0, True),
        ('cuff', 'Cuff', 'french', 'French Cuff', 500, False),
    ],
    'sweatshirt': COMMON_FIT,
    'hoodie': COMMON_FIT + [
        ('pocket', 'Pocket', 'kangaroo', 'Kangaroo Pocket', 0, True),
        ('pocket', 'Pocket', 'none', 'No Pocket', 0, False),
    ],
    'womens-hoodie': COMMON_FIT,
    'bomber': COMMON_FIT,
    'kurta': ETHNIC_LENGTH + NECK_ETHNIC + FABRIC_ETHNIC,
    'kurti': ETHNIC_LENGTH + NECK_ETHNIC + FABRIC_ETHNIC,
    'anarkali': FABRIC_ETHNIC,
    'salwar-kameez': ETHNIC_LENGTH + FABRIC_ETHNIC,
    'saree-blouse': [
        ('sleeve', 'Sleeve Length', 'cap', 'Cap Sleeve', 0, True),
        ('sleeve', 'Sleeve Length', 'elbow', 'Elbow Sleeve', 250, False),
    ] + FABRIC_ETHNIC,
    'sherwani': FABRIC_ETHNIC,
    'nehru-jacket': FABRIC_ETHNIC,
    'lehenga': FABRIC_ETHNIC,
    'dupatta': FABRIC_ETHNIC,
    'dress': COMMON_FIT,
    'tote': [
        ('size', 'Size', 'standard', 'Standard', 0, True),
        ('size', 'Size', 'large', 'Large', 300, False),
    ],
    'cap': [
        ('closure', 'Closure', 'snapback', 'Snapback', 0, True),
        ('closure', 'Closure', 'strapback', 'Strapback', 0, False),
    ],
}


class Command(BaseCommand):
    help = 'Seeds the garment catalog: garment types, print zones and style options.'

    def handle(self, *args, **options):
        for order, (svg_key, slug, name, department, category, price, description) in enumerate(GARMENTS, start=1):
            garment, _ = GarmentType.objects.update_or_create(
                slug=slug,
                defaults=dict(
                    name=name,
                    description=description,
                    svg_key=svg_key,
                    department=department,
                    category=category,
                    base_price=price,
                    viewbox_width=200,
                    viewbox_height=280,
                    sort_order=order,
                    is_active=True,
                ),
            )

            front, back = ZONES.get(svg_key, ZONES['tee'])
            for key, label, (x, y, w, h), sort in (
                ('front', 'Front', front, 1),
                ('back', 'Back', back, 2),
            ):
                PrintZone.objects.update_or_create(
                    garment_type=garment, key=key,
                    defaults=dict(label=label, x=x, y=y, width=w, height=h, dpi=300, sort_order=sort),
                )

            for sort, (cat, cat_label, key, label, delta, is_default) in enumerate(
                STYLE_OPTIONS.get(svg_key, COMMON_FIT), start=1
            ):
                GarmentStyleOption.objects.update_or_create(
                    garment_type=garment, category=cat, key=key,
                    defaults=dict(
                        category_label=cat_label, label=label, price_delta=delta,
                        is_default=is_default, sort_order=sort,
                    ),
                )

        self.stdout.write(self.style.SUCCESS(f'Catalog seeded: {len(GARMENTS)} garment types.'))
