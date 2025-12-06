"""
Utilities to extract text from uploaded documents and detect sensitive content.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Set

from django.conf import settings

logger = logging.getLogger(__name__)

# Optional dependencies
try:
    from pypdf import PdfReader  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    PdfReader = None

try:
    import docx  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    docx = None

try:
    from striprtf.striprtf import rtf_to_text  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    rtf_to_text = None

try:
    import textract  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    textract = None

try:
    import spacy  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    spacy = None

_NLP = None
_SPACY_INIT_ATTEMPTED = False

DEFAULT_SUPPORTED_EXTENSIONS = {'pdf', 'txt', 'doc', 'docx', 'rtf'}

EMAIL_PATTERN = re.compile(
    r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b',
    re.IGNORECASE,
)
PHONE_PATTERN = re.compile(
    r'(\+?\d[\d\s\-().]{7,}\d)',
    re.IGNORECASE,
)
USERNAME_PATTERN = re.compile(r'\b(user\s?name|login\s?id)\b', re.IGNORECASE)
PASSWORD_PATTERN = re.compile(r'\b(pass\s?word|pwd)\b', re.IGNORECASE)

CREDENTIAL_KEYWORDS = {
    'otp',
    'one time password',
    'security answer',
    'ssn',
    'pan',
    'aadhar',
    'secret question',
}

MARKER_LABELS: Dict[str, str] = {
    'email': 'email address',
    'phone': 'phone number',
    'username': 'username',
    'password': 'password',
    'credential_keyword': 'other sensitive keyword',
}


@dataclass
class SensitiveScanResult:
    detected: bool
    markers: List[str]
    summary: str


def analyze_file_for_sensitive_content(
    file_path: str,
    *,
    extension: str,
    mime_type: str,
    original_filename: Optional[str] = None,
) -> SensitiveScanResult:
    """
    Extract text from the file (when supported) and detect sensitive markers.
    """

    if not getattr(settings, 'SENSITIVE_SCAN_ENABLED', True):
        return SensitiveScanResult(False, [], '')

    configured_exts = settings.SENSITIVE_SCAN_EXTENSIONS or []
    supported_exts = {
        ext.strip().lower()
        for ext in (configured_exts if any(configured_exts) else DEFAULT_SUPPORTED_EXTENSIONS)
        if ext.strip()
    }
    if not supported_exts:
        supported_exts = DEFAULT_SUPPORTED_EXTENSIONS

    normalized_ext = extension.lower().lstrip('.')
    if normalized_ext not in supported_exts:
        return SensitiveScanResult(False, [], '')

    try:
        max_bytes = int(getattr(settings, 'SENSITIVE_SCAN_MAX_BYTES', 2 * 1024 * 1024))
        file_size = os.path.getsize(file_path)
        if file_size > max_bytes:
            logger.info(
                "Skipping sensitive scan for %s; size %s exceeds %s bytes",
                original_filename or file_path,
                file_size,
                max_bytes,
            )
            return SensitiveScanResult(False, [], '')
    except OSError:
        logger.warning("Unable to determine file size for sensitive scan", exc_info=True)

    text = _extract_text(file_path, normalized_ext, mime_type)
    if not text:
        return SensitiveScanResult(False, [], '')

    max_chars = int(getattr(settings, 'SENSITIVE_SCAN_MAX_TEXT_CHARS', 400_000))
    text = text[:max_chars]

    markers = _detect_markers(text)
    if not markers:
        return SensitiveScanResult(False, [], '')

    summary = _format_summary(markers)
    return SensitiveScanResult(True, sorted(markers), summary)


def _extract_text(file_path: str, extension: str, mime_type: str) -> str:
    try:
        if extension == 'pdf':
            return _extract_pdf_text(file_path)
        if extension == 'docx':
            return _extract_docx_text(file_path)
        if extension == 'txt':
            return _extract_txt_text(file_path)
        if extension == 'rtf':
            return _extract_rtf_text(file_path)
        if extension == 'doc':
            return _extract_doc_text(file_path, mime_type)
    except Exception:
        logger.warning("Failed to extract text for sensitive scan", exc_info=True)
    return ''


def _extract_pdf_text(file_path: str) -> str:
    if PdfReader is None:
        return ''
    text_parts: List[str] = []
    with open(file_path, 'rb') as fp:
        reader = PdfReader(fp)
        max_pages = int(getattr(settings, 'SENSITIVE_SCAN_MAX_PDF_PAGES', 25))
        for idx, page in enumerate(reader.pages[:max_pages]):
            extracted = page.extract_text() or ''
            if extracted:
                text_parts.append(extracted)
            if idx + 1 >= max_pages:
                break
    return '\n'.join(text_parts)


def _extract_docx_text(file_path: str) -> str:
    if docx is None:
        return ''
    document = docx.Document(file_path)
    return '\n'.join(p.text for p in document.paragraphs if p.text)


def _extract_txt_text(file_path: str) -> str:
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as fp:
        return fp.read()


def _extract_rtf_text(file_path: str) -> str:
    if rtf_to_text is None:
        return ''
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as fp:
        return rtf_to_text(fp.read())


def _extract_doc_text(file_path: str, mime_type: str) -> str:
    if textract is None:
        logger.info(
            "textract not available; cannot extract text from .doc file %s",
            file_path,
        )
        return ''
    try:
        raw = textract.process(file_path, encoding='utf-8')
        return raw.decode('utf-8', errors='ignore')
    except Exception:
        logger.warning("textract failed to process %s", file_path, exc_info=True)
        return ''


def _detect_markers(text: str) -> Set[str]:
    matches: Set[str] = set()

    if EMAIL_PATTERN.search(text):
        matches.add('email')
    if PHONE_PATTERN.search(text):
        matches.add('phone')
    if USERNAME_PATTERN.search(text):
        matches.add('username')
    if PASSWORD_PATTERN.search(text):
        matches.add('password')

    text_lower = text.lower()
    for keyword in CREDENTIAL_KEYWORDS:
        if keyword in text_lower:
            matches.add('credential_keyword')
            break

    nlp = _get_nlp()
    if nlp:
        doc = nlp(text[:50000])
        for ent in doc.ents:
            if ent.label_ in {'EMAIL', 'PERSON'}:
                matches.add('email' if ent.label_ == 'EMAIL' else 'credential_keyword')

    return matches


def _get_nlp():
    global _NLP, _SPACY_INIT_ATTEMPTED
    if _NLP is not None:
        return _NLP
    if _SPACY_INIT_ATTEMPTED:
        return None
    _SPACY_INIT_ATTEMPTED = True
    if spacy is None:
        logger.info("spaCy not installed; skipping NLP sensitive scan enhancements")
        return None
    model_name = getattr(settings, 'SENSITIVE_SPACY_MODEL', 'en_core_web_sm')
    try:
        _NLP = spacy.load(model_name)  # type: ignore
    except Exception:
        logger.warning(
            "Unable to load spaCy model %s for sensitive scan", model_name, exc_info=True
        )
        _NLP = None
    return _NLP


def _format_summary(markers: Set[str]) -> str:
    readable = [MARKER_LABELS.get(marker, marker) for marker in sorted(markers)]
    if not readable:
        return ''
    if len(readable) == 1:
        return f"Contains {readable[0]}"
    *rest, last = readable
    return f"Contains {', '.join(rest)} and {last}"

