"""Normalise text fontSize to garment viewBox units.

The studio canvas used to treat `fontSize` as raw pixels in a stage drawn at
340px wide, while the backend's embroidery digitiser already documented it
as viewBox units. Those disagree by the display scale (340/200 = 1.7), so a
digitised text layer came out 1.7x too large.

The canvas now multiplies by the display scale, making viewBox units the one
interpretation. Existing layers are divided by the old scale so they keep
their printed size.
"""

from django.db import migrations

OLD_DISPLAY_SCALE = 340.0 / 200.0


def to_viewbox_units(apps, schema_editor):
    Design = apps.get_model('designer', 'Design')

    for design in Design.objects.all().iterator():
        layers = design.layers or []
        changed = False
        for layer in layers:
            if layer.get('type') != 'text':
                continue
            size = layer.get('fontSize')
            if size:
                layer['fontSize'] = round(float(size) / OLD_DISPLAY_SCALE, 2)
                changed = True
        if changed:
            design.layers = layers
            design.save(update_fields=['layers'])


def back_to_pixels(apps, schema_editor):
    Design = apps.get_model('designer', 'Design')

    for design in Design.objects.all().iterator():
        layers = design.layers or []
        changed = False
        for layer in layers:
            if layer.get('type') != 'text':
                continue
            size = layer.get('fontSize')
            if size:
                layer['fontSize'] = round(float(size) * OLD_DISPLAY_SCALE, 2)
                changed = True
        if changed:
            design.layers = layers
            design.save(update_fields=['layers'])


class Migration(migrations.Migration):

    dependencies = [
        ('designer', '0004_free_placement_coordinates'),
    ]

    operations = [
        migrations.RunPython(to_viewbox_units, back_to_pixels),
    ]
