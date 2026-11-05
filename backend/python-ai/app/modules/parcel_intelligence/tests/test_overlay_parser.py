from app.modules.parcel_intelligence.extraction.overlay_parser import parse_overlay_text


def test_plain_labeled_schema_parses_every_field():
    text = (
        "LOCATION: A-12-04\n"
        "AWB: 998877665544\n"
        "WEIGHT: 2.35kg\n"
        "LENGTH(cm): 30\n"
        "WIDTH(cm): 20\n"
        "HEIGHT(cm): 15\n"
        "TIME: 06/28/2025 10:52:12 PM\n"
        "SORTERID: S-7\n"
    )
    fields = parse_overlay_text(text)
    assert fields["location"] == "A-12-04"
    assert fields["awb"] == "998877665544"
    assert fields["weight"] == 2.35
    assert fields["length"] == 30
    assert fields["width"] == 20
    assert fields["height"] == 15
    assert fields["sorterId"] == "S-7"
    assert fields["timestamp"] is not None


def test_bare_weight_integer_with_no_unit_is_grams():
    fields = parse_overlay_text("WEIGHT: 00580\n")
    assert fields["weight"] == 0.58


def test_weight_with_explicit_kg_unit_is_not_divided():
    fields = parse_overlay_text("WEIGHT: 2.5 kg\n")
    assert fields["weight"] == 2.5


def test_packed_dimension_block_is_millimetres_divided_to_cm():
    fields = parse_overlay_text("DIMENSION: L0189XH0145XW0119\n")
    assert fields["length"] == 18.9
    assert fields["height"] == 14.5
    assert fields["width"] == 11.9


def test_packed_17_digit_timestamp_is_parsed():
    fields = parse_overlay_text("DATETIME: 20250628225212666\n")
    assert fields["timestamp"] is not None
    assert fields["timestamp"].startswith("2025-06-28T22:52:12")


def test_unrecognized_timestamp_format_keeps_raw_string_not_none():
    fields = parse_overlay_text("TIME: not-a-real-timestamp\n")
    assert fields["timestamp"] == "not-a-real-timestamp"


def test_volume_is_derived_when_not_stated_directly():
    text = "LENGTH(cm): 10\nWIDTH(cm): 5\nHEIGHT(cm): 2\n"
    fields = parse_overlay_text(text)
    assert fields["volume"] == 100.0


def test_volume_stated_directly_is_not_overwritten_by_derivation():
    text = "RVOL: 500\nLENGTH(cm): 10\nWIDTH(cm): 5\nHEIGHT(cm): 2\n"
    fields = parse_overlay_text(text)
    assert fields["volume"] == 500.0


def test_unrecognized_label_is_kept_in_raw_not_discarded():
    fields = parse_overlay_text("SOME_UNKNOWN_FIELD: xyz\n")
    assert fields["raw"]["SOME_UNKNOWN_FIELD"] == "xyz"


def test_empty_text_returns_all_none_fields_not_a_crash():
    fields = parse_overlay_text("")
    assert fields["awb"] is None
    assert fields["weight"] is None
    assert fields["volume"] is None


def test_lines_without_colon_are_ignored_not_crashing():
    fields = parse_overlay_text("garbage line with no colon\nAWB: 123\n")
    assert fields["awb"] == "123"
