import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

from bs4 import BeautifulSoup


@dataclass(frozen=True)
class SearchItem:
    id: str
    title: str
    description: str
    url: str
    category: str
    type: str
    keywords: str
    content: str
    anchor: str = ""
    sectionTitle: str = ""


EXCLUDE_DIRS = {
    ".git",
    ".vscode",
    ".claude",
}

EXCLUDE_FILES = {
    "secure-template.html",
    "test-progress.html",
    "shared/footer.html",
    "shared/footer-noscript.html",
}

EXCLUDE_PREFIX_DIRS = {
    "shared/partials",
}


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "item"


def collapse_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def title_case_from_slug(slug: str) -> str:
    return " ".join(part.capitalize() for part in slug.replace("_", "-").split("-") if part)


def file_to_url(root: Path, file_path: Path) -> str:
    rel = file_path.relative_to(root).as_posix()
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return f"/{rel[:-len('index.html')]}"
    return f"/{rel}"


def guess_category(root: Path, file_path: Path) -> str:
    rel_parts = file_path.relative_to(root).parts
    if len(rel_parts) <= 1:
        return "Home"
    return title_case_from_slug(rel_parts[0])


def guess_type(url: str) -> str:
    if "use-cases" in url:
        return "use-case"
    if "gbs-prompts" in url:
        return "prompt-category"
    if "contact-us" in url or "privacy-policy" in url or "terms-of-service" in url:
        return "utility"
    return "module"


def safe_text(el) -> str:
    if not el:
        return ""
    return collapse_ws(el.get_text(" ", strip=True))


def extract_main_text(soup: BeautifulSoup) -> str:
    for selector in ["nav", "header", "footer", "script", "style", "noscript", "svg"]:
        for el in soup.select(selector):
            el.decompose()
    main = soup.find("main") or soup.body
    return safe_text(main)


def extract_description(soup: BeautifulSoup) -> str:
    meta = soup.find("meta", attrs={"name": "description"})
    if meta and meta.get("content"):
        return collapse_ws(meta["content"])
    main = soup.find("main") or soup.body
    if main:
        p = main.find("p")
        if p:
            return safe_text(p)
    return ""


def extract_keywords(soup: BeautifulSoup) -> str:
    meta = soup.find("meta", attrs={"name": "keywords"})
    if meta and meta.get("content"):
        return collapse_ws(meta["content"])
    return ""


def extract_title(soup: BeautifulSoup) -> str:
    if soup.title and soup.title.string:
        return collapse_ws(soup.title.string)
    h1 = soup.find("h1")
    if h1:
        return safe_text(h1)
    return "Untitled"


def iter_section_entries(
    soup: BeautifulSoup,
    *,
    page_title: str,
    url: str,
    category: str,
    item_type: str,
    page_keywords: str,
    max_section_content_chars: int,
) -> Iterable[SearchItem]:
    main = soup.find("main") or soup.body
    if not main:
        return []

    headings = main.find_all(["h2", "h3", "h4"])
    for h in headings:
        anchor = h.get("id", "").strip()
        if not anchor:
            continue
        heading_text = safe_text(h)
        if not heading_text:
            continue

        content_parts: list[str] = []
        for sib in h.next_siblings:
            if getattr(sib, "name", None) in {"h2", "h3", "h4"}:
                break
            if getattr(sib, "get_text", None):
                t = safe_text(sib)
                if t:
                    content_parts.append(t)

        section_content = collapse_ws(" ".join(content_parts))
        if max_section_content_chars > 0 and len(section_content) > max_section_content_chars:
            section_content = section_content[:max_section_content_chars].rsplit(" ", 1)[0]

        yield SearchItem(
            id=f"{slugify(url)}-{slugify(anchor)}",
            title=heading_text,
            description=section_content[:220] if section_content else "",
            url=url,
            category=category,
            type=item_type,
            keywords=page_keywords,
            content=section_content,
            anchor=anchor,
            sectionTitle=page_title,
        )


def should_exclude(root: Path, file_path: Path) -> bool:
    rel = file_path.relative_to(root).as_posix()
    if any(rel.startswith(prefix) for prefix in EXCLUDE_PREFIX_DIRS):
        return True
    if rel in EXCLUDE_FILES:
        return True
    return False


def iter_html_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*.html"):
        if any(part in EXCLUDE_DIRS for part in path.parts):
            continue
        if should_exclude(root, path):
            continue
        yield path


def build_index(
    root: Path,
    *,
    max_page_content_chars: int,
    max_section_content_chars: int,
    include_sections: bool,
) -> list[SearchItem]:
    items: list[SearchItem] = []

    for file_path in sorted(iter_html_files(root)):
        html = file_path.read_text(encoding="utf-8", errors="replace")
        soup = BeautifulSoup(html, "html.parser")

        url = file_to_url(root, file_path)
        title = extract_title(soup)
        description = extract_description(soup)
        keywords = extract_keywords(soup)
        category = guess_category(root, file_path)
        item_type = guess_type(url)

        content = extract_main_text(soup)
        if max_page_content_chars > 0 and len(content) > max_page_content_chars:
            content = content[:max_page_content_chars].rsplit(" ", 1)[0]

        items.append(
            SearchItem(
                id=slugify(url),
                title=title,
                description=description[:220] if description else "",
                url=url,
                category=category,
                type=item_type,
                keywords=keywords,
                content=content,
            )
        )

        if include_sections:
            items.extend(
                iter_section_entries(
                    soup,
                    page_title=title,
                    url=url,
                    category=category,
                    item_type=item_type,
                    page_keywords=keywords,
                    max_section_content_chars=max_section_content_chars,
                )
            )

    return items


def write_search_index(output_path: Path, items: list[SearchItem]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"searchIndex": [item.__dict__ for item in items]}
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Generate optional fallback shared/search-index.json from site HTML pages.")
    parser.add_argument("--root", default=".", help="Repo root (default: .)")
    parser.add_argument("--output", default="shared/search-index.json", help="Output JSON path")
    parser.add_argument("--max-page-chars", type=int, default=5000, help="Max chars of page content to store")
    parser.add_argument("--max-section-chars", type=int, default=1500, help="Max chars of section content to store")
    parser.add_argument("--no-sections", action="store_true", help="Disable section-level indexing")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    output = Path(args.output)

    items = build_index(
        root,
        max_page_content_chars=args.max_page_chars,
        max_section_content_chars=args.max_section_chars,
        include_sections=not args.no_sections,
    )
    write_search_index(output, items)
    print(f"Wrote {len(items)} fallback search items to {output.as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
