"""ONLY for stress tests on your own PC. Same as normal settings, but the rate limits are lifted so one computer can act like many users."""
from .settings import *  # noqa: F401,F403

REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {k: "1000000/min" for k in REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]}}  # noqa: F405
