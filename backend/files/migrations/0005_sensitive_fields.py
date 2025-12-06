from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('files', '0004_add_composite_indices'),
    ]

    operations = [
        migrations.AddField(
            model_name='file',
            name='sensitive_detected',
            field=models.BooleanField(
                default=False,
                help_text='Whether the automated scanner found sensitive markers',
            ),
        ),
        migrations.AddField(
            model_name='file',
            name='sensitive_markers',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='List of sensitive markers detected during upload',
            ),
        ),
        migrations.AddField(
            model_name='file',
            name='sensitive_summary',
            field=models.CharField(
                blank=True,
                help_text='Human friendly summary of the sensitive markers',
                max_length=255,
            ),
        ),
    ]

