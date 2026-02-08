# GBS EMEA Learning Hub

**AI Training & Learning Platform**

A comprehensive learning platform designed to help GBS EMEA employees learn and adopt AI tools in their daily work, with a focus on recruitment and RPO operations.

## Site-wide Search

`shared/search-index.json` is now a fallback index only.

- The Learning Assistant retrieves context server-side from live content corpora (`prompts`, `library`, `stages`, `academy`) and only falls back to `shared/search-index.json` when needed.
- Regenerating `shared/search-index.json` is optional for assistant quality and only needed if you want to refresh the fallback index: `python build_search_index.py`
