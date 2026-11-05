import numpy as np

# A fixed-percentage crop proved resolution-dependent: the overlay's
# absolute font size occupies a much larger fraction of the frame on a
# lower-resolution photo than on a high-resolution one, so a fixed ratio
# either truncates the overlay (losing fields, or worse, silently
# truncating a value like an AWB number) or, if loosened, risks reaching a
# bright/reflective parcel surface or the printed shipping label.
#
# Instead: detect the two known overlay text colors specifically — bright
# yellow (schemas seen so far) and bright white (the monospace schema) —
# rather than raw grayscale brightness. A gray/silver parcel surface is far
# less saturated than true rendered yellow text and, even where bright,
# rarely passes both the color and sparse-density checks together the way
# text consistently does.
MIN_TEXT_PIXELS_PER_ROW = 5
MAX_BRIGHT_FRACTION = 0.5  # text is sparse; a lit surface fills a row broadly
GAP_THRESHOLD_PX = 100
BOTTOM_PADDING_PX = 25

SEARCH_HEIGHT_RATIO = 0.6
SEARCH_WIDTH_RATIO = 0.5

FALLBACK_HEIGHT_RATIO = 0.3
FALLBACK_WIDTH_RATIO = 0.35


def _text_color_mask(region_bgr):
    b = region_bgr[:, :, 0].astype(np.int16)
    g = region_bgr[:, :, 1].astype(np.int16)
    r = region_bgr[:, :, 2].astype(np.int16)

    is_yellow = (r > 150) & (g > 150) & (b < 100)
    is_white = (r > 200) & (g > 200) & (b > 200)
    return is_yellow | is_white


def crop_overlay_region(image):
    height, width = image.shape[:2]

    search_height = int(height * SEARCH_HEIGHT_RATIO)
    search_width = int(width * SEARCH_WIDTH_RATIO)
    region = image[:search_height, :search_width]

    mask = _text_color_mask(region)
    pixel_counts = mask.sum(axis=1)
    max_pixels = search_width * MAX_BRIGHT_FRACTION
    text_rows = np.where((pixel_counts > MIN_TEXT_PIXELS_PER_ROW) & (pixel_counts < max_pixels))[0]

    if len(text_rows) == 0:
        # No overlay-colored text found at all — fall back to a generous
        # default rather than returning an empty crop.
        return image[: int(height * FALLBACK_HEIGHT_RATIO), : int(width * FALLBACK_WIDTH_RATIO)]

    block_end = text_rows[0]
    for i in range(1, len(text_rows)):
        if text_rows[i] - text_rows[i - 1] > GAP_THRESHOLD_PX:
            break  # real gap — the overlay block ended at the previous row
        block_end = text_rows[i]

    crop_height = min(block_end + BOTTOM_PADDING_PX, height)
    return image[:crop_height, :search_width]
