import html
import re

from decimal import Decimal, ROUND_HALF_UP

def round_money(value) -> Decimal:
    try:
        # Convert to string first to avoid floating point precision issues
        val_str = str(value or 0).strip()
        if not val_str:
            val_str = "0"
        return Decimal(val_str).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (TypeError, ValueError, Exception):
        return Decimal("0.00")


def sanitize_xss(value: str | None) -> str:
    if not value or not isinstance(value, str):
        return value or ""
    # Strip dangerous HTML tags like <script>, <iframe/object/embed/style/applet/meta/link> entirely
    tag_re = re.compile(
        r"<(script|iframe|object|embed|style|applet|meta|link)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>",
        re.IGNORECASE,
    )
    cleaned = tag_re.sub("", value)

    # Strip event handlers like onerror, onload, onclick, javascript: URIs etc.
    handler_re = re.compile(
        r'\bon[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', re.IGNORECASE
    )
    cleaned = handler_re.sub("", cleaned)
    cleaned = re.compile(r"javascript\s*:", re.IGNORECASE).sub("", cleaned)

    # Finally, HTML escape the string to prevent raw HTML rendering
    return html.escape(cleaned.strip())

import time
from collections import defaultdict
from fastapi import Request, HTTPException

# Simple in-memory rate limiter for login
login_attempts = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 60

def rate_limit_login(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Clean up old attempts
    login_attempts[ip] = [timestamp for timestamp in login_attempts[ip] if now - timestamp < LOGIN_WINDOW_SECONDS]
    
    if len(login_attempts[ip]) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many login attempts. Please wait 1 minute before trying again.")
        
    login_attempts[ip].append(now)
