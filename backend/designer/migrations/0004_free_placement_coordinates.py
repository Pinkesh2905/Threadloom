"""Move layer coordinates from zone-relative to garment-relative.

Artwork used to be confined to a print-zone rectangle, so a layer's x/y was
a percentage *of that rectangle*. Artwork can now be placed anywhere on the
garment, so x/y is a percentage of the whole garment viewBox instead.

Existing layers are re-anchored into the same spot within their zone, so a
design that was centred on the chest stays centred on the chest. Image
layers also get a scale nudge because their base size is now derived from
the garment width rather than the zone width.
"""

from django.db import migrations

VIEWBOX_W = 200.0
VIEWBOX_H = 280.0
# Old image base size was min(zone_w, zone_h) * 0.5; the new one is a fixed
# fraction of garment width. Rescale so art keeps roughly its printed size.
NEW_IMAGE_BASE = VIEWBOX_W * 0.25


def to_garment_coordinates(apps, schema_editor):
    Design = apps.get_model('designer', 'Design')
    PrintZone = apps.get_model('catalog', 'PrintZone')

    for design in Design.objects.all().iterator():
        layers = design.layers or []
        if not layers:
            continue

        zones = {
            z.key: z
            for z in PrintZone.objects.filter(garment_type_id=design.garment_type_id)
        }
        if not zones:
            continue

        changed = False
        for layer in layers:
            zone = zones.get(layer.get('zone'))
            if zone is None:
                continue

            old_x = float(layer.get('x', 50))
            old_y = float(layer.get('y', 50))
            layer['x'] = round((zone.x + old_x / 100.0 * zone.width) / VIEWBOX_W * 100.0, 2)
            layer['y'] = round((zone.y + old_y / 100.0 * zone.height) / VIEWBOX_H * 100.0, 2)

            if layer.get('type') == 'image':
                old_base = min(zone.width, zone.height) * 0.5
                if old_base > 0:
                    layer['scale'] = round(float(layer.get('scale', 1)) * (old_base / NEW_IMAGE_BASE), 3)
            changed = True

        if changed:
            design.layers = layers
            design.save(update_fields=['layers'])


class Migration(migrations.Migration):

    dependencies = [
        ('designer', '0003_design_share_token'),
        ('catalog', '0002_garmenttype_category_garmenttype_department_and_more'),
    ]

    operations = [
        # One-way: the old zone rectangles this would need to invert are
        # themselves replaced by the reseeded catalog.
        migrations.RunPython(to_garment_coordinates, migrations.RunPython.noop),
    ]
