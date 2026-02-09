(function() {
        'use strict';

        var assets = [];
        var activeCategory = 'all';
        var searchQuery = '';
        var sortBy = 'popular';
        var currentAsset = null;
        var searchDebounceTimer = null;

        var SEARCH_STOP_WORDS = new Set([
            'a','an','and','are','as','at','be','by','for','from','how','i','in','is','it',
            'of','on','or','that','the','to','was','what','when','where','which','who','why','with','you','your'
        ]);

        var QUERY_EXPANSIONS = {
            template: ['playbook', 'format', 'guide'],
            sourcing: ['boolean', 'search', 'talent'],
            screen: ['screening', 'truth check', 'rubric'],
            submission: ['confidence pack', 'shortlist'],
            outreach: ['email', 'message', 'engagement'],
            tradeoff: ['trade-off', 'negotiation', 'options'],
            role: ['passport', 'intake', 'requirements']
        };

        var CATEGORIES = {
            'all': 'All',
            'role-passport': 'Role Passport',
            'sourcing-plan': 'Sourcing Plan',
            'truth-check': 'Truth Check',
            'confidence-pack': 'Confidence Pack',
            'outreach': 'Outreach',
            'trade-off': 'Trade-offs',
            'standards': 'Standards',
            'automation': 'Automation'
        };

        function sanitizeSearchInput(value) {
            if (window.SecurityUtils && typeof window.SecurityUtils.sanitizeSearchQuery === 'function') {
                return window.SecurityUtils.sanitizeSearchQuery(value || '');
            }
            return String(value || '')
                .normalize('NFKC')
                .replace(/[\u0000-\u001F\u007F]/g, ' ')
                .replace(/[<>`"'\\]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 160);
        }

        function tokenize(text) {
            return String(text || '')
                .toLowerCase()
                .replace(/[^a-z0-9\s]+/g, ' ')
                .split(/\s+/)
                .filter(function(token) { return token && token.length > 1; });
        }

        function expandTokens(tokens) {
            var set = new Set(tokens);
            tokens.forEach(function(token) {
                var expansions = QUERY_EXPANSIONS[token];
                if (!expansions) return;
                expansions.forEach(function(term) {
                    tokenize(term).forEach(function(t) { set.add(t); });
                });
            });
            return Array.from(set);
        }

        function buildSearchCycles(query) {
            var clean = sanitizeSearchInput(query).toLowerCase();
            var baseTokens = tokenize(clean).filter(function(token) { return !SEARCH_STOP_WORDS.has(token); });
            var expandedTokens = expandTokens(baseTokens);
            var relaxedTokens = expandedTokens.filter(function(token) { return token.length >= 3; });
            return [
                { name: 'strict', phrase: clean, tokens: baseTokens, minScore: 3 },
                { name: 'expanded', phrase: '', tokens: expandedTokens, minScore: 2 },
                { name: 'relaxed', phrase: '', tokens: relaxedTokens, minScore: 1 }
            ];
        }

        function scoreAsset(asset, cycle) {
            var title = String(asset.title || '').toLowerCase();
            var description = String(asset.description || '').toLowerCase();
            var stageLabel = String(asset.stageLabel || '').toLowerCase();
            var content = String(asset.content || '').toLowerCase();
            var category = String(asset.category || '').toLowerCase();

            var score = 0;
            if (cycle.phrase && cycle.phrase.length >= 4) {
                if (title.indexOf(cycle.phrase) !== -1) score += 9;
                if (description.indexOf(cycle.phrase) !== -1) score += 6;
                if (content.indexOf(cycle.phrase) !== -1) score += 4;
            }

            cycle.tokens.forEach(function(token) {
                if (title.indexOf(token) !== -1) score += 4;
                if (category.indexOf(token) !== -1 || stageLabel.indexOf(token) !== -1) score += 3;
                if (description.indexOf(token) !== -1) score += 2;
                if (content.indexOf(token) !== -1) score += 1;
            });

            return score;
        }

        function rankAssetsByQuery(list, query) {
            var cycles = buildSearchCycles(query).filter(function(cycle) {
                return cycle.tokens.length > 0 || cycle.phrase;
            });
            if (!cycles.length) return list;

            var map = new Map();
            cycles.forEach(function(cycle) {
                list.forEach(function(asset) {
                    var score = scoreAsset(asset, cycle);
                    if (score < cycle.minScore) return;
                    var existing = map.get(asset.id);
                    if (!existing || score > existing.score) {
                        map.set(asset.id, { asset: asset, score: score, cycle: cycle.name });
                    }
                });
            });

            var strictCycle = cycles[0];
            return Array.from(map.values())
                .map(function(entry) {
                    var recheck = scoreAsset(entry.asset, strictCycle);
                    return { asset: entry.asset, score: entry.score + Math.floor(recheck * 0.5) };
                })
                .sort(function(a, b) { return b.score - a.score; })
                .map(function(entry) { return entry.asset; });
        }

        /* --- Init --- */
        function init() {
            fetch('assets.json')
                .then(function(res) {
                    if (!res.ok) throw new Error('Failed to load assets');
                    return res.json();
                })
                .then(function(data) {
                    assets = data;
                    renderFilters();
                    renderAssets();
                    bindEvents();
                })
                .catch(function(err) {
                    console.error(err);
                    document.getElementById('assetGrid').innerHTML =
                        '<div class="library-empty"><div class="library-empty__title" style="color: var(--accent-red)">Failed to load assets. Please refresh.</div></div>';
                });
        }

        /* --- Render Filter Pills --- */
        function renderFilters() {
            var container = document.getElementById('filterPills');
            var counts = { all: assets.length };

            assets.forEach(function(a) {
                counts[a.category] = (counts[a.category] || 0) + 1;
            });

            var html = '';
            Object.keys(CATEGORIES).forEach(function(key) {
                if (key !== 'all' && !counts[key]) return;
                var isActive = key === activeCategory;
                var count = counts[key] || 0;
                html += '<button class="filter-pill' + (isActive ? ' active' : '') + '" data-category="' + key + '">';
                html += CATEGORIES[key];
                html += '<span class="filter-pill__count">(' + count + ')</span>';
                html += '</button>';
            });

            container.innerHTML = html;

            container.querySelectorAll('.filter-pill').forEach(function(pill) {
                pill.addEventListener('click', function() {
                    activeCategory = this.dataset.category;
                    container.querySelectorAll('.filter-pill').forEach(function(p) { p.classList.remove('active'); });
                    this.classList.add('active');
                    renderAssets();
                });
            });
        }

        /* --- Render Assets --- */
        function renderAssets() {
            var filtered = assets.filter(function(a) {
                var matchCat = activeCategory === 'all' || a.category === activeCategory;
                return matchCat;
            });

            if (searchQuery) {
                filtered = rankAssetsByQuery(filtered, searchQuery);
            }

            // Sort
            filtered.sort(function(a, b) {
                if (sortBy === 'popular') return b.usageCount - a.usageCount;
                if (sortBy === 'alpha') return a.title.localeCompare(b.title);
                if (sortBy === 'recent') return b.lastUpdated.localeCompare(a.lastUpdated);
                return 0;
            });

            var grid = document.getElementById('assetGrid');
            var empty = document.getElementById('emptyState');
            var info = document.getElementById('resultsInfo');

            info.textContent = filtered.length + ' asset' + (filtered.length !== 1 ? 's' : '') +
                (activeCategory !== 'all' ? ' in ' + CATEGORIES[activeCategory] : '') +
                (searchQuery ? ' matching "' + searchQuery + '"' : '');

            if (filtered.length === 0) {
                grid.style.display = 'none';
                empty.style.display = 'block';
                return;
            }

            grid.style.display = '';
            empty.style.display = 'none';

            var html = '';
            filtered.forEach(function(asset) {
                html += '<div class="asset-card" data-id="' + asset.id + '">';

                // Top: category badge + usage
                html += '<div class="asset-card__top">';
                html += '<span class="asset-card__category asset-card__category--' + asset.category + '">' + CATEGORIES[asset.category] + '</span>';
                html += '<span class="asset-card__usage">';
                html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
                html += asset.usageCount + ' uses';
                html += '</span>';
                html += '</div>';

                // Title + desc
                html += '<div class="asset-card__title">' + escapeHtml(asset.title) + '</div>';
                html += '<div class="asset-card__desc">' + escapeHtml(asset.description) + '</div>';

                // Meta
                html += '<div class="asset-card__meta">';
                if (asset.stageLabel) {
                    html += '<span class="asset-card__stage">';
                    html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>';
                    html += escapeHtml(asset.stageLabel);
                    html += '</span>';
                } else {
                    html += '<span>General</span>';
                }
                html += '<span>' + asset.lastUpdated + '</span>';
                html += '</div>';

                html += '</div>';
            });

            grid.innerHTML = html;

            // Card click handlers
            grid.querySelectorAll('.asset-card').forEach(function(card) {
                card.addEventListener('click', function() {
                    var id = this.dataset.id;
                    var asset = assets.find(function(a) { return a.id === id; });
                    if (asset) openModal(asset);
                });
            });
        }

        /* --- Modal --- */
        function openModal(asset) {
            currentAsset = asset;
            document.getElementById('modalTitle').textContent = asset.title;
            document.getElementById('modalContent').innerHTML = markdownToHtml(asset.content);
            document.getElementById('modalOverlay').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            document.getElementById('modalOverlay').classList.remove('active');
            document.body.style.overflow = '';
            currentAsset = null;
        }

        /* --- Simple Markdown to HTML --- */
        function markdownToHtml(md) {
            var html = md;
            // Headers
            html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
            // Bold
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            // Tables
            html = html.replace(/\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)/g, function(match, header, body) {
                var ths = header.split('|').map(function(h) { return '<th>' + h.trim() + '</th>'; }).join('');
                var rows = body.trim().split('\n').map(function(row) {
                    var tds = row.replace(/^\||\|$/g, '').split('|').map(function(d) { return '<td>' + d.trim() + '</td>'; }).join('');
                    return '<tr>' + tds + '</tr>';
                }).join('');
                return '<table><thead><tr>' + ths + '</tr></thead><tbody>' + rows + '</tbody></table>';
            });
            // Lists
            html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
            html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
            // Paragraphs (lines not inside tags)
            html = html.split('\n').map(function(line) {
                line = line.trim();
                if (!line) return '';
                if (line.match(/^<(h[23]|ul|ol|li|table|thead|tbody|tr|th|td|div|p)/)) return line;
                return '<p>' + line + '</p>';
            }).join('\n');
            // Clean up double-wrapped
            html = html.replace(/<p><\/p>/g, '');

            return html;
        }

        /* --- Bind Events --- */
        function bindEvents() {
            // Search
            var searchInput = document.getElementById('searchInput');
            searchInput.addEventListener('input', function() {
                clearTimeout(searchDebounceTimer);
                var val = sanitizeSearchInput(this.value).toLowerCase();
                searchDebounceTimer = setTimeout(function() {
                    searchQuery = val;
                    renderAssets();
                }, 180);
            });

            // Sort
            document.getElementById('sortSelect').addEventListener('change', function() {
                sortBy = this.value;
                renderAssets();
            });

            // Modal close
            document.getElementById('modalClose').addEventListener('click', closeModal);
            document.getElementById('modalOverlay').addEventListener('click', function(e) {
                if (e.target === this) closeModal();
            });

            // Escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') closeModal();
            });

            // Copy
            document.getElementById('modalCopy').addEventListener('click', function() {
                if (!currentAsset) return;
                if (window.ExportUtils) {
                    ExportUtils.copyToClipboard(currentAsset.content, this);
                } else {
                    navigator.clipboard.writeText(currentAsset.content).then(function() {
                        showButtonFeedback(document.getElementById('modalCopy'), 'Copied');
                    });
                }
                if (window.AIUsageTelemetry && typeof window.AIUsageTelemetry.logAssetUsage === 'function') {
                    window.AIUsageTelemetry.logAssetUsage({
                        id: currentAsset.id,
                        title: currentAsset.title,
                        stage: currentAsset.stageLabel || 'General',
                        action: 'copy'
                    });
                }
            });

            // Print
            document.getElementById('modalPrint').addEventListener('click', function() {
                if (!currentAsset) return;
                if (window.ExportUtils) {
                    ExportUtils.printContent(currentAsset.title, document.getElementById('modalContent').innerHTML);
                } else {
                    var w = window.open('', '_blank');
                    w.document.write('<html><head><title>' + currentAsset.title + '</title></head><body>' +
                        document.getElementById('modalContent').innerHTML + '</body></html>');
                    w.document.close();
                    w.print();
                }
            });

            // Download
            document.getElementById('modalDownload').addEventListener('click', function() {
                if (!currentAsset) return;
                var filename = currentAsset.id + '.md';
                if (window.ExportUtils) {
                    ExportUtils.downloadFile(filename, currentAsset.content, 'text/markdown');
                } else {
                    var blob = new Blob([currentAsset.content], { type: 'text/markdown' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                }
                if (window.AIUsageTelemetry && typeof window.AIUsageTelemetry.logAssetUsage === 'function') {
                    window.AIUsageTelemetry.logAssetUsage({
                        id: currentAsset.id,
                        title: currentAsset.title,
                        stage: currentAsset.stageLabel || 'General',
                        action: 'download'
                    });
                }
            });
        }

        function showButtonFeedback(btn, msg) {
            var orig = btn.innerHTML;
            btn.textContent = msg;
            setTimeout(function() { btn.innerHTML = orig; }, 1500);
        }

        function escapeHtml(str) {
            var div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        }

        /* --- Init --- */
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    })();
