"""Every image/video the admin can replace on the website.

The frontend ships a default for each slot; whatever is saved here overrides it.
(key, label, kind, group)
"""
SLOTS = (
    # ---- Home ----
    [("hero_video", "Hero video (top of home page)", "video", "Home")]
    + [("hero_float_1", "Hero floating circle 1", "image", "Home"),
       ("hero_float_2", "Hero floating circle 2", "image", "Home")]
    + [("showcase_video", "Growing video frame", "video", "Home")]
    + [(f"reel_video_{i}", f"Extra video {i} (adds a 'In motion' section)", "video", "Home") for i in (1, 2, 3)]
    + [(f"story_{i}", f"Story step {i} image", "image", "Home") for i in range(1, 6)]
    + [(f"spot_{i}", f"Jar spotlight image {i}", "image", "Home") for i in range(1, 5)]
    + [(f"gallery_{i}", f"Gallery image {i}", "image", "Home") for i in range(1, 10)]
    # ---- Shop ----
    + [("shop_banner_video", "Shop banner video (adds a banner on the Products page)", "video", "Shop")]
    + [(f"ribbon_{i}", f"'Inside the jar' strip image {i}", "image", "Shop") for i in range(1, 8)]
)

SLOT_INDEX = {key: {"slot": key, "label": label, "kind": kind, "group": group} for key, label, kind, group in SLOTS}
