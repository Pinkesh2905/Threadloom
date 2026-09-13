"""Tech-pack / production spec-sheet PDF — generated with reportlab from the
order, design and garment data already in the database. No AI, no template
image — every value on the page is read straight from the models.
"""

import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from PIL import Image as PILImage

from .mockup import render_garment_mockup
from .fabric import estimate_fabric_yield
from .qr import generate_order_qr_png


def _pil_to_rlimage(pil_img: PILImage.Image, width_mm: float) -> RLImage:
    buffer = io.BytesIO()
    pil_img.save(buffer, format='PNG')
    buffer.seek(0)
    aspect = pil_img.height / pil_img.width
    return RLImage(buffer, width=width_mm * mm, height=width_mm * mm * aspect)


def generate_tech_pack(order, base_url: str) -> bytes:
    design = order.design
    garment_type = design.garment_type
    print_zones = list(garment_type.print_zones.all())

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('TPTitle', parent=styles['Title'], fontSize=18, spaceAfter=2)
    heading_style = ParagraphStyle('TPHeading', parent=styles['Heading2'], fontSize=12, spaceBefore=10, spaceAfter=4)
    body_style = styles['BodyText']

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=18 * mm, bottomMargin=18 * mm, leftMargin=18 * mm, rightMargin=18 * mm,
    )
    story = []

    # Header: title + QR ticket
    qr_png = generate_order_qr_png(order.id, base_url)
    qr_img = RLImage(io.BytesIO(qr_png), width=22 * mm, height=22 * mm)
    header_table = Table(
        [[Paragraph(f'Production Ticket — Order #{order.id}', title_style), qr_img]],
        colWidths=[140 * mm, 22 * mm],
    )
    header_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    story.append(header_table)
    story.append(Paragraph(f'Generated for {order.user.display_name or order.user.email}', body_style))
    story.append(Spacer(1, 6 * mm))

    # Garment mockup + spec table side by side
    mockup = render_garment_mockup(garment_type.svg_key, design.base_color, print_zones, design.layers)
    mockup_rl = _pil_to_rlimage(mockup, width_mm=70)

    option_lines = ', '.join(f'{k}: {v}' for k, v in (design.selected_options or {}).items()) or '—'
    spec_rows = [
        ['Garment', garment_type.name],
        ['Style Options', option_lines],
        ['Base Color', design.base_color],
        ['Size', order.size],
        ['Quantity', str(order.quantity)],
        ['Unit Price', f'${order.unit_price}'],
        ['Total Price', f'${order.total_price}'],
        ['Status', order.get_status_display()],
        ['Order Date', order.created_at.strftime('%Y-%m-%d')],
    ]
    spec_table = Table(spec_rows, colWidths=[35 * mm, 65 * mm])
    spec_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#555555')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -1), 0.4, colors.HexColor('#E5E5E5')),
    ]))

    layout_table = Table([[mockup_rl, spec_table]], colWidths=[75 * mm, 100 * mm])
    layout_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    story.append(layout_table)

    # Print zone / layer breakdown
    story.append(Paragraph('Print Zones & Artwork', heading_style))
    zone_rows = [['Zone', 'Layer', 'Content']]
    layers_by_zone: dict = {}
    for layer in design.layers:
        layers_by_zone.setdefault(layer.get('zone'), []).append(layer)
    if not design.layers:
        zone_rows.append(['—', '—', 'No artwork placed'])
    else:
        for zone in print_zones:
            zone_layers = layers_by_zone.get(zone.key, [])
            if not zone_layers:
                continue
            for i, layer in enumerate(zone_layers):
                if layer.get('type') == 'text':
                    content = f"Text: \"{layer.get('text', '')}\" ({layer.get('color', '#141414')}, {layer.get('fontFamily', 'sans')})"
                else:
                    content = f"Image ({layer.get('width', '?')}x{layer.get('height', '?')}px)"
                zone_rows.append([zone.label if i == 0 else '', f'Layer {i + 1}', content])
    zone_table = Table(zone_rows, colWidths=[25 * mm, 25 * mm, 125 * mm])
    zone_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#141414')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#E5E5E5')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(zone_table)

    # Fabric yield estimate
    yield_estimate = estimate_fabric_yield(garment_type.svg_key, order.quantity)
    story.append(Paragraph('Fabric Yield Estimate', heading_style))
    yield_rows = [
        ['Roll Width', f"{yield_estimate['roll_width_cm']:.0f} cm"],
        ['Fabric Needed', f"{yield_estimate['fabric_length_m']} m"],
        ['Utilization', f"{yield_estimate['utilization_pct']}%"],
        ['Estimated Waste', f"{yield_estimate['waste_pct']}%"],
        ['Pattern Pieces', f"{yield_estimate['pieces_total']} (for {order.quantity} unit(s))"],
    ]
    yield_table = Table(yield_rows, colWidths=[35 * mm, 65 * mm])
    yield_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#555555')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -1), 0.4, colors.HexColor('#E5E5E5')),
    ]))
    story.append(yield_table)
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        'Nesting computed by bin-packing standard flat-pattern piece dimensions onto the roll width '
        '(rectpack) — an estimate, not a cutter-ready marker.',
        ParagraphStyle('TPNote', parent=body_style, fontSize=7.5, textColor=colors.HexColor('#888888')),
    ))

    doc.build(story)
    return buffer.getvalue()
