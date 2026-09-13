import uuid

from django.db import migrations, models

from designer.models import _generate_share_token


def backfill_share_tokens(apps, schema_editor):
    Design = apps.get_model('designer', 'Design')
    for design in Design.objects.all():
        design.share_token = _generate_share_token()
        design.save(update_fields=['share_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('designer', '0002_design_is_public_uploadedasset_dominant_colors_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='design',
            name='share_token',
            field=models.CharField(default='', editable=False, max_length=32),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_share_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='design',
            name='share_token',
            field=models.CharField(default=_generate_share_token, editable=False, max_length=32, unique=True),
        ),
    ]
