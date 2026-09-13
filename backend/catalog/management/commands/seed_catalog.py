from django.core.management.base import BaseCommand
from catalog.models import GarmentType, PrintZone, GarmentStyleOption


class Command(BaseCommand):
    help = 'Seeds the garment catalog with a starter set of garment types, print zones and style options.'

    def handle(self, *args, **options):
        tee, _ = GarmentType.objects.update_or_create(
            slug='classic-tee',
            defaults=dict(
                name='Classic Tee',
                description='A regular-fit crew-neck tee - the everyday canvas.',
                svg_key='tee',
                base_price=18.00,
                sort_order=1,
            ),
        )
        hoodie, _ = GarmentType.objects.update_or_create(
            slug='pullover-hoodie',
            defaults=dict(
                name='Pullover Hoodie',
                description='A midweight pullover hoodie with a kangaroo pocket option (see Pocket style).',
                svg_key='hoodie',
                base_price=34.00,
                sort_order=2,
            ),
        )

        for garment in (tee, hoodie):
            PrintZone.objects.update_or_create(
                garment_type=garment, key='front',
                defaults=dict(label='Front', x=64, y=88, width=72, height=76, dpi=300, sort_order=1),
            )
            PrintZone.objects.update_or_create(
                garment_type=garment, key='back',
                defaults=dict(label='Back', x=60, y=84, width=80, height=96, dpi=300, sort_order=2),
            )

        # Tee style options
        GarmentStyleOption.objects.update_or_create(
            garment_type=tee, category='fit', key='regular',
            defaults=dict(category_label='Fit', label='Regular', price_delta=0, is_default=True, sort_order=1),
        )
        GarmentStyleOption.objects.update_or_create(
            garment_type=tee, category='fit', key='slim',
            defaults=dict(category_label='Fit', label='Slim', price_delta=2, is_default=False, sort_order=2),
        )
        GarmentStyleOption.objects.update_or_create(
            garment_type=tee, category='sleeve', key='short',
            defaults=dict(category_label='Sleeve Length', label='Short Sleeve', price_delta=0, is_default=True, sort_order=1),
        )
        GarmentStyleOption.objects.update_or_create(
            garment_type=tee, category='sleeve', key='long',
            defaults=dict(category_label='Sleeve Length', label='Long Sleeve', price_delta=4, is_default=False, sort_order=2),
        )

        # Hoodie style options
        GarmentStyleOption.objects.update_or_create(
            garment_type=hoodie, category='pocket', key='none',
            defaults=dict(category_label='Pocket', label='No Pocket', price_delta=0, is_default=True, sort_order=1),
        )
        GarmentStyleOption.objects.update_or_create(
            garment_type=hoodie, category='pocket', key='kangaroo',
            defaults=dict(category_label='Pocket', label='Kangaroo Pocket', price_delta=3, is_default=False, sort_order=2),
        )
        GarmentStyleOption.objects.update_or_create(
            garment_type=hoodie, category='fit', key='regular',
            defaults=dict(category_label='Fit', label='Regular', price_delta=0, is_default=True, sort_order=1),
        )
        GarmentStyleOption.objects.update_or_create(
            garment_type=hoodie, category='fit', key='oversized',
            defaults=dict(category_label='Fit', label='Oversized', price_delta=5, is_default=False, sort_order=2),
        )

        self.stdout.write(self.style.SUCCESS('Catalog seeded: Classic Tee, Pullover Hoodie.'))
