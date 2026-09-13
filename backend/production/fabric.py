"""Fabric nesting / yield estimation — real bin-packing (rectpack) over
approximate garment-industry pattern-piece dimensions, not a random guess.
No AI, just geometry: the same class of problem a cut-room layout planner
solves by hand or with nesting software.
"""

from rectpack import newPacker

# Pattern piece (name, width_cm, height_cm) per garment silhouette. These are
# realistic flat-pattern dimensions for a mid-size adult garment — not exact
# per-size grading, which is out of scope for an estimate.
PATTERN_PIECES_CM = {
    'tee': [
        ('front', 58, 72),
        ('back', 58, 72),
        ('sleeve_left', 26, 46),
        ('sleeve_right', 26, 46),
    ],
    'hoodie': [
        ('front', 60, 74),
        ('back', 60, 74),
        ('sleeve_left', 27, 48),
        ('sleeve_right', 27, 48),
        ('hood_left', 32, 36),
        ('hood_right', 32, 36),
        ('pocket', 26, 22),
    ],
}

DEFAULT_ROLL_WIDTH_CM = 150.0


def estimate_fabric_yield(svg_key: str, quantity: int, roll_width_cm: float = DEFAULT_ROLL_WIDTH_CM) -> dict:
    pieces = PATTERN_PIECES_CM.get(svg_key, PATTERN_PIECES_CM['tee'])

    packer = newPacker(rotation=True)
    total_piece_area = 0.0
    for i in range(quantity):
        for name, w, h in pieces:
            packer.add_rect(w, h, rid=f'{name}-{i}')
            total_piece_area += w * h
    packer.add_bin(roll_width_cm, 100_000)
    packer.pack()

    used_length = 0.0
    placed_count = 0
    for abin in packer:
        for rect in abin:
            placed_count += 1
            used_length = max(used_length, rect.y + rect.height)

    fabric_area_used = roll_width_cm * used_length
    utilization = (total_piece_area / fabric_area_used) if fabric_area_used else 0.0

    return {
        'roll_width_cm': roll_width_cm,
        'fabric_length_cm': round(used_length, 1),
        'fabric_length_m': round(used_length / 100, 2),
        'total_piece_area_cm2': round(total_piece_area, 1),
        'fabric_area_used_cm2': round(fabric_area_used, 1),
        'utilization_pct': round(utilization * 100, 1),
        'waste_pct': round((1 - utilization) * 100, 1),
        'pieces_packed': placed_count,
        'pieces_total': quantity * len(pieces),
    }
