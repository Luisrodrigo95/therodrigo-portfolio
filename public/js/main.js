(function () {
    'use strict';

    /* ------------------------------------------------------------------
       Theme switcher (ezgclan-style): 6 themes via [data-theme] on <html>,
       persisted in localStorage, defaulting to the OS color scheme.
       ------------------------------------------------------------------ */
    var THEME_KEY = 'theme';
    var themeButtons = Array.prototype.slice.call(document.querySelectorAll('.theme-btn'));
    var themePill = document.querySelector('.theme-pill');
    var hasSelectedFirstColor = false;
    var wasScrolledDown = window.scrollY > 35;

    var currentRrdRange = '4h';
    var refreshRrdGraphsOnly = null;

    function applyTheme(id) {
        document.documentElement.setAttribute('data-theme', id);
        themeButtons.forEach(function (btn) {
            btn.setAttribute('aria-pressed', String(btn.dataset.themeId === id));
        });
        try { localStorage.setItem(THEME_KEY, id); } catch (e) { /* private mode */ }
        if (typeof refreshRrdGraphsOnly === 'function') {
            refreshRrdGraphsOnly();
        }
    }

    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* private mode */ }
    if (!saved) {
        saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
            ? 'light' : 'dark';
    }
    applyTheme(saved);

    themeButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            applyTheme(btn.dataset.themeId);
            hasSelectedFirstColor = true;
            wasScrolledDown = window.scrollY > 35;
            if (themePill) {
                themePill.classList.add('is-compact', 'just-selected');
            }
        });
    });

    if (themePill) {
        themePill.addEventListener('mouseleave', function () {
            themePill.classList.remove('just-selected');
        });
    }

    window.addEventListener('scroll', function () {
        if (!themePill || !hasSelectedFirstColor) return;
        var y = window.scrollY || window.pageYOffset || 0;
        if (y > 35) {
            wasScrolledDown = true;
            if (!themePill.classList.contains('is-compact')) {
                themePill.classList.add('is-compact');
            }
        } else if (y <= 15 && wasScrolledDown) {
            wasScrolledDown = false;
            themePill.classList.remove('is-compact', 'just-selected');
        }
    }, { passive: true });

    /* ------------------------------------------------------------------
       Discount-code copy buttons
       ------------------------------------------------------------------ */
    document.querySelectorAll('.copy-code').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var code = btn.dataset.code || '';
            var feedback = btn.parentElement.querySelector('.copy-feedback');

            function done(ok) {
                var href = btn.dataset.href;
                if (feedback) {
                    var msg = ok ? 'Copied!' : 'Copy failed — code is on the button';
                    if (href) msg += ' Opening ZAP-Hosting…';
                    feedback.textContent = msg;
                    setTimeout(function () { feedback.textContent = ''; }, 3000);
                }
                // Copy first, then open: the clipboard needs a focused document,
                // and the click's transient activation still allows the popup.
                if (href) window.open(href, '_blank', 'noopener,noreferrer');
            }

            function legacyCopy() {
                var ta = document.createElement('textarea');
                ta.value = code;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                var ok = false;
                try { ok = document.execCommand('copy'); } catch (e) { /* unsupported */ }
                document.body.removeChild(ta);
                done(ok);
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code).then(function () { done(true); }, legacyCopy);
            } else {
                legacyCopy();
            }
        });
    });

    /* ------------------------------------------------------------------
       Career timeline: reveal collapsed entries on "Load more"
       ------------------------------------------------------------------ */
    var loadMoreBtn = document.getElementById('career-load-more');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function () {
            var hiddenItems = document.querySelectorAll('#career-timeline .timeline-item[hidden]');
            var first = null;

            loadMoreBtn.setAttribute('aria-expanded', 'true');

            hiddenItems.forEach(function (item, i) {
                item.hidden = false;
                item.style.setProperty('--stagger', Math.min(i, 7));
                item.classList.add('reveal', 'in'); // reuse the pop-in entrance
                if (!first) first = item;
            });

            var btnItem = loadMoreBtn.closest('.timeline-more');
            if (btnItem) btnItem.remove(); // connector line now ends at the new entry

            if (first) {
                var heading = first.querySelector('.timeline-role') || first;
                heading.setAttribute('tabindex', '-1');
                heading.focus();
            }
        });
    }

    /* ------------------------------------------------------------------
       Footer terminal: run the real `uptime` on the server and print it
       ------------------------------------------------------------------ */
    var uptimeBtn = document.getElementById('uptime-btn');
    var uptimeOut = document.getElementById('uptime-out');
    if (uptimeBtn && uptimeOut) {
        uptimeBtn.addEventListener('click', function () {
            uptimeBtn.disabled = true;
            uptimeOut.hidden = false;
            uptimeOut.textContent = '> querying host...';

            fetch('/api/uptime')
                .then(function (res) {
                    if (!res.ok) throw new Error('bad status');
                    return res.json();
                })
                .then(function (data) {
                    var line = '> ' + data.host + ': ' + data.pretty;
                    if (data.load) line += '  |  load ' + data.load;
                    uptimeOut.textContent = line;
                })
                .catch(function () {
                    uptimeOut.textContent = '> host unreachable — try again in a moment';
                })
                .then(function () { uptimeBtn.disabled = false; });
        });
    }

    /* Copy-to-clipboard for the footer email and phone buttons */
    ['copy-email', 'copy-phone'].forEach(function (btnId) {
        var copyBtn = document.getElementById(btnId);
        if (!copyBtn) return;
        copyBtn.addEventListener('click', function () {
            var value = copyBtn.dataset.code;
            var label = copyBtn.querySelector('i');

            function flash(ok) {
                label.className = ok ? 'fa-solid fa-check' : 'fa-solid fa-xmark';
                setTimeout(function () { label.className = 'fa-regular fa-copy'; }, 2000);
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(value).then(function () { flash(true); }, function () { flash(false); });
            } else {
                flash(false);
            }
        });
    });

    /* ------------------------------------------------------------------
       RRD Telemetry v2.0 (Improvements A, B, C, D, E):
       - Live sub-ms ping & Smokeping metrics (/api/fleet/telemetry)
       - Interactive Time Window Selector (1h, 4h, 24h, 7d)
       - Theme-synced HiDPI 600x160 RRD graphs
       ------------------------------------------------------------------ */
    function getActiveTheme() {
        return document.documentElement.getAttribute('data-theme') || 'dark';
    }

    refreshRrdGraphsOnly = function () {
        var theme = encodeURIComponent(getActiveTheme());
        var range = encodeURIComponent(currentRrdRange);
        var bust = Date.now();
        document.querySelectorAll('.real-rrd-graph').forEach(function (img) {
            var serverId = img.getAttribute('data-server');
            img.src = '/api/graphs/latency/' + encodeURIComponent(serverId) +
                '?range=' + range + '&theme=' + theme + '&t=' + bust;
        });
    };

    function refreshFleetTelemetry(rangeOverride, isManualSync) {
        if (rangeOverride) {
            currentRrdRange = rangeOverride;
        }
        var range = currentRrdRange;
        var syncBtn = document.getElementById('rrd-sync-btn');
        var syncLabel = document.getElementById('rrd-sync-label');

        if (isManualSync && syncBtn) {
            syncBtn.classList.add('syncing');
            if (syncLabel) syncLabel.textContent = 'Syncing…';
        }

        // 1. Update graph labels & reload HiDPI theme-aware graphs
        document.querySelectorAll('[data-graph-label]').forEach(function (lbl) {
            lbl.textContent = 'Latency history (' + range + ')';
        });
        refreshRrdGraphsOnly();

        // 2. Fetch live sub-millisecond ping, AVG, MIN, MAX, JITTER, LOSS
        fetch('/api/fleet/telemetry?range=' + encodeURIComponent(range))
            .then(function (res) {
                if (!res.ok) throw new Error('Telemetry HTTP ' + res.status);
                return res.json();
            })
            .then(function (data) {
                window.__latestFleetTelemetry = data;
                var nodes = (data && data.nodes) || {};
                var rttSum = 0;
                var rttCount = 0;

                Object.keys(nodes).forEach(function (serverId) {
                    var st = nodes[serverId];
                    if (!st) return;

                    // Live ping badge on top-right of each graph
                    var pingBadge = document.querySelector('[data-live-ping="' + serverId + '"]');
                    if (pingBadge && st.last !== null) {
                        var valEl = pingBadge.querySelector('.ping-val');
                        if (valEl) valEl.textContent = st.last.toFixed(2) + ' ms';
                        pingBadge.classList.remove('ping-nominal', 'ping-elevated', 'ping-spike');
                        if (st.status === 'SPIKE') pingBadge.classList.add('ping-spike');
                        else if (st.status === 'ELEVATED') pingBadge.classList.add('ping-elevated');
                        else pingBadge.classList.add('ping-nominal');

                        rttSum += st.last;
                        rttCount++;
                    }

                    // Live RRD availability uptime % badge & tracked days in footer
                    var uptimeEl = document.querySelector('[data-live-uptime="' + serverId + '"]');
                    if (uptimeEl && st.uptimePct !== undefined && st.uptimePct !== null) {
                        uptimeEl.textContent = st.uptimePct.toFixed(2) + '%';
                    }
                    var daysEl = document.querySelector('[data-live-days="' + serverId + '"]');
                    if (daysEl && st.daysOnline !== undefined && st.daysOnline !== null) {
                        daysEl.textContent = String(st.daysOnline);
                    }

                    // Smokeping micro-metrics row below each graph
                    var avgEl = document.querySelector('[data-m-avg="' + serverId + '"]');
                    var minEl = document.querySelector('[data-m-min="' + serverId + '"]');
                    var maxEl = document.querySelector('[data-m-max="' + serverId + '"]');
                    var jitEl = document.querySelector('[data-m-jitter="' + serverId + '"]');
                    var lossEl = document.querySelector('[data-m-loss="' + serverId + '"]');

                    if (avgEl) avgEl.textContent = st.avg !== null ? st.avg.toFixed(2) + 'ms' : '--';
                    if (minEl) minEl.textContent = st.min !== null ? st.min.toFixed(2) + 'ms' : '--';
                    if (maxEl) maxEl.textContent = st.max !== null ? st.max.toFixed(2) + 'ms' : '--';
                    if (jitEl) jitEl.textContent = st.jitter !== null ? '±' + st.jitter.toFixed(3) + 'ms' : '--';
                    if (lossEl) {
                        var lossVal = st.lossPct !== null ? st.lossPct.toFixed(1) + '%' : '0.0%';
                        lossEl.textContent = lossVal;
                        lossEl.className = 'rrd-m-val ' + (st.lossPct > 0 ? 'rrd-m-warn' : 'rrd-m-ok');
                    }
                });

                // Sync real fleet mean latency into bottom-left HUD & terminal status bar
                if (rttCount > 0) {
                    var meanMs = (rttSum / rttCount).toFixed(2);
                    var hudStatEl = document.getElementById('hud-ticker-lat');
                    var termStatEl = document.getElementById('term-live-lat');
                    if (hudStatEl) hudStatEl.textContent = meanMs + 'ms';
                    if (termStatEl) termStatEl.innerHTML = '<i class="fa-solid fa-bolt" aria-hidden="true"></i> ' + meanMs + 'ms';
                }
            })
            .catch(function (err) {
                console.warn('RRD telemetry fetch warning:', err);
            })
            .then(function () {
                if (isManualSync && syncBtn) {
                    setTimeout(function () {
                        syncBtn.classList.remove('syncing');
                        if (syncLabel) syncLabel.textContent = 'Synced';
                        setTimeout(function () {
                            if (syncLabel) syncLabel.textContent = 'Sync';
                        }, 1600);
                    }, 320);
                }
            });

        // 3. Also refresh live host uptime for the terminal status bar & neofetch
        fetch('/api/uptime')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (upData) {
                if (!upData) return;
                window.__latestHostUptime = upData;
                var termUpEl = document.getElementById('term-live-uptime');
                if (termUpEl && upData.pretty) {
                    termUpEl.innerHTML = '<i class="fa-regular fa-clock" aria-hidden="true"></i> ' + upData.pretty;
                }
            })
            .catch(function () { /* ignore */ });
    }

    // Bind interactive window buttons (1H, 4H, 24H, 7D)
    var rangeButtons = Array.prototype.slice.call(document.querySelectorAll('.rrd-range-btn'));
    rangeButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var r = btn.getAttribute('data-range') || '4h';
            rangeButtons.forEach(function (b) {
                var active = b === btn;
                b.classList.toggle('active', active);
                b.setAttribute('aria-pressed', String(active));
            });
            refreshFleetTelemetry(r, true);
        });
    });

    // Bind manual Sync button
    var rrdSyncBtn = document.getElementById('rrd-sync-btn');
    if (rrdSyncBtn) {
        rrdSyncBtn.addEventListener('click', function () {
            refreshFleetTelemetry(currentRrdRange, true);
        });
    }

    // Initial load + 60s auto-refresh
    refreshFleetTelemetry('4h', false);
    setInterval(function () {
        refreshFleetTelemetry(currentRrdRange, false);
    }, 60000);

    /* ------------------------------------------------------------------
       Section 06 · Server & Security Telemetry (Cloudflare, PM2, CVE Radar)
       All dynamic values are inserted with textContent / DOM nodes (never innerHTML)
       ------------------------------------------------------------------ */
    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function fmtCompactUptime(seconds) {
        var s = Math.max(0, Math.floor(Number(seconds) || 0));
        var d = Math.floor(s / 86400);
        var h = Math.floor((s % 86400) / 3600);
        var m = Math.floor((s % 3600) / 60);
        if (d > 0) return d + 'd ' + h + 'h';
        if (h > 0) return h + 'h ' + m + 'm';
        return m + 'm';
    }

    var currentCveFilter = 'latest';
    var cachedSecOpsPayload = null;

    function renderCveCategory(filterKey) {
        currentCveFilter = filterKey || 'latest';
        var grid = document.getElementById('cve-radar-grid');
        if (!grid) return;

        var cveData = (cachedSecOpsPayload && cachedSecOpsPayload.cveRadar) || {};
        var cats = cveData.categories || {};
        var items = cats[currentCveFilter] || cats.latest || [];

        grid.textContent = '';
        items.forEach(function (vuln) {
            var card = el('div', 'cve-item');

            var top = el('div', 'cve-item-top mono');
            var link = el('a', 'cve-id-link', vuln.id);
            link.href = vuln.url || ('https://nvd.nist.gov/vuln/detail/' + encodeURIComponent(vuln.id));
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            var extIcon = el('i', 'fa-solid fa-arrow-up-right-from-square');
            extIcon.setAttribute('aria-hidden', 'true');
            extIcon.style.fontSize = '10px';
            link.appendChild(extIcon);

            var badges = el('div', 'cve-badges');
            badges.appendChild(el('span', 'cve-pill', vuln.cwe || 'CWE-NVD'));
            if (vuln.ransomware) {
                badges.appendChild(el('span', 'cve-pill cve-pill-ransom', 'RANSOMWARE'));
            } else {
                badges.appendChild(el('span', 'cve-pill cve-pill-kev', 'KEV ACTIVE'));
            }

            top.appendChild(link);
            top.appendChild(badges);

            var vendorLine = el('p', 'cve-vendor mono', (vuln.vendor || 'Vendor') + ' · ' + (vuln.product || 'System'));
            var title = el('h4', 'cve-title', vuln.name || vuln.id);
            var desc = el('p', 'cve-desc', vuln.summary || '');

            var foot = el('div', 'cve-meta-foot mono');
            foot.appendChild(el('span', null, 'Added: ' + (vuln.dateAdded || '--')));
            foot.appendChild(el('span', null, 'Due: ' + (vuln.dueDate || '--')));

            card.appendChild(top);
            card.appendChild(vendorLine);
            card.appendChild(title);
            card.appendChild(desc);
            card.appendChild(foot);
            grid.appendChild(card);
        });
    }

    function renderSecOpsTelemetry(data) {
        if (!data || !data.ok) return;
        cachedSecOpsPayload = data;
        window.__latestSecOpsTelemetry = data;

        // 1. Cloudflare Edge & Perimeter
        var cf = data.cloudflare || {};
        var cfVisEl = document.getElementById('cf-kpi-visitor');
        var cfVpsEl = document.getElementById('cf-kpi-vps');
        var cfProtoEl = document.getElementById('cf-kpi-proto');
        var cfWafEl = document.getElementById('cf-kpi-waf');
        var cfRayEl = document.getElementById('cf-spec-ray');
        var cfFlEl = document.getElementById('cf-spec-fl');
        var cfSniEl = document.getElementById('cf-spec-sni');
        var cfOrigEl = document.getElementById('cf-spec-origin');
        var cfFwEl = document.getElementById('cf-spec-fw');

        if (cfVisEl) cfVisEl.textContent = (cf.visitorColo || 'LAX') + ' (' + (cf.visitorCountry || 'MX') + ')';
        if (cfVpsEl) cfVpsEl.textContent = (cf.vpsEdgeColo || 'LAX') + ' (' + (cf.vpsEdgeLoc || 'US') + ')';
        if (cfProtoEl) cfProtoEl.textContent = (cf.httpVersion || 'HTTP/2') + ' · ' + (cf.tlsVersion || 'TLSv1.3');
        if (cfWafEl) cfWafEl.textContent = 'ENFORCED';
        if (cfRayEl) cfRayEl.textContent = cf.visitorRay || 'Direct / Edge Trace';
        if (cfFlEl) cfFlEl.textContent = 'fl=' + (cf.vpsEdgeFl || '618f218') + ' · colo=' + (cf.vpsEdgeColo || 'LAX');
        if (cfSniEl) cfSniEl.textContent = 'SNI: ' + (cf.sniMode || 'encrypted') + ' · WARP: ' + (cf.warpState || 'off');
        if (cfOrigEl) cfOrigEl.textContent = cf.originGateway || 'Nginx 1.26 -> 127.0.0.1:3000';
        if (cfFwEl) cfFwEl.textContent = cf.firewallPosture || 'nftables + Loopback SSH (:9876)';

        // 2. Local PM2 & Systemd Supervisor
        var pm = data.pm2 || {};
        var pmBadgeEl = document.getElementById('pm2-status-badge');
        var pmLoadEl = document.getElementById('pm2-kpi-load');
        var pmRamEl = document.getElementById('pm2-kpi-ram');
        var pmRssEl = document.getElementById('pm2-kpi-rss');
        var pmUpEl = document.getElementById('pm2-kpi-uptime');
        var pmListEl = document.getElementById('pm2-daemon-list');

        if (pmBadgeEl) {
            pmBadgeEl.textContent = (pm.onlineCount || 0) + '/' + (pm.totalCount || 0) + ' ONLINE';
        }
        if (pmLoadEl) pmLoadEl.textContent = (pm.loadAvg || '0.04, 0.02').split(',').slice(0, 2).join(', ');
        if (pmRamEl) pmRamEl.textContent = (pm.memUsedMb || 0) + 'MB (' + (pm.memPct || 0) + '%)';
        if (pmRssEl) pmRssEl.textContent = (pm.totalRssMb || 0) + ' MB';
        if (pmUpEl) pmUpEl.textContent = fmtCompactUptime(pm.uptimeSeconds);

        if (pmListEl && Array.isArray(pm.daemons)) {
            pmListEl.textContent = '';
            pm.daemons.forEach(function (d) {
                var row = el('div', 'pm2-daemon-row');
                var nameWrap = el('span', 'pm2-d-name');
                var dot = el('span', 'status-dot');
                dot.setAttribute('aria-hidden', 'true');
                nameWrap.appendChild(dot);
                nameWrap.appendChild(document.createTextNode(d.name));

                row.appendChild(nameWrap);
                row.appendChild(el('span', 'pm2-d-dim', d.type || 'fork'));
                row.appendChild(el('span', 'pm2-d-dim', d.pid ? String(d.pid) : 'sys'));
                row.appendChild(el('span', null, (d.cpu !== undefined ? d.cpu : 0) + '%'));
                row.appendChild(el('span', null, (d.memMb !== undefined ? d.memMb : 0) + ' MB'));
                row.appendChild(el('span', 'pm2-d-ok', fmtCompactUptime(d.uptimeSeconds)));

                pmListEl.appendChild(row);
            });
        }

        // 3. CISA KEV / NVD Vulnerability Radar
        var cve = data.cveRadar || {};
        var metaEl = document.getElementById('cve-catalog-meta');
        if (metaEl) {
            metaEl.textContent = 'CISA KEV Catalog v' + (cve.catalogVersion || '2026.10') +
                ' · ' + Number(cve.totalTracked || 1739).toLocaleString('en-US') +
                ' tracked actively exploited CVEs';
        }
        renderCveCategory(currentCveFilter);
    }

    function fetchSecOpsTelemetry(isManual) {
        var syncBtn = document.getElementById('secops-sync-btn');
        var syncLbl = document.getElementById('secops-sync-label');
        if (isManual && syncBtn) {
            syncBtn.classList.add('syncing');
            if (syncLbl) syncLbl.textContent = 'Syncing…';
        }

        var url = '/api/security-telemetry' + (isManual ? '?refresh=1' : '');
        fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                renderSecOpsTelemetry(data);
            })
            .catch(function (err) {
                console.warn('SecOps telemetry warning:', err);
            })
            .then(function () {
                if (isManual && syncBtn) {
                    setTimeout(function () {
                        syncBtn.classList.remove('syncing');
                        if (syncLbl) syncLbl.textContent = 'Synced';
                        setTimeout(function () {
                            if (syncLbl) syncLbl.textContent = 'Sync SecOps';
                        }, 1500);
                    }, 300);
                }
            });
    }

    /* ------------------------------------------------------------------
       Scroll-triggered reveals with squash & stretch. Elements are only
       hidden when <html> has .js (set pre-paint in head.ejs, and only if
       IntersectionObserver exists) — no JS / reduced motion = no hiding.
       Called by the boot intro when it finishes (or right away without it).
       ------------------------------------------------------------------ */
    var revealsStarted = false;
    function initReveals() {
        if (revealsStarted || !document.documentElement.classList.contains('js')) return;
        revealsStarted = true;

        var revealTargets = document.querySelectorAll(
            '.section-head, .card, .timeline-item, .chip, .sub-head, ' +
            '.hero-name, .hero-role, .hero-bio, .marquee-container'
        );

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        revealTargets.forEach(function (el) {
            var idx = Array.prototype.indexOf.call(el.parentElement.children, el);
            el.style.setProperty('--stagger', Math.min(idx, 7));
            el.classList.add('reveal');
            io.observe(el);
        });

        // Unlock hover transforms once the entrance animation finishes
        document.addEventListener('animationend', function (e) {
            if (e.animationName === 'pop-in') e.target.classList.add('done');
        });

        // Failsafe: never leave content hidden (broken IO, odd browsers)
        setTimeout(function () {
            document.querySelectorAll('.reveal:not(.done)').forEach(function (el) {
                el.classList.add('in', 'done');
            });
        }, 4000);
    }

    /* ------------------------------------------------------------------
       Scrollspy: highlight the nav tab for the section being read.
       Uses a reading line at 30% of the viewport; the last section wins
       when scrolled to the very bottom (it may be shorter than the line).
       ------------------------------------------------------------------ */
    (function scrollSpy() {
        var items = [];
        document.querySelectorAll('.pill-nav a[href^="#"]').forEach(function (link) {
            var section = document.getElementById(link.getAttribute('href').slice(1));
            if (section) items.push({ link: link, section: section });
        });
        if (!items.length) return;

        var currentLink = null;

        function update() {
            var line = window.scrollY + window.innerHeight * 0.3;
            var active = items[0];

            items.forEach(function (item) {
                var top = item.section.getBoundingClientRect().top + window.scrollY;
                if (top <= line) active = item;
            });

            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
                active = items[items.length - 1];
            }
            if (active.link === currentLink) return;
            currentLink = active.link;

            items.forEach(function (item) {
                var on = item.link === currentLink;
                item.link.classList.toggle('active', on);
                if (on) item.link.setAttribute('aria-current', 'true');
                else item.link.removeAttribute('aria-current');
            });
        }

        var ticking = false;
        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () { ticking = false; update(); });
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        update();
    })();

    /* ------------------------------------------------------------------
       Boot intro: retro terminal log types out, WELCOME in the middle,
       then fades into the page. Once per session, skippable, and never
       shown to reduced-motion users (html.no-boot hides it pre-paint).
       ------------------------------------------------------------------ */
    (function bootIntro() {
        var boot = document.getElementById('boot-screen');
        if (!boot || getComputedStyle(boot).display === 'none') {
            if (boot) boot.hidden = true;
            initReveals();
            return;
        }
        try { sessionStorage.setItem('boot-seen', '1'); } catch (e) { /* private mode */ }

        var logEl = document.getElementById('boot-log');
        var welcomeEl = document.getElementById('boot-welcome');
        var lines = [
            '[ OK ] BIOS therodrigo.com v2.0',
            '[ OK ] mounting /dev/portfolio',
            '[ OK ] loading modules: proxmox kvm nftables rrdtool',
            '[ OK ] starting telemetry daemon',
            '[ OK ] 4 fleet nodes online',
            '[ OK ] compliance scan: 0 license violations',
            'root@zap-hosting:~$ ./welcome.sh'
        ];
        var timers = [];
        var finished = false;

        function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

        function finish(fast) {
            if (finished) return;
            finished = true;
            timers.forEach(clearTimeout);
            document.removeEventListener('keydown', skip);
            boot.removeEventListener('click', skip);
            boot.classList.add('hide');
            setTimeout(function () { boot.hidden = true; }, fast ? 80 : 520);
            initReveals();
        }
        function skip() { finish(true); }

        document.addEventListener('keydown', skip);
        boot.addEventListener('click', skip);

        // First line types char by char, the rest land line by line
        var t = 200;
        var first = lines[0];
        for (var i = 1; i <= first.length; i++) {
            (function (n) { later(function () { logEl.textContent = first.slice(0, n); }, t); })(i);
            t += 16;
        }
        lines.slice(1).forEach(function (line) {
            t += 120;
            later(function () { logEl.textContent += '\n' + line; }, t);
        });

        // WELCOME typed letter by letter in the middle
        t += 380;
        var word = 'WELCOME';
        for (var j = 1; j <= word.length; j++) {
            (function (n) { later(function () { welcomeEl.textContent = word.slice(0, n); }, t); })(j);
            t += 95;
        }
        t += 950;
        later(function () { finish(false); }, t);
    })();

    /* ------------------------------------------------------------------
       HUD Toast Notification System
       ------------------------------------------------------------------ */
    var toastEl = document.getElementById('hud-toast');
    var toastTimer = null;
    function showToast(message, icon, duration) {
        if (!toastEl) return;
        duration = duration || 3200;
        icon = icon || 'fa-solid fa-circle-check';
        toastEl.textContent = '';

        var iconEl = document.createElement('i');
        iconEl.className = icon;
        iconEl.setAttribute('aria-hidden', 'true');

        var spanEl = document.createElement('span');
        spanEl.textContent = message;

        toastEl.appendChild(iconEl);
        toastEl.appendChild(spanEl);
        toastEl.hidden = false;
        toastEl.classList.add('show');

        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toastEl.classList.remove('show');
            setTimeout(function () { toastEl.hidden = true; }, 320);
        }, duration);
    }

    /* ------------------------------------------------------------------
       Ambient Cyber-Stingray Ocean & Cardumen Swarm System
       ------------------------------------------------------------------ */
    var STINGRAY_SVG = '<svg viewBox="0 0 280 200" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" class="manta-svg-root" aria-hidden="true">' +
        '<defs>' +
        '  <linearGradient id="mantaFuselageGrad" x1="185" y1="90" x2="70" y2="105" gradientUnits="userSpaceOnUse">' +
        '    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>' +
        '    <stop offset="35%" stop-color="#e2e8f0" stop-opacity="0.88"/>' +
        '    <stop offset="70%" stop-color="#94a3b8" stop-opacity="0.65"/>' +
        '    <stop offset="100%" stop-color="#475569" stop-opacity="0.5"/>' +
        '  </linearGradient>' +
        '  <linearGradient id="mantaFuselageSpecular" x1="180" y1="88" x2="130" y2="100" gradientUnits="userSpaceOnUse">' +
        '    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.7"/>' +
        '    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>' +
        '  </linearGradient>' +
        '  <linearGradient id="mantaWingGradNear" x1="150" y1="95" x2="100" y2="185" gradientUnits="userSpaceOnUse">' +
        '    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45"/>' +
        '    <stop offset="50%" stop-color="#0ea5e9" stop-opacity="0.24"/>' +
        '    <stop offset="85%" stop-color="#10b981" stop-opacity="0.14"/>' +
        '    <stop offset="100%" stop-color="#059669" stop-opacity="0.04"/>' +
        '  </linearGradient>' +
        '  <linearGradient id="mantaWingGradFar" x1="145" y1="82" x2="110" y2="18" gradientUnits="userSpaceOnUse">' +
        '    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.36"/>' +
        '    <stop offset="50%" stop-color="#0284c7" stop-opacity="0.18"/>' +
        '    <stop offset="85%" stop-color="#059669" stop-opacity="0.09"/>' +
        '    <stop offset="100%" stop-color="#047857" stop-opacity="0.03"/>' +
        '  </linearGradient>' +
        '</defs>' +
        '<!-- Far Wing (Upper / Background in 3/4 perspective) -->' +
        '<g class="manta-wing-far">' +
        '  <path d="M154 83 C146 64 130 36 114 20 C103 31 92 60 74 96 C98 94 132 89 154 83 Z" fill="url(#mantaWingGradFar)" stroke="#38bdf8" stroke-width="1.6" stroke-linejoin="round" />' +
        '  <path class="manta-circuit-trace manta-data-pulse-1" d="M142 81 L128 58 L122 58 L112 36 L114 22" stroke="#38bdf8" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />' +
        '  <path class="manta-circuit-trace manta-data-pulse-2" d="M130 83 L120 70 L108 70 L98 52" stroke="#10b981" stroke-width="1.1" stroke-linecap="round" />' +
        '  <path class="manta-circuit-trace" d="M116 86 L108 78 L94 78" stroke="#38bdf8" stroke-width="0.9" stroke-opacity="0.6" stroke-linecap="round" />' +
        '  <circle cx="114" cy="22" r="2.2" fill="#38bdf8" />' +
        '  <circle cx="98" cy="52" r="1.8" fill="#10b981" />' +
        '  <circle cx="94" cy="78" r="1.6" fill="#38bdf8" />' +
        '</g>' +
        '<!-- Main Fusiform Body & Head Core (pitching & heaving with the swim stroke) -->' +
        '<g class="manta-body-core">' +
        '  <path d="M188 95 C178 84 156 81 128 84 C102 86 82 95 72 105 C83 111 114 112 142 110 C170 108 185 102 188 95 Z" fill="url(#mantaFuselageGrad)" stroke="#f8fafc" stroke-width="1.8" />' +
        '  <path d="M182 94 C168 86 142 85 120 89 C104 92 88 98 80 103 C96 101 122 97 146 96 C168 95 178 94 182 94 Z" fill="url(#mantaFuselageSpecular)" />' +
        '  <!-- Cephalic Horns (Rostrum in 3D profile) -->' +
        '  <path d="M180 88 C188 83 198 83 195 91 C192 95 184 94 180 91" fill="#f1f5f9" stroke="#38bdf8" stroke-width="1.6" stroke-linecap="round" />' +
        '  <path d="M184 98 C193 102 201 105 198 112 C193 115 186 110 183 103" fill="#f1f5f9" stroke="#38bdf8" stroke-width="1.6" stroke-linecap="round" />' +
        '  <!-- Optic Sensory Eye -->' +
        '  <circle cx="174" cy="93" r="2.8" fill="#38bdf8" />' +
        '  <circle cx="174" cy="93" r="5.2" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.6" stroke-dasharray="2 2" />' +
        '  <!-- Luminous Ventral Telemetry Gills -->' +
        '  <line x1="162" y1="102" x2="162" y2="107" stroke="#10b981" stroke-width="1.6" stroke-linecap="round" />' +
        '  <line x1="156" y1="103" x2="156" y2="108" stroke="#10b981" stroke-width="1.6" stroke-linecap="round" />' +
        '  <line x1="150" y1="104" x2="150" y2="109" stroke="#10b981" stroke-width="1.6" stroke-linecap="round" />' +
        '  <line x1="144" y1="105" x2="144" y2="110" stroke="#10b981" stroke-width="1.6" stroke-linecap="round" />' +
        '  <!-- Dorsal Spinal Ridge with cyber nodes & Debian Red heartbeat core -->' +
        '  <path d="M178 91 C152 87 122 89 74 104" stroke="#0ea5e9" stroke-width="2.6" stroke-linecap="round" stroke-opacity="0.9" />' +
        '  <path d="M178 91 C152 87 122 89 74 104" stroke="#ffffff" stroke-width="1" stroke-linecap="round" stroke-opacity="0.95" />' +
        '  <circle cx="152" cy="89" r="3.4" fill="#e11d48" class="manta-heart-core" />' +
        '  <circle cx="132" cy="91" r="2.6" fill="#10b981" class="manta-node-pulse" />' +
        '  <circle cx="112" cy="94" r="2.6" fill="#38bdf8" class="manta-node-pulse" />' +
        '  <circle cx="92" cy="99" r="2.4" fill="#10b981" class="manta-node-pulse" />' +
        '  <!-- Whip Tail (Ribbon undulation) -->' +
        '  <g class="manta-tail-whip">' +
        '    <path d="M72 105 C54 109 34 119 6 116" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" />' +
        '    <path d="M72 105 C54 109 34 119 6 116" stroke="#38bdf8" stroke-width="0.9" stroke-dasharray="3 4" />' +
        '    <circle cx="6" cy="116" r="2.8" fill="#38bdf8" class="manta-tail-emitter" />' +
        '    <circle cx="6" cy="116" r="5.5" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.7" class="manta-tail-ring" />' +
        '  </g>' +
        '</g>' +
        '<!-- Near Wing (Foreground / Downward sweeping in 3/4 perspective) -->' +
        '<g class="manta-wing-near">' +
        '  <path d="M160 98 C150 119 133 158 104 182 C93 168 84 139 76 108 C102 108 133 104 160 98 Z" fill="url(#mantaWingGradNear)" stroke="#38bdf8" stroke-width="1.8" stroke-linejoin="round" />' +
        '  <path class="manta-circuit-trace manta-data-pulse-1" d="M148 106 L130 134 L120 134 L108 166 L104 180" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />' +
        '  <path class="manta-circuit-trace manta-data-pulse-2" d="M136 107 L124 126 L112 126 L100 148 L92 148" stroke="#10b981" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />' +
        '  <path class="manta-circuit-trace manta-data-pulse-1" d="M120 108 L108 122 L98 122 L90 134" stroke="#38bdf8" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />' +
        '  <path class="manta-circuit-trace" d="M104 108 L94 116 L84 116" stroke="#0ea5e9" stroke-width="0.9" stroke-opacity="0.6" stroke-linecap="round" />' +
        '  <rect x="117" y="131" width="5" height="5" rx="1" fill="#0f172a" stroke="#38bdf8" stroke-width="0.8" />' +
        '  <rect x="109" y="123" width="5" height="5" rx="1" fill="#0f172a" stroke="#10b981" stroke-width="0.8" />' +
        '  <circle cx="104" cy="180" r="3" fill="#38bdf8" />' +
        '  <circle cx="92" cy="148" r="2.2" fill="#10b981" />' +
        '  <circle cx="90" cy="134" r="1.8" fill="#38bdf8" />' +
        '</g>' +
        '</svg>';

    function spawnMantaSwarm(count) {
        var swarmContainer = document.getElementById('manta-swarm');
        if (!swarmContainer) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        count = count || 6;
        for (var i = 0; i < count; i++) {
            (function (idx) {
                var unit = document.createElement('div');
                unit.className = 'swarm-unit';
                unit.innerHTML = STINGRAY_SVG;

                var dur = (11 + Math.random() * 5).toFixed(1);
                var delay = (idx * 0.42 + Math.random() * 0.25).toFixed(2);
                var scale = (0.65 + Math.random() * 0.55).toFixed(2);
                var startY = (35 + Math.random() * 45).toFixed(0);
                var endY = (-15 - Math.random() * 25).toFixed(0);
                var rot = (20 + Math.random() * 18).toFixed(0);

                unit.style.setProperty('--swarm-dur', dur + 's');
                unit.style.setProperty('--start-y', startY + 'vh');
                unit.style.setProperty('--end-y', endY + 'vh');
                unit.style.setProperty('--rot', rot + 'deg');
                unit.style.setProperty('--scale', scale);
                unit.style.animationDelay = delay + 's';

                swarmContainer.appendChild(unit);

                var totalMs = (parseFloat(dur) + parseFloat(delay) + 1.5) * 1000;
                setTimeout(function () {
                    if (unit && unit.parentElement) {
                        unit.parentElement.removeChild(unit);
                    }
                }, totalMs);
            })(i);
        }
    }

    // Populate ambient gliders and set periodic natural swarms
    (function initStingrayOcean() {
        var ocean = document.getElementById('stingray-ocean');
        if (!ocean) return;

        var gliders = ocean.querySelectorAll('.manta-glider');
        gliders.forEach(function (glider) {
            glider.innerHTML = STINGRAY_SVG;
        });

        // Periodic natural school of rays passing by every 55 seconds
        if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setInterval(function () {
                if (!document.hidden) {
                    spawnMantaSwarm(Math.floor(Math.random() * 3) + 4);
                }
            }, 55000);
        }
    })();

    /* ------------------------------------------------------------------
       Live Ticker: subtle telemetry jitter for active feeling
       ------------------------------------------------------------------ */
    (function initLiveTicker() {
        var hudStatEl = document.getElementById('hud-ticker-lat');
        var termStatEl = document.getElementById('term-live-lat');
        var navStatEl = document.getElementById('nav-ticker-stat');
        if (!hudStatEl && !termStatEl && !navStatEl) return;

        function updateTicker() {
            var ms = (Math.random() * 0.45 + 0.65).toFixed(1);
            if (hudStatEl) hudStatEl.textContent = ms + 'ms';
            if (termStatEl) termStatEl.innerHTML = '<i class="fa-solid fa-bolt" aria-hidden="true"></i> ' + ms + 'ms';
            if (navStatEl) navStatEl.innerHTML = '<i class="fa-solid fa-bolt" aria-hidden="true"></i> ' + ms + 'ms';
        }
        setInterval(updateTicker, 4500);

        // Click HUD telemetry pill to trigger a joyful cyber-manta swarm!
        var hudEl = document.querySelector('.hud-telemetry');
        if (hudEl) {
            hudEl.style.cursor = 'pointer';
            hudEl.addEventListener('click', function () {
                spawnMantaSwarm(6);
                showToast('Telemetry Beacon Pinged! Swarm active.', 'fa-solid fa-radar', 3000);
            });
        }
    })();

    /* ------------------------------------------------------------------
       Interactive Hero Terminal: hybrid commands (real & simulated)
       + Linux Window Controls (Minimize, Maximize/Restore, Reset)
       ------------------------------------------------------------------ */
    (function initHeroTerminal() {
        var termContainer = document.getElementById('hero-terminal');
        var termWindow = document.getElementById('hero-term-window');
        var termForm = document.getElementById('hero-term-form');
        var termInput = document.getElementById('hero-term-input');
        var termLog = document.getElementById('hero-term-log');
        var termScreen = document.getElementById('hero-term-screen');
        var termReset = document.getElementById('hero-term-reset');
        var termMinBtn = document.getElementById('hero-term-min');
        var termMinIcon = document.getElementById('hero-term-min-icon');
        var termMaxBtn = document.getElementById('hero-term-max');
        var termMaxIcon = document.getElementById('hero-term-max-icon');
        var oceanEl = document.getElementById('stingray-ocean');

        if (!termForm || !termInput || !termLog) return;

        var cmdHistory = [];
        var historyIndex = -1;
        var isMinimized = false;
        var isMaximized = false;

        function setMaximizedState(maxState) {
            isMaximized = Boolean(maxState);
            if (termContainer) termContainer.classList.toggle('is-maximized', isMaximized);
            if (termWindow) termWindow.classList.toggle('is-maximized', isMaximized);
            if (termMaxBtn) {
                termMaxBtn.classList.toggle('active', isMaximized);
                termMaxBtn.setAttribute('aria-pressed', String(isMaximized));
                var label = isMaximized ? 'Restore normal size' : 'Maximize terminal';
                termMaxBtn.setAttribute('title', label);
                termMaxBtn.setAttribute('aria-label', label);
            }
            if (termMaxIcon) {
                // Swap icon between □ (fa-square) and ❐ (fa-window-restore)
                termMaxIcon.className = isMaximized ? 'fa-regular fa-window-restore' : 'fa-regular fa-square';
            }
        }

        function setMinimizedState(minState) {
            isMinimized = Boolean(minState);
            if (termWindow) termWindow.classList.toggle('is-minimized', isMinimized);
            if (termMinBtn) {
                termMinBtn.classList.toggle('active', isMinimized);
                termMinBtn.setAttribute('aria-expanded', String(!isMinimized));
                var label = isMinimized ? 'Restore terminal' : 'Minimize terminal';
                termMinBtn.setAttribute('title', label);
                termMinBtn.setAttribute('aria-label', label);
            }
            if (termMinIcon) {
                termMinIcon.className = isMinimized ? 'fa-solid fa-chevron-down' : 'fa-solid fa-minus';
            }
            if (isMinimized && isMaximized) {
                setMaximizedState(false);
            }
        }

        if (termMinBtn) {
            termMinBtn.addEventListener('click', function () {
                setMinimizedState(!isMinimized);
            });
        }

        if (termMaxBtn) {
            termMaxBtn.addEventListener('click', function () {
                if (isMinimized) {
                    setMinimizedState(false);
                }
                setMaximizedState(!isMaximized);
                scrollToBottom();
            });
        }

        function scrollToBottom() {
            if (termScreen) {
                termScreen.scrollTop = termScreen.scrollHeight;
            }
        }

        if (termScreen && termInput) {
            termScreen.addEventListener('click', function (e) {
                if (e.target !== termInput && !e.target.closest('button') && !e.target.closest('a')) {
                    termInput.focus();
                }
            });
        }

        function appendLine(content, className) {
            var div = document.createElement('div');
            div.className = 'term-line ' + (className || '');
            if (typeof content === 'string') {
                div.textContent = content;
            } else if (content instanceof HTMLElement) {
                div.appendChild(content);
            }
            termLog.appendChild(div);
            scrollToBottom();
            return div;
        }

        function appendEcho(rawCmd) {
            var div = document.createElement('div');
            div.className = 'term-line term-cmd-echo';
            var promptSpan = document.createElement('span');
            promptSpan.className = 'term-prompt';
            promptSpan.textContent = 'rodrigo@white-stingray-87538:~$';
            var cmdSpan = document.createElement('span');
            cmdSpan.textContent = rawCmd;
            div.appendChild(promptSpan);
            div.appendChild(cmdSpan);
            termLog.appendChild(div);
            scrollToBottom();
        }

        function appendOutput(text, type) {
            var div = document.createElement('div');
            div.className = 'term-line term-output ' + (type || '');
            div.textContent = text;
            termLog.appendChild(div);
            scrollToBottom();
            return div;
        }

        function resetTerminal() {
            if (isMinimized) {
                setMinimizedState(false);
            }
            termLog.textContent = '';
            appendLine('System online. Connected to white-stingray-87538 (Debian 13 · Node.js v22).', 'term-intro');
            appendLine('Type help for commands, or click any chip below to inspect the infrastructure.', 'term-muted');
            termInput.value = '';
            termInput.focus();
        }

        if (termReset) {
            termReset.addEventListener('click', resetTerminal);
        }

        // Quick command chips
        document.querySelectorAll('.term-chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var cmd = chip.getAttribute('data-cmd');
                if (cmd) executeCommand(cmd);
            });
        });

        function executeCommand(raw) {
            var clean = (raw || '').trim();
            if (!clean) return;

            if (isMinimized) {
                setMinimizedState(false);
            }

            cmdHistory.push(clean);
            historyIndex = cmdHistory.length;
            appendEcho(clean);

            var parts = clean.split(/\s+/);
            var cmd = parts[0].toLowerCase();
            var args = parts.slice(1);

            switch (cmd) {
                case 'help':
                    appendOutput(
                        'AVAILABLE COMMANDS:\n' +
                        '  whoami         -> Identity, credentials & engineering focus\n' +
                        '  skills         -> Systems administration, virtualization & networking stack\n' +
                        '  fleet          -> Status of 4 bare-metal/VPS nodes & RRD telemetry\n' +
                        '  vps            -> Hardware & hypervisor specs of white-stingray-87538\n' +
                        '  secops         -> Live Cloudflare Edge, local PM2 daemons & CVE summary\n' +
                        '  cve            -> Latest actively exploited vulnerabilities (CISA KEV)\n' +
                        '  pm2            -> Live local PM2 & systemd daemon process list\n' +
                        '  projects       -> Active web applications & architectural writeups\n' +
                        '  qwen           -> Local 24GB VRAM AI rig (Qwen3.8-27B-GGUF) & copilot specs\n' +
                        '  cv             -> Download / view verified Curriculum Vitae (PDF)\n' +
                        '  uptime         -> Real execution of `uptime -p` on the live Debian VPS\n' +
                        '  htop           -> Live kernel vCPU, RAM & process monitor (safe mode)\n' +
                        '  ping [target]  -> Probe ICMP latency and packet round-trip time\n' +
                        '  swarm          -> Dispatch autonomous cyber-stingray cardumen swarm\n' +
                        '  feed-stingray  -> Dispense cyber-nutrients to white-stingray (+100 XP)\n' +
                        '  neofetch       -> Retro ASCII sysadmin banner and node metrics\n' +
                        '  zap            -> ZAP-Hosting 20% discount coupon code\n' +
                        '  clear          -> Reset console output history',
                        'accent'
                    );
                    break;

                case 'whoami':
                    appendOutput(
                        'Luis Rodrigo García Hernández\n' +
                        'Role: Technical Support Specialist & Open-Source Compliance Engineer\n' +
                        'Employer: ZAP-Hosting (Nov 2025 – Present) · Mexico City (Remote)\n' +
                        'Previous: Continental Automotive (Nov 2019 – Jan 2025) · Querétaro, MX\n' +
                        'Degree: B.S. Digital Systems & Robotics Engineering (ITESM)',
                        'accent'
                    );
                    break;

                case 'skills':
                    appendOutput(
                        '[SYSTEMS]     Debian 13 Linux · Proxmox VE · KVM · Docker Containers · Ubuntu\n' +
                        '[NETWORKING]  nftables · Netplan · ProFTPD · Reverse Proxies · DNS · Subnets\n' +
                        '[COMPLIANCE]  FOSSology · SPDX 2.2/3.0 · Black Duck Hub · OpenChain (ISO 5230)\n' +
                        '[AUTOMATION]  Bash Scripting · Python 3 · PowerShell · Node.js · SteamCMD',
                        'accent'
                    );
                    break;

                case 'fleet':
                    var fleetPending = appendOutput('Probing RRDtool telemetry databases (/api/fleet/telemetry)...', '');
                    fetch('/api/fleet/telemetry?range=' + encodeURIComponent(currentRrdRange))
                        .then(function (res) { return res.json(); })
                        .then(function (data) {
                            var n = (data && data.nodes) || {};
                            function fmtNode(id, role, os) {
                                var s = n[id];
                                if (!s || s.last === null) return '  ● ' + id + ' [' + role + '] : ' + os + ' : OFFLINE';
                                var upStr = (s.uptimePct !== undefined ? s.uptimePct.toFixed(2) + '%' : '100%') +
                                    (s.daysOnline ? ' (' + s.daysOnline + 'd tracked)' : '');
                                return '  ● ' + id + ' ' + ('[' + role + ']').padEnd(9, ' ') + ' : ' +
                                    s.last.toFixed(2) + 'ms (avg ' + s.avg.toFixed(2) + 'ms, ±' + s.jitter.toFixed(3) + 'ms) · ' + upStr;
                            }
                            var text = 'INFRASTRUCTURE FLEET TELEMETRY (Parallel RRD v2 · Window ' + (data.range || '4h').toUpperCase() + '):\n' +
                                fmtNode('NODE-WIN-01', 'Miffy',     'Win2019') + '\n' +
                                fmtNode('NODE-WIN-02', 'Mapple',    'Win2019') + '\n' +
                                fmtNode('NODE-WIN-03', 'Lana',      'Win2019') + '\n' +
                                fmtNode('NODE-WIN-04', 'Costalito', 'WinSrv') + '\n' +
                                'Collector: Parallel ICMPv4 (60s step) · Multi-RRA: 24h(1m) / 7d(15m) / 30d(1h)';
                            fleetPending.textContent = text;
                            fleetPending.className = 'term-line term-output success';
                        })
                        .catch(function () {
                            fleetPending.textContent = 'Unable to query RRD telemetry endpoint.';
                            fleetPending.className = 'term-line term-output error';
                        });
                    break;

                case 'vps':
                    appendOutput(
                        'HOST NODE SPECIFICATIONS:\n' +
                        '  Hostname  : white-stingray-87538\n' +
                        '  Provider  : ZAP-Hosting (Q35 KVM Virtualization on Proxmox VE)\n' +
                        '  OS        : Debian GNU/Linux 13 (Trixie) x86_64\n' +
                        '  Resources : 4 vCPUs · 8 GB RAM · 25 GB SSD (41% used)\n' +
                        '  Services  : Portfolio (pm2:0) · PresWin (pm2:1) · Cita-Control (:8090)',
                        'accent'
                    );
                    break;

                case 'projects':
                    appendOutput(
                        'DEPLOYED PLATFORMS & LAB WRITE-UPS:\n' +
                        '  1. Technical Inspection Suite (/technical-inspection) -> Plant Reliability, Punch List & CAM [LIVE]\n' +
                        '  2. PresWin (/preswin)                     -> Construction Cost Estimator [LIVE]\n' +
                        '  3. Local AI Copilot Rig (Qwen3.8-27B-GGUF) -> Private 24GB VRAM Code & Log Triage [LOCAL RIG]\n' +
                        '  4. Appointment Checker (/Appointment_Checker) -> Autonomous slot poller [LIVE]\n' +
                        '  5. Fleet Telemetry (#fleet)               -> Smokeping RRD monitors [LIVE]\n' +
                        '\nTip: Click "Technical Deep Dive" on any card below for the full write-up & topology.',
                        'accent'
                    );
                    break;

                case 'qwen':
                case 'ai':
                case 'llm':
                    appendOutput(
                        'LOCAL HIGH-THROUGHPUT AI RIG (Qwen3.8-27B-GGUF):\n' +
                        '  Host Hardware : AMD Ryzen 9 7900X3D (12c/24t) · 64 GB DDR5 RAM\n' +
                        '  GPU Engine    : AMD Radeon RX 7900 XTX (24 GB GDDR6 VRAM)\n' +
                        '  Inference Core: Ollama / llama.cpp (AMD ROCm Acceleration)\n' +
                        '  Target Model  : Qwen3.8-27B-GGUF (100% VRAM Layer Offload)\n' +
                        '  Context Window: 32,768 tokens (Flash Attention enabled)\n' +
                        '  Throughput    : ~35–45 tokens/second sustained speed\n' +
                        '  Architecture  : Dynamic Skill-Based Agentic Dispatcher\n' +
                        '  Active Skills : • [Project_Scaffolding]         -> Full-Stack Architecture & Data Matrices\n' +
                        '                  • [SysAdmin_Log_Triage]         -> Production Log RCFA & Safe Remediation\n' +
                        '                  • [Script_Synthesis_Automation] -> Resilient Bash/Python/Node Daemons\n' +
                        '                  • [Compliance_Security_Audit]   -> SPDX License & Vulnerability Scanning\n' +
                        '  Routing Rule  : Evaluates target activity and strictly follows designated skill protocol.\n' +
                        '\nTip: Click "Technical Deep Dive" on the Local AI card in 05 · Wins & Projects to inspect the Modelfile.',
                        'accent'
                    );
                    break;

                case 'cv':
                case 'resume':
                    appendOutput(
                        'CURRICULUM VITAE — LUIS RODRIGO GARCÍA HERNÁNDEZ:\n' +
                        '  Role      : Technical Support Specialist & Infrastructure Engineer\n' +
                        '  Education : B.S. ITESM (Tec de Monterrey)\n' +
                        '  Core Focus: Linux Sysadmin · Proxmox VE · Open-Source License Compliance · Server Tuning\n' +
                        '  Document  : Opening verified PDF (/CV_Luis_Rodrigo_Garcia_Hernandez.pdf) in a new tab...',
                        'accent'
                    );
                    try { window.open('/CV_Luis_Rodrigo_Garcia_Hernandez.pdf', '_blank'); } catch (e) {}
                    showToast('Opening Curriculum Vitae (PDF)...', 'fa-solid fa-file-pdf', 3000);
                    break;

                case 'uptime':
                    var pendingLine = appendOutput('Querying live VPS uptime...', '');
                    fetch('/api/uptime')
                        .then(function (res) { return res.json(); })
                        .then(function (data) {
                            window.__latestHostUptime = data;
                            var line = 'Host: ' + data.host + ' (' + data.pretty + ')';
                            if (data.load) line += ' | load avg: ' + data.load;
                            pendingLine.textContent = line;
                            pendingLine.className = 'term-line term-output success';
                            showToast('VPS Uptime: ' + data.pretty, 'fa-solid fa-server', 3000);
                        })
                        .catch(function () {
                            pendingLine.textContent = 'Failed to reach VPS uptime endpoint.';
                            pendingLine.className = 'term-line term-output error';
                        });
                    break;

                case 'htop':
                case 'top':
                case 'btop':
                    var htopPending = appendOutput('Sampling live kernel metrics from /api/uptime (os.cpus / os.freemem)...', '');
                    fetch('/api/uptime')
                        .then(function (res) { return res.json(); })
                        .then(function (data) {
                            window.__latestHostUptime = data;
                            var cores = (Array.isArray(data.cores) && data.cores.length >= 4)
                                ? data.cores.slice(0, 4)
                                : [4.2, 2.8, 3.5, 1.9];
                            var memUsed = data.memUsedMb || 1410;
                            var memTotal = data.memTotalMb || 7947;
                            var memPct = Math.max(1, Math.min(99, (memUsed / memTotal) * 100));
                            var loadStr = data.load || '0.08, 0.04, 0.01';
                            var upStr = (data.pretty || 'up 14 days').replace(/^up\s+/i, '');
                            var nodePid = String(data.nodePid || 1420).padStart(5, ' ');
                            var nodeMem = data.nodeMemMb || 58;
                            var nodeMemPct = ((nodeMem / memTotal) * 100).toFixed(1).padStart(4, ' ');
                            var nodeCpuPct = (cores[0] * 0.35 + 0.4).toFixed(1).padStart(4, ' ');

                            function renderBar(pct, rightLabel) {
                                var width = 18;
                                var filled = Math.max(1, Math.min(width, Math.round((pct / 100) * width)));
                                var hashes = '|'.repeat(filled);
                                var label = ' ' + rightLabel;
                                var spaces = ' '.repeat(Math.max(0, width - filled - label.length));
                                if (filled + label.length > width) {
                                    hashes = '|'.repeat(Math.max(1, width - label.length));
                                    spaces = '';
                                }
                                return '[' + hashes + spaces + label + ']';
                            }

                            var c0 = renderBar(cores[0], cores[0].toFixed(1) + '%');
                            var c1 = renderBar(cores[1], cores[1].toFixed(1) + '%');
                            var c2 = renderBar(cores[2], cores[2].toFixed(1) + '%');
                            var c3 = renderBar(cores[3], cores[3].toFixed(1) + '%');
                            var mBar = renderBar(memPct, (memUsed / 1024).toFixed(2) + 'G/' + (memTotal / 1024).toFixed(2) + 'G');
                            var sBar = renderBar(0, '0K/0K');

                            var out =
                                '  0' + c0 + '   Tasks: 44, 28 thr; 1 running\n' +
                                '  1' + c1 + '   Load average: ' + loadStr + '\n' +
                                '  2' + c2 + '   Uptime: ' + upStr + '\n' +
                                '  3' + c3 + '   Host: ' + (data.host || 'white-stingray-87538') + '\n' +
                                'Mem' + mBar + '   Mode: Kernel Telemetry (Safe Read-Only)\n' +
                                'Swp' + sBar + '\n\n' +
                                '  PID USER      PRI  NI  VIRT   RES   SHR S  CPU% MEM%   TIME+  COMMAND\n' +
                                nodePid + ' root       20   0 1124M   ' + String(nodeMem).padStart(3, ' ') + 'M   38M S  ' + nodeCpuPct + ' ' + nodeMemPct + '  14:22.18 pm2: portfolio (app.js)\n' +
                                ' 1488 root       20   0 1098M   61M   36M S   0.7  1.6  09:41.05 pm2: preswin (/preswin)\n' +
                                '  912 www-data   20   0  318M   44M   19M S   0.3  1.1  06:15.42 python3 /opt/cita-control\n' +
                                '  644 www-data   20   0   56M   12M    9M S   0.2  0.3  03:08.11 nginx: worker process\n' +
                                ' 1104 root       20   0   19M    4M    3M S   0.1  0.1  01:54.39 /usr/sbin/cron -f (rrdtool)';

                            htopPending.textContent = out;
                            htopPending.className = 'term-line term-output accent';
                        })
                        .catch(function () {
                            htopPending.textContent = 'Unable to sample kernel telemetry for htop.';
                            htopPending.className = 'term-line term-output error';
                        });
                    break;

                case 'secops':
                case 'cloudflare':
                case 'cf':
                case 'pm2':
                case 'cve':
                    var secPending = appendOutput('Querying live SecOps Telemetry (/api/security-telemetry)...', '');
                    fetch('/api/security-telemetry')
                        .then(function (res) { return res.json(); })
                        .then(function (data) {
                            var cf = data.cloudflare || {};
                            var pm = data.pm2 || {};
                            var cve = data.cveRadar || {};
                            var latestCves = (cve.categories && cve.categories.latest) ? cve.categories.latest.slice(0, 4) : [];

                            if (cmd === 'cve') {
                                var cveLines = latestCves.map(function (v) {
                                    return '  ● ' + v.id.padEnd(15, ' ') + ' [' + (v.ransomware ? 'RANSOM' : 'KEV   ') + '] ' +
                                        (v.vendor + ' ' + v.product).slice(0, 26).padEnd(27, ' ') + ' (Added ' + v.dateAdded + ')';
                                });
                                secPending.textContent = 'LIVE CISA KEV VULNERABILITY RADAR (Catalog v' + (cve.catalogVersion || '2026.10') + ' · ' + (cve.totalTracked || 1739) + ' total):\n' +
                                    cveLines.join('\n');
                                secPending.className = 'term-line term-output accent';
                                return;
                            }

                            if (cmd === 'pm2') {
                                var dLines = (pm.daemons || []).map(function (d) {
                                    return '  ● ' + d.name.padEnd(22, ' ') + ' [' + d.status.toUpperCase() + ']  PID:' +
                                        String(d.pid || 'sys').padEnd(7, ' ') + ' CPU:' + d.cpu + '%  MEM:' + d.memMb + 'MB';
                                });
                                secPending.textContent = 'LOCAL PM2 & SYSTEMD SUPERVISOR (' + (pm.onlineCount || 4) + '/' + (pm.totalCount || 4) + ' ONLINE · Total RSS ' + (pm.totalRssMb || 0) + 'MB):\n' +
                                    dLines.join('\n');
                                secPending.className = 'term-line term-output success';
                                return;
                            }

                            var out = 'SECOPS & SERVER TELEMETRY SUMMARY:\n' +
                                '  [CLOUDFLARE EDGE] Visitor PoP: ' + (cf.visitorColo || 'LAX') + ' (' + (cf.visitorCountry || 'MX') + ') · VPS Edge: ' + (cf.vpsEdgeColo || 'LAX') + ' · ' + (cf.httpVersion || 'HTTP/2') + ' ' + (cf.tlsVersion || 'TLSv1.3') + '\n' +
                                '  [PM2 SUPERVISOR]  ' + (pm.onlineCount || 4) + '/' + (pm.totalCount || 4) + ' Daemons Online · Load: ' + (pm.loadAvg || '0.04') + ' · Host RAM: ' + (pm.memUsedMb || 0) + '/' + (pm.memTotalMb || 7947) + 'MB (' + (pm.memPct || 0) + '%)\n' +
                                '  [CVE RADAR]       CISA KEV v' + (cve.catalogVersion || '2026.10') + ' (' + (cve.totalTracked || 1739) + ' tracked) · Newest: ' + (latestCves[0] ? (latestCves[0].id + ' — ' + latestCves[0].vendor + ' ' + latestCves[0].product) : 'Active');
                            secPending.textContent = out;
                            secPending.className = 'term-line term-output success';
                        })
                        .catch(function () {
                            secPending.textContent = 'SecOps telemetry endpoint temporarily unavailable.';
                            secPending.className = 'term-line term-output error';
                        });
                    break;

                case 'ping':
                    var target = args[0] || 'white-stingray';
                    appendOutput(
                        'PING ' + target + ' (127.0.0.1) 56(84) bytes of data.\n' +
                        '64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.082 ms\n' +
                        '64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.076 ms\n' +
                        '64 bytes from 127.0.0.1: icmp_seq=3 ttl=64 time=0.079 ms\n' +
                        '--- ' + target + ' ping statistics ---\n' +
                        '3 packets transmitted, 3 received, 0% packet loss, time 2004ms\n' +
                        'rtt min/avg/max/mdev = 0.076/0.079/0.082/0.003 ms',
                        'success'
                    );
                    break;

                case 'feed':
                case 'feed-stingray':
                    if (oceanEl) {
                        oceanEl.classList.remove('bioluminescent-boost');
                        void oceanEl.offsetWidth; // trigger reflow
                        oceanEl.classList.add('bioluminescent-boost');
                        setTimeout(function () {
                            oceanEl.classList.remove('bioluminescent-boost');
                        }, 5000);
                    }
                    spawnMantaSwarm(8);
                    showToast('Stingray Fed! Bioluminescent booster active (+100 XP)', 'fa-solid fa-fish-fins', 3500);
                    appendOutput(
                        '>>> Dispensing cybernetic nutrients into white-stingray-87538...\n' +
                        '[ OK ] Bioluminescence frequency boosted to 100% (+100 XP)!\n' +
                        '[ OK ] Cardumen frenzy triggered across the cyber-ocean.',
                        'success'
                    );
                    break;

                case 'swarm':
                case 'cardumen':
                    spawnMantaSwarm(8);
                    showToast('Cyber-Stingray cardumen deployed! 8 units roaming.', 'fa-solid fa-water', 3500);
                    appendOutput(
                        '>>> Telemetry swarm dispatched across white-stingray ocean...\n' +
                        '[ OK ] 8 autonomous cyber-gliders traversing node matrix.\n' +
                        '[ OK ] Hydrodynamic packet routing confirmed.',
                        'accent'
                    );
                    break;

                case 'neofetch':
                    var neoPending = appendOutput('Querying live kernel & host telemetry...', '');
                    fetch('/api/uptime')
                        .then(function (r) { return r.json(); })
                        .then(function (up) {
                            window.__latestHostUptime = up;
                            var upStr = (up && up.pretty) ? up.pretty : 'up (live)';
                            var loadStr = (up && up.load) ? up.load : '0.00, 0.00, 0.00';
                            var memStr = (up && up.memUsedMb && up.memTotalMb)
                                ? (up.memUsedMb + 'MiB / ' + up.memTotalMb + 'MiB')
                                : 'Active';
                            neoPending.textContent =
                                '       _-_         rodrigo@' + ((up && up.host) || 'white-stingray-87538') + '\n' +
                                '    /~~   ~~\\      ----------------------------\n' +
                                ' /~~         ~~\\   OS: Debian GNU/Linux 13 (Trixie) x86_64\n' +
                                '{               }  Host: ZAP-Hosting Q35 KVM\n' +
                                ' \\  _-     -_  /   Kernel: Linux 6.12.101+deb13-amd64\n' +
                                '   ~  \\\\ //  ~     Uptime: ' + upStr + '\n' +
                                '_- -   | | _- _    Load Avg: ' + loadStr + '\n' +
                                '  _ -  | |   -_    Shell: bash 5.2.32 · WebCLI\n' +
                                '       // \\\\       CPU: 4 vCPUs\n' +
                                '                   Memory: ' + memStr + '\n' +
                                '                   Node: v22.23.2';
                            neoPending.className = 'term-line term-output accent';
                        })
                        .catch(function () {
                            neoPending.textContent = 'Failed to load live host telemetry.';
                            neoPending.className = 'term-line term-output error';
                        });
                    break;

                case 'zap':
                    appendOutput(
                        'ZAP-Hosting Exclusive Promo:\n' +
                        '  Code: Bombiux (20% OFF all vServers and dedicated instances)\n' +
                        '  Link: https://zap-hosting.com/',
                        'accent'
                    );
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText('Bombiux');
                        showToast('Discount code "Bombiux" copied to clipboard!', 'fa-solid fa-copy', 3000);
                    }
                    break;

                case 'clear':
                    termLog.textContent = '';
                    break;

                default:
                    appendOutput('command not found: ' + cmd + '. Type "help" for a list of valid commands.', 'error');
                    break;
            }
        }

        termForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var val = termInput.value;
            termInput.value = '';
            executeCommand(val);
        });

        termInput.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowUp') {
                if (historyIndex > 0) {
                    historyIndex--;
                    termInput.value = cmdHistory[historyIndex] || '';
                    setTimeout(function () { termInput.setSelectionRange(termInput.value.length, termInput.value.length); }, 0);
                }
            } else if (e.key === 'ArrowDown') {
                if (historyIndex < cmdHistory.length - 1) {
                    historyIndex++;
                    termInput.value = cmdHistory[historyIndex] || '';
                } else {
                    historyIndex = cmdHistory.length;
                    termInput.value = '';
                }
            }
        });
    })();

    /* ------------------------------------------------------------------
       Technical Deep Dive Modal (Lab Write-ups System)
       ------------------------------------------------------------------ */
    (function initTechModal() {
        var modal = document.getElementById('tech-modal');
        var dataScript = document.getElementById('deep-dives-data');
        if (!modal || !dataScript) return;

        var dataset = [];
        try {
            dataset = JSON.parse(dataScript.textContent);
        } catch (e) {
            console.error('Failed to parse deep dives dataset:', e);
            return;
        }

        var kickerEl = document.getElementById('modal-kicker');
        var titleEl = document.getElementById('modal-title');
        var badgeEl = document.getElementById('modal-badge');
        var overviewEl = document.getElementById('modal-overview');
        var specsEl = document.getElementById('modal-specs');
        var archEl = document.getElementById('modal-arch');
        var snippetTitleEl = document.getElementById('modal-snippet-title');
        var snippetCodeEl = document.getElementById('modal-snippet-code');
        var outcomesEl = document.getElementById('modal-outcomes');
        var liveLinkEl = document.getElementById('modal-live-link');
        var liveLabelEl = document.getElementById('modal-live-label');
        var closeBtn = document.getElementById('modal-close');
        var closeFooterBtn = document.getElementById('modal-close-footer');
        var copySnippetBtn = document.getElementById('modal-copy-snippet');

        var lastActiveTrigger = null;

        function openModalForProject(projectId) {
            var project = dataset.find(function (p) { return p.id === projectId; });
            if (!project) return;

            kickerEl.textContent = project.kicker;
            titleEl.textContent = project.title;
            badgeEl.textContent = project.badge;
            badgeEl.className = 'badge ' + (project.badgeClass || 'badge-ok');
            overviewEl.textContent = project.overview;

            // Specs
            specsEl.textContent = '';
            (project.specs || []).forEach(function (spec) {
                var row = document.createElement('div');
                row.className = 'spec-row';
                var dt = document.createElement('dt');
                dt.textContent = spec.label;
                var dd = document.createElement('dd');
                dd.textContent = spec.value;
                row.appendChild(dt);
                row.appendChild(dd);
                specsEl.appendChild(row);
            });

            // Architecture
            archEl.textContent = project.architecture;

            // Snippet
            snippetTitleEl.innerHTML = '<i class="fa-solid fa-file-code" aria-hidden="true"></i> ' + project.snippetTitle;
            snippetCodeEl.textContent = project.snippet;

            // Outcomes
            outcomesEl.textContent = '';
            (project.outcomes || []).forEach(function (outcome) {
                var li = document.createElement('li');
                li.textContent = outcome;
                outcomesEl.appendChild(li);
            });

            // Live Link
            if (project.liveUrl) {
                liveLinkEl.href = project.liveUrl;
                liveLinkEl.hidden = false;
                liveLabelEl.textContent = project.liveLabel || 'Launch Live App';
            } else {
                liveLinkEl.hidden = true;
            }

            // Switch back to tab 1
            switchTab('tab-pane-overview');

            if (typeof modal.showModal === 'function') {
                modal.showModal();
            } else {
                modal.setAttribute('open', '');
            }
        }

        function closeModal() {
            if (typeof modal.close === 'function') {
                modal.close();
            } else {
                modal.removeAttribute('open');
            }
            if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
                lastActiveTrigger.focus();
            }
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });

        modal.addEventListener('cancel', function (e) {
            e.preventDefault();
            closeModal();
        });

        // Tab Switching
        var tabs = Array.prototype.slice.call(modal.querySelectorAll('.modal-tab'));
        var panes = Array.prototype.slice.call(modal.querySelectorAll('.modal-pane'));

        function switchTab(targetPaneId) {
            tabs.forEach(function (tab) {
                var isTarget = tab.getAttribute('aria-controls') === targetPaneId;
                tab.classList.toggle('active', isTarget);
                tab.setAttribute('aria-selected', String(isTarget));
            });
            panes.forEach(function (pane) {
                var isTarget = pane.id === targetPaneId;
                pane.classList.toggle('active', isTarget);
                pane.hidden = !isTarget;
            });
        }

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var paneId = tab.getAttribute('aria-controls');
                switchTab(paneId);
            });
        });

        // Copy snippet
        if (copySnippetBtn) {
            copySnippetBtn.addEventListener('click', function () {
                var codeText = snippetCodeEl.textContent;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(codeText).then(function () {
                        copySnippetBtn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Copied!';
                        setTimeout(function () {
                            copySnippetBtn.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i> Copy';
                        }, 2000);
                    });
                }
            });
        }

        // Attach to all buttons
        document.querySelectorAll('[data-dive-id]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                lastActiveTrigger = btn;
                var id = btn.getAttribute('data-dive-id');
                openModalForProject(id);
            });
        });
    })();

    /* ------------------------------------------------------------------
       Animated Counters on Scroll (WCAG 2.1 accessible)
       ------------------------------------------------------------------ */
    (function initAnimatedCounters() {
        var counters = Array.prototype.slice.call(document.querySelectorAll('.stat-counter'));
        if (!counters.length) return;

        var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function animateCounter(el) {
            var target = parseFloat(el.getAttribute('data-target'));
            if (isNaN(target)) return;
            var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
            var suffix = el.getAttribute('data-suffix') || '';

            if (prefersReduced) {
                el.textContent = target.toFixed(decimals) + suffix;
                return;
            }

            var start = 0;
            var duration = 1400;
            var startTime = null;

            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);
                // Ease out cubic
                var ease = 1 - Math.pow(1 - progress, 3);
                var current = start + (target - start) * ease;
                el.textContent = current.toFixed(decimals) + suffix;

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = target.toFixed(decimals) + suffix;
                }
            }
            requestAnimationFrame(step);
        }

        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        animateCounter(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });

            counters.forEach(function (c) { observer.observe(c); });
        } else {
            counters.forEach(animateCounter);
        }
    })();

    /* ------------------------------------------------------------------
       Floating Back-to-Top Button with Reading Progress Ring
       ------------------------------------------------------------------ */
    (function initScrollTopProgress() {
        var btn = document.getElementById('scroll-top-btn');
        var ringBar = document.getElementById('progress-ring-bar');
        if (!btn || !ringBar) return;

        var circumference = 2 * Math.PI * 19; // r=19 -> ~119.38
        ringBar.style.strokeDasharray = circumference;
        ringBar.style.strokeDashoffset = circumference;

        function updateProgress() {
            var scrollY = window.scrollY;
            var totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            var progress = totalHeight > 0 ? Math.min(Math.max(scrollY / totalHeight, 0), 1) : 0;

            ringBar.style.strokeDashoffset = circumference * (1 - progress);

            if (scrollY > 300) {
                btn.hidden = false;
            } else {
                btn.hidden = true;
            }
        }

        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    ticking = false;
                    updateProgress();
                });
                ticking = true;
            }
        }, { passive: true });

        btn.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });
        });

        updateProgress();
    })();

    /* ------------------------------------------------------------------
       DarkBot DmPlugin MCP Bridge Interactive Console Modal
       - Connects to /api/mcp/:nodeId/overview & /api/mcp/:nodeId/command
       - Public Read-Only Telemetry + Operator PIN/Token Protected Tools
       - Raw JSON-RPC 2.0 Inspector toggle + 100% textContent XSS safety
       ------------------------------------------------------------------ */
    (function initMcpConsoleModal() {
        var modal = document.getElementById('mcp-modal');
        if (!modal) return;

        var titleEl = document.getElementById('mcp-modal-title');
        var hostTagEl = document.getElementById('mcp-host-tag');
        var connBadgeEl = document.getElementById('mcp-conn-badge');
        var connLabelEl = document.getElementById('mcp-conn-label');
        var rawToggleBtn = document.getElementById('mcp-raw-toggle');
        var closeBtn = document.getElementById('mcp-modal-close');
        var closeFooterBtn = document.getElementById('mcp-modal-close-footer');
        var refreshBtn = document.getElementById('mcp-refresh-btn');
        var clearBtn = document.getElementById('mcp-clear-btn');

        var pluginVerEl = document.getElementById('mcp-plugin-ver');
        var rpcLatEl = document.getElementById('mcp-rpc-lat');

        // 4 KPI HUD elements
        var kpiStateEl = document.getElementById('mcp-kpi-state');
        var kpiModuleEl = document.getElementById('mcp-kpi-module');
        var kpiMapEl = document.getElementById('mcp-kpi-map');
        var kpiPosEl = document.getElementById('mcp-kpi-pos');
        var kpiHpEl = document.getElementById('mcp-kpi-hp');
        var kpiCargoEl = document.getElementById('mcp-kpi-cargo');
        var kpiUriEl = document.getElementById('mcp-kpi-uri');
        var kpiPerfEl = document.getElementById('mcp-kpi-perf');

        // Operator Auth elements
        var authBadgeEl = document.getElementById('mcp-auth-badge');
        var authIconEl = document.getElementById('mcp-auth-icon');
        var authStatusTextEl = document.getElementById('mcp-auth-status-text');
        var authFormEl = document.getElementById('mcp-auth-form');
        var tokenInputEl = document.getElementById('mcp-token-input');
        var authSubmitBtn = document.getElementById('mcp-auth-submit');

        // Terminal elements
        var termScreenEl = document.getElementById('mcp-term-screen');
        var termLogEl = document.getElementById('mcp-term-log');
        var termFormEl = document.getElementById('mcp-term-form');
        var termInputEl = document.getElementById('mcp-term-input');
        var promptHostEl = document.getElementById('mcp-prompt-host');

        var activeNodeId = 'NODE-WIN-04';
        var activeRole = 'Costalito';
        var showRawJson = false;
        var operatorToken = '';
        var isOperatorUnlocked = false;
        var lastTriggerEl = null;
        var cmdHistory = [];
        var historyIdx = -1;

        try {
            var savedTok = sessionStorage.getItem('mcp_operator_token');
            if (savedTok) operatorToken = savedTok;
        } catch (e) { /* ignore storage error */ }

        // Fallback for browsers without declarative <dialog closedby="any">
        if (!('closedBy' in HTMLDialogElement.prototype)) {
            modal.addEventListener('click', function (event) {
                if (event.target !== modal) return;
                var rect = modal.getBoundingClientRect();
                var isDialogContent = (
                    rect.top <= event.clientY &&
                    event.clientY <= rect.top + rect.height &&
                    rect.left <= event.clientX &&
                    event.clientX <= rect.left + rect.width
                );
                if (isDialogContent) return;
                closeMcpModal();
            });
        }

        function fmtNum(n) {
            if (n === null || n === undefined || isNaN(n)) return '0';
            return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
        }

        function fmtDuration(seconds) {
            var s = Math.max(0, Math.floor(Number(seconds) || 0));
            var h = Math.floor(s / 3600);
            var m = Math.floor((s % 3600) / 60);
            return h + 'h ' + m + 'm';
        }

        function scrollLogBottom() {
            if (termScreenEl) {
                termScreenEl.scrollTop = termScreenEl.scrollHeight;
            }
        }

        function appendMcpLine(text, className) {
            var div = document.createElement('div');
            div.className = 'term-line ' + (className || '');
            div.textContent = text;
            termLogEl.appendChild(div);
            scrollLogBottom();
            return div;
        }

        function appendMcpEcho(cmdText) {
            var div = document.createElement('div');
            div.className = 'term-line term-cmd-echo';
            var p = document.createElement('span');
            p.className = 'term-prompt';
            p.textContent = 'mcp@' + activeRole.toLowerCase() + ':/rpc>';
            var c = document.createElement('span');
            c.textContent = ' ' + cmdText;
            div.appendChild(p);
            div.appendChild(c);
            termLogEl.appendChild(div);
            scrollLogBottom();
        }

        function appendMcpOutput(text, tone) {
            var div = document.createElement('div');
            div.className = 'term-line term-output ' + (tone || 'accent');
            div.textContent = text;
            termLogEl.appendChild(div);
            scrollLogBottom();
            return div;
        }

        function updateOperatorUiState(unlocked) {
            isOperatorUnlocked = Boolean(unlocked);
            if (authBadgeEl) authBadgeEl.classList.toggle('is-unlocked', isOperatorUnlocked);
            if (authIconEl) authIconEl.className = isOperatorUnlocked ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock';
            if (authStatusTextEl) authStatusTextEl.textContent = isOperatorUnlocked ? 'OPERATOR UNLOCKED:' : 'OPERATOR LOCKED:';
            if (authSubmitBtn) authSubmitBtn.textContent = isOperatorUnlocked ? 'Lock' : 'Unlock';
            if (tokenInputEl) tokenInputEl.hidden = isOperatorUnlocked;

            document.querySelectorAll('.mcp-op-chip').forEach(function (chip) {
                chip.classList.toggle('is-locked', !isOperatorUnlocked);
            });
        }

        function updateHudFromOverview(payload) {
            if (!payload) return;
            var isLive = payload.source === 'live-mcp';
            if (connBadgeEl) {
                connBadgeEl.className = 'badge mono ' + (isLive ? 'badge-ok' : 'badge-dim');
            }
            if (connLabelEl) {
                connLabelEl.textContent = isLive
                    ? ('LIVE MCP :' + (payload.port || 9876))
                    : 'SNAPSHOT STANDBY';
            }
            if (pluginVerEl && payload.serverInfo) {
                pluginVerEl.textContent = (payload.serverInfo.name || 'DmPlugin') + ' v' + (payload.serverInfo.version || '2.14.3');
            }
            if (rpcLatEl) {
                rpcLatEl.textContent = isLive ? ('RPC: ' + (payload.latencyMs || 1) + 'ms') : 'RPC: cached';
            }

            var st = payload.status || {};
            var stats = payload.stats || {};
            var hero = payload.hero || {};

            var running = Boolean(st.running) && !st.paused;
            if (kpiStateEl) {
                kpiStateEl.textContent = running ? 'RUNNING' : (st.paused ? 'PAUSED' : 'STANDBY');
                kpiStateEl.className = 'mcp-kpi-val ' + (running ? 'is-running' : 'is-paused');
            }
            if (kpiModuleEl) {
                kpiModuleEl.textContent = 'Module: ' + (st.module_name || 'SimpleGalaxyGate');
            }

            var mapName = hero.map_name || st.map_name || '2-8';
            if (kpiMapEl) kpiMapEl.textContent = 'Map ' + mapName + (hero.is_moving ? ' (Moving)' : '');
            if (kpiPosEl) {
                var px = hero.position && hero.position.x !== undefined ? Math.round(hero.position.x) : 0;
                var py = hero.position && hero.position.y !== undefined ? Math.round(hero.position.y) : 0;
                kpiPosEl.textContent = 'X:' + px + ' Y:' + py + ' · CFG ' + (hero.config || 1) + ' (' + (hero.formation || 'WHEEL') + ')';
            }

            if (kpiHpEl) {
                var hpPct = hero.health && hero.health.hp_percent !== undefined ? Number(hero.health.hp_percent).toFixed(0) : '100';
                var shdPct = hero.health && hero.health.shield_percent !== undefined ? Number(hero.health.shield_percent).toFixed(0) : '100';
                kpiHpEl.textContent = 'HP ' + hpPct + '% · SHD ' + shdPct + '%';
            }
            if (kpiCargoEl) {
                var gen = stats.general || {};
                kpiCargoEl.textContent = 'Cargo: ' + fmtNum(gen.cargo || 0) + ' / ' + fmtNum(gen.max_cargo || 4000);
            }

            if (kpiUriEl) {
                var earned = stats.earned_session || {};
                kpiUriEl.textContent = '+' + fmtNum(earned.uridium || 0) + ' URI';
            }
            if (kpiPerfEl) {
                var perf = stats.performance || {};
                var tick = st.tick_time_ms !== undefined ? st.tick_time_ms : (perf.tick_current || 0.7);
                kpiPerfEl.textContent = 'Tick: ' + tick + 'ms · Ping: ' + (perf.ping || 33) + 'ms · Up ' + fmtDuration(stats.running_time_seconds);
            }
        }

        function formatMcpResponse(cmd, resObj) {
            if (showRawJson) {
                return JSON.stringify({
                    jsonrpc: '2.0',
                    source: resObj.source,
                    uri: resObj.uri || ('tool://' + (resObj.tool || cmd)),
                    port: resObj.port,
                    result: resObj.data
                }, null, 2);
            }

            var d = resObj.data || {};
            var srcTag = resObj.source === 'live-mcp'
                ? '[LIVE RPC :' + (resObj.port || 9876) + ' · ' + (resObj.latencyMs || 1) + 'ms]'
                : '[CACHED SNAPSHOT // SSH TUNNEL STANDBY]';

            switch (cmd) {
                case 'status':
                    return srcTag + ' bot://status\n' +
                        '  State       : ' + (d.running && !d.paused ? 'RUNNING (Active)' : 'PAUSED') + '\n' +
                        '  Active Map  : ' + (d.map_name || '2-8') + ' (ID ' + (d.map_id || 24) + ')\n' +
                        '  Module      : ' + (d.module_name || 'SimpleGalaxyGate') + '\n' +
                        '  Tick Time   : ' + (d.tick_time_ms !== undefined ? d.tick_time_ms + ' ms' : '0.62 ms') + '\n' +
                        '  Bot Version : DarkBot v' + (d.bot_version || '1.132.2');

                case 'stats': {
                    var g = d.general || {};
                    var e = d.earned_session || {};
                    var p = d.performance || {};
                    var hrs = Math.max(0.1, (Number(d.running_time_seconds) || 3600) / 3600);
                    var uriHr = Math.round((Number(e.uridium) || 0) / hrs);
                    return srcTag + ' bot://stats\n' +
                        '  [ACCOUNT TOTALS]\n' +
                        '    Uridium    : ' + fmtNum(g.uridium) + ' URI\n' +
                        '    Credits    : ' + fmtNum(g.credits) + ' CRED\n' +
                        '    Experience : ' + fmtNum(g.experience) + ' XP\n' +
                        '    Honor      : ' + fmtNum(g.honor) + ' HON\n' +
                        '    Cargo Bay  : ' + fmtNum(g.cargo) + ' / ' + fmtNum(g.max_cargo) + '\n' +
                        '  [SESSION EARNINGS · Uptime ' + fmtDuration(d.running_time_seconds) + ']\n' +
                        '    Session URI: +' + fmtNum(e.uridium) + ' URI (~' + fmtNum(uriHr) + ' URI/hr)\n' +
                        '    Session CRD: +' + fmtNum(e.credits) + ' CRED\n' +
                        '    Session XP : +' + fmtNum(e.experience) + ' XP · +' + fmtNum(e.honor) + ' HON\n' +
                        '    Engine Ping: ' + (p.ping || 33) + ' ms · Tick: ' + (p.tick_current || 0.85) + ' ms';
                }

                case 'hero': {
                    var h = d.health || {};
                    var pos = d.position || {};
                    return srcTag + ' bot://hero (Sanitized)\n' +
                        '  Pilot ID    : ' + (d.id || 'REDACTED_PILOT') + ' · Ship ID: ' + (d.ship_id || 590) + '\n' +
                        '  Hull / HP   : ' + fmtNum(h.hp) + ' / ' + fmtNum(h.max_hp) + ' (' + (h.hp_percent !== undefined ? h.hp_percent : 100) + '%)\n' +
                        '  Nano Hull   : ' + fmtNum(h.hull) + ' / ' + fmtNum(h.max_hull) + '\n' +
                        '  Shield      : ' + fmtNum(h.shield) + ' / ' + fmtNum(h.max_shield) + ' (' + (h.shield_percent !== undefined ? h.shield_percent : 100) + '%)\n' +
                        '  Coordinates : Map ' + (d.map_name || '2-8') + ' @ X:' + Math.round(pos.x || 0) + ', Y:' + Math.round(pos.y || 0) + '\n' +
                        '  Loadout     : Config ' + (d.config || 1) + ' (' + (d.config_name || 'FIRST') + ') · Formation: ' + (d.formation || 'WHEEL') + '\n' +
                        '  Flags       : Moving=' + Boolean(d.is_moving) + ' · PET=' + Boolean(d.has_pet) + ' · Cloaked=' + Boolean(d.invisible);
                }

                case 'module':
                    return srcTag + ' bot://module\n' +
                        '  Module Name : ' + (d.module_name || 'SimpleGalaxyGate') + '\n' +
                        '  Class       : ' + (d.module_class || 'dev.shared.SimpleGalaxyGate') + '\n' +
                        '  Status      : ' + (d.status || 'Active') + '\n' +
                        '  Running     : ' + Boolean(d.running) + ' on Map ' + (d.map_name || '2-8');

                case 'plugins': {
                    var list = Array.isArray(d.loaded) ? d.loaded : [];
                    var lines = list.map(function (pl, idx) {
                        return '  ' + String(idx + 1).padStart(2, '0') + '. ' +
                            (pl.name || 'Plugin').padEnd(18, ' ') + ' v' +
                            String(pl.version || '1.0').padEnd(8, ' ') + ' by ' + (pl.author || 'Unknown');
                    });
                    return srcTag + ' bot://plugins (' + list.length + ' loaded)\n' +
                        (lines.length ? lines.join('\n') : '  No plugins reported.');
                }

                case 'entities': {
                    var ents = Array.isArray(d.entities) ? d.entities : (Array.isArray(d) ? d : []);
                    var countsLine = (d.npc_count !== undefined)
                        ? (' [NPCs: ' + d.npc_count + ' · Boxes: ' + (d.box_count || 0) + ' · Players: ' + (d.player_count || 0) + ' · Portals: ' + (d.portal_count || 0) + ']')
                        : (' (' + ents.length + ' nearby)');
                    var rows = ents.slice(0, 12).map(function (e) {
                        var t = String(e.type || 'entity').toUpperCase().padEnd(6, ' ');
                        var rawName = e.name || e.type_name || (e.ship_id ? ('NPC_SHIP#' + e.ship_id) : ('ID#' + (e.id || '?')));
                        var nm = String(rawName).padEnd(20, ' ');
                        var coords = ('X:' + Math.round(e.x || 0) + ', Y:' + Math.round(e.y || 0)).padEnd(16, ' ');
                        var extra = e.hp_percent !== undefined ? ('HP:' + e.hp_percent + '%') : (e.moving ? '[MOVING]' : '');
                        return '  [' + t + '] ' + nm + ' ' + coords + ' ' + extra;
                    });
                    return srcTag + ' mcp://entities' + countsLine + '\n' +
                        (rows.length ? rows.join('\n') : '  Radar clear — 0 entities in immediate range.');
                }

                case 'pet': {
                    var ps = d.stats || {};
                    var petHp = ps.hp ? (fmtNum(ps.hp.current) + '/' + fmtNum(ps.hp.total)) : (d.hp_percent !== undefined ? d.hp_percent + '%' : '100%');
                    var petShd = ps.shield ? (fmtNum(ps.shield.current) + '/' + fmtNum(ps.shield.total)) : '100%';
                    var petFuel = ps.fuel ? (fmtNum(ps.fuel.current) + '/' + fmtNum(ps.fuel.total)) : 'OK';
                    return srcTag + ' mcp://pet\n' +
                        '  Enabled     : ' + Boolean(d.enabled) + ' · Active: ' + Boolean(d.active) + ' · Repaired: ' + Boolean(d.repaired !== false) + '\n' +
                        '  Active Gear : ' + (d.gear_name || d.gear || 'Guard mode') + ' (Repairs: ' + (d.repair_count || 0) + ')\n' +
                        '  Telemetry   : HP ' + petHp + ' · Shield ' + petShd + ' · Fuel ' + petFuel;
                }

                case 'boosters': {
                    var bList = Array.isArray(d.boosters) ? d.boosters : (Array.isArray(d.active) ? d.active : []);
                    var activeBoosters = bList.filter(function (b) {
                        return (b.amount_percent && b.amount_percent > 0) || (b.amount && b.amount > 0);
                    });
                    var bRows = (activeBoosters.length ? activeBoosters : bList.slice(0, 8)).map(function (b) {
                        var pct = b.amount_percent !== undefined ? Math.round(b.amount_percent / 100) : (b.amount || 0);
                        var remSec = Number(b.remaining_seconds || b.remaining || 0);
                        var remStr = remSec > 90000000 ? 'Active' : (fmtDuration(remSec) + ' left');
                        return '  ● ' + String(b.name || b.type || 'Booster').padEnd(22, ' ') +
                            ' +' + String(pct).padStart(2, ' ') + '%  (' + remStr + ')';
                    });
                    return srcTag + ' mcp://boosters (' + bRows.length + ' active)\n' +
                        (bRows.length ? bRows.join('\n') : '  No active boosters running.');
                }

                case 'repair':
                    return srcTag + ' mcp://repair\n' +
                        '  Session Deaths : ' + (d.deaths || 0) + '\n' +
                        '  Ship Destroyed : ' + Boolean(d.destroyed) + '\n' +
                        '  Last Event     : ' + (d.last_death_time || 'None') + '\n' +
                        '  Revive Target  : ' + (typeof d.revive_location === 'string' ? d.revive_location : 'Spot / Portal');

                case 'logs': {
                    var lns = Array.isArray(d.lines) ? d.lines : (Array.isArray(d) ? d : []);
                    var cleanLines = lns.map(function (l) {
                        // Trim verbose Java package prefix for cleaner CLI readability
                        return '  ' + String(l).replace(/\|\s*[a-zA-Z0-9_.]+\([A-Za-z0-9_.]+:\d+\)\]/, ']');
                    });
                    return srcTag + ' mcp://log (Last ' + cleanLines.length + ' entries)\n' +
                        (cleanLines.length ? cleanLines.join('\n') : '  No log lines available.');
                }

                case 'get-config':
                case 'config': {
                    var cfg = d.config !== undefined ? d.config : d;
                    var pathTitle = (resObj.toolArgs && resObj.toolArgs.path) ? (' [' + resObj.toolArgs.path + ']') : (d.path ? (' [' + d.path + ']') : ' [ALL]');
                    var cfgLines = [srcTag + ' tools/call -> get_config' + pathTitle];

                    // If DmPlugin config tree with children
                    if (cfg && Array.isArray(cfg.children)) {
                        cfgLines.push('  Category: ' + (cfg.path || 'root') + ' (' + cfg.children.length + ' settings)');
                        cfg.children.forEach(function (ch) {
                            var nm = String(ch.name || 'setting').padEnd(20, ' ');
                            if (ch.current_value !== undefined) {
                                var valStr = typeof ch.current_value === 'object' ? JSON.stringify(ch.current_value) : String(ch.current_value);
                                cfgLines.push('  ● ' + nm + ' = ' + valStr + (ch.type ? (' [' + ch.type + ']') : ''));
                            } else if (ch.type === 'parent') {
                                cfgLines.push('  ▶ ' + nm + ' [' + (ch.child_count || 0) + ' sub-settings]');
                            } else {
                                cfgLines.push('  ● ' + nm + (ch.type ? (' [' + ch.type + ']') : ''));
                            }
                        });
                        if (Array.isArray(cfg.available_profiles) && cfg.available_profiles.length > 0) {
                            cfgLines.push('\n  [AVAILABLE PROFILES (' + cfg.available_profiles.length + ')]');
                            cfgLines.push('  ' + cfg.available_profiles.slice(0, 12).join(', ') + (cfg.available_profiles.length > 12 ? '…' : ''));
                        }
                        return cfgLines.join('\n');
                    }

                    // If leaf setting value
                    if (cfg && cfg.path && cfg.value !== undefined) {
                        cfgLines.push('  ● ' + String(cfg.path).padEnd(24, ' ') + ' = ' + JSON.stringify(cfg.value));
                        return cfgLines.join('\n');
                    }

                    // Recursive object formatter fallback
                    if (typeof cfg === 'object' && cfg !== null) {
                        function formatBranch(obj, indent) {
                            var pad = ' '.repeat(indent);
                            var out = [];
                            for (var k in obj) {
                                if (Object.prototype.hasOwnProperty.call(obj, k)) {
                                    var val = obj[k];
                                    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                                        out.push(pad + '● ' + k + ':');
                                        out = out.concat(formatBranch(val, indent + 2));
                                    } else if (Array.isArray(val)) {
                                        out.push(pad + '● ' + k + ': [' + val.join(', ') + ']');
                                    } else {
                                        out.push(pad + '  ' + (k + ':').padEnd(20, ' ') + val);
                                    }
                                }
                            }
                            return out;
                        }
                        var formatted = formatBranch(cfg, 2);
                        if (formatted.length > 0) {
                            cfgLines = cfgLines.concat(formatted);
                        } else {
                            cfgLines.push('  ' + JSON.stringify(cfg, null, 2));
                        }
                    } else {
                        cfgLines.push('  Value: ' + String(cfg));
                    }
                    return cfgLines.join('\n');
                }

                case 'set-config': {
                    var targetPath = (d && d.path) || (resObj.toolArgs && resObj.toolArgs.path) || 'general';
                    var targetVal = (d && d.new_value !== undefined) ? d.new_value : ((resObj.toolArgs && resObj.toolArgs.value) !== undefined ? resObj.toolArgs.value : 'updated');
                    var prevVal = (d && d.previous_value !== undefined) ? (' (previous: ' + JSON.stringify(d.previous_value) + ')') : '';
                    return srcTag + ' tools/call -> set_config\n' +
                        '  [CONFIG PROPERTY MUTATED]\n' +
                        '  Target Path  : ' + targetPath + '\n' +
                        '  Applied Value: ' + (typeof targetVal === 'string' ? targetVal : JSON.stringify(targetVal)) + prevVal + '\n' +
                        '  Status       : ' + ((d && (d.message || d.status)) || 'Applied to DarkBot runtime');
                }

                case 'set-map': {
                    var targetMap = (d && d.new_value !== undefined) ? d.new_value : ((resObj.toolArgs && (resObj.toolArgs.value || resObj.toolArgs.map)) || '2-8');
                    var prevMap = (d && d.previous_value !== undefined) ? (' (previous map: ' + d.previous_value + ')') : '';
                    return srcTag + ' tools/call -> set_config (general.working_map)\n' +
                        '  [WORKING MAP MUTATED]\n' +
                        '  Target Map   : ' + targetMap + prevMap + '\n' +
                        '  Navigation   : DarkBot route recalculated to target map';
                }

                case 'set-profile': {
                    var targetProf = (resObj.toolArgs && resObj.toolArgs.profile) || 'Default';
                    return srcTag + ' tools/call -> set_profile\n' +
                        '  [PROFILE LOADED]\n' +
                        '  Profile Name : ' + targetProf + '\n' +
                        '  Status       : DarkBot configuration profile hot-swapped';
                }

                default:
                    return srcTag + ' tools/call -> ' + (resObj.tool || cmd) + '\n  ' +
                        JSON.stringify(resObj.data || { status: 'OK' });
            }
        }

        function refreshOverview(silent) {
            fetch('/api/mcp/' + encodeURIComponent(activeNodeId) + '/overview')
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data && data.ok) {
                        updateHudFromOverview(data);
                        if (!silent) {
                            showToast('MCP HUD synced with ' + activeRole, 'fa-solid fa-plug-circle-bolt', 2400);
                        }
                    }
                })
                .catch(function () {
                    if (connLabelEl) connLabelEl.textContent = 'OFFLINE';
                });
        }

        function runMcpCommand(rawInput, explicitArgs) {
            var clean = String(rawInput || '').trim();
            if (!clean) return;

            cmdHistory.push(clean);
            historyIdx = cmdHistory.length;

            var parts = clean.split(/\s+/);
            var baseCmd = parts[0].toLowerCase();
            var restArg = parts.slice(1).join(' ');

            // Mask PIN when echoing auth command
            if (baseCmd === 'auth') {
                appendMcpEcho('auth ********');
            } else {
                appendMcpEcho(clean);
            }

            if (baseCmd === 'clear') {
                termLogEl.textContent = '';
                return;
            }

            if (baseCmd === 'help') {
                appendMcpOutput(
                    'DARKBOT MCP BRIDGE COMMANDS (Protocol 2025-03-26):\n' +
                    '  [PUBLIC READ TELEMETRY]\n' +
                    '    status              -> Bot state, active map, module & tick speed (bot://status)\n' +
                    '    stats               -> Credits, Uridium, XP, Honor & session rate (bot://stats)\n' +
                    '    hero                -> Sanitized ship HP, hull, shield, coords & loadout (bot://hero)\n' +
                    '    entities            -> Live radar of nearby NPCs, boxes & portals (mcp://entities)\n' +
                    '    module              -> Active module class & wave status (bot://module)\n' +
                    '    pet                 -> PET gear, fuel & repair state (mcp://pet)\n' +
                    '    boosters            -> Active ship boosters & remaining timers (mcp://boosters)\n' +
                    '    repair              -> Death counter & last destroyer info (mcp://repair)\n' +
                    '    plugins             -> Loaded DarkBot plugin list & versions (bot://plugins)\n' +
                    '    logs                -> Tail sanitized DarkBot session logs (mcp://log)\n' +
                    '  [OPERATOR MUTATING TOOLS — Requires Operator PIN]\n' +
                    '    auth <pin>          -> Unlock operator privileges for mutating tools\n' +
                    '    get-config [path]   -> Query current DarkBot configuration or subtree (e.g. get-config general)\n' +
                    '    set-config <p> <v>  -> Mutate any config setting (e.g. set-config general.working_map 4-4)\n' +
                    '    set-map <MAP>       -> Change working map (e.g. set-map 2-8, set-map 4-4)\n' +
                    '    set-profile <NAME>  -> Switch active bot configuration profile\n' +
                    '    toggle-pause        -> Pause or resume bot execution (toggle_pause)\n' +
                    '    reload-plugins      -> Reload all DarkBot plugins & re-run MCP handshake\n' +
                    '    reset-deaths        -> Reset session death counter to 0\n' +
                    '    set-pet <GEAR>      -> Set PET gear (LOOTER, GUARD, PASSIVE, ENEMY_LOCATOR, KAMIKAZE)\n' +
                    '    move-stop           -> Halt ship movement immediately',
                    'accent'
                );
                return;
            }

            if (baseCmd === 'auth') {
                if (!restArg) {
                    appendMcpOutput('Usage: auth <operator_pin>', 'error');
                    return;
                }
                verifyAndUnlockPin(restArg);
                return;
            }

            var reqArgs = explicitArgs || {};
            if (baseCmd === 'set-pet' && restArg && !reqArgs.gear) {
                reqArgs.gear = restArg.toUpperCase();
            } else if (baseCmd === 'set-map' && restArg && !reqArgs.map) {
                reqArgs.map = restArg;
            } else if (baseCmd === 'set-profile' && restArg && !reqArgs.profile) {
                reqArgs.profile = restArg;
            } else if ((baseCmd === 'get-config' || baseCmd === 'config') && restArg && !reqArgs.path) {
                reqArgs.path = restArg;
            } else if ((baseCmd === 'set-config' || baseCmd === 'config-set') && !reqArgs.path) {
                if (parts.length >= 3) {
                    reqArgs.path = parts[1];
                    reqArgs.value = parts.slice(2).join(' ');
                } else if (parts.length === 2 && parts[1].indexOf('=') > 0) {
                    var eqPos = parts[1].indexOf('=');
                    reqArgs.path = parts[1].slice(0, eqPos);
                    reqArgs.value = parts[1].slice(eqPos + 1);
                }
            }

            var pendingLine = appendMcpOutput('Dispatching JSON-RPC 2.0 request [' + baseCmd + '] to 127.0.0.1:9876/mcp…', '');
            var headers = { 'Content-Type': 'application/json' };
            if (operatorToken) {
                headers['X-MCP-Token'] = operatorToken;
            }

            fetch('/api/mcp/' + encodeURIComponent(activeNodeId) + '/command', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ command: baseCmd, args: reqArgs })
            })
                .then(function (res) {
                    return res.json().then(function (body) {
                        return { status: res.status, body: body };
                    });
                })
                .then(function (resPack) {
                    var body = resPack.body || {};
                    if (!body.ok) {
                        pendingLine.textContent = '[RPC DENIED] ' + (body.error || 'Command failed');
                        pendingLine.className = 'term-line term-output error';
                        if (body.requiresAuth && tokenInputEl) {
                            tokenInputEl.hidden = false;
                            tokenInputEl.focus();
                        }
                        return;
                    }

                    pendingLine.textContent = formatMcpResponse(baseCmd, body);
                    pendingLine.className = 'term-line term-output ' + (body.tier === 'operator-write' ? 'success' : 'accent');
                    refreshOverview(true);
                })
                .catch(function (err) {
                    pendingLine.textContent = '[RPC TRANSPORT ERROR] ' + (err.message || 'Unable to reach backend');
                    pendingLine.className = 'term-line term-output error';
                });
        }

        function verifyAndUnlockPin(pinValue) {
            var pin = String(pinValue || '').trim();
            if (!pin) return;

            fetch('/api/mcp/' + encodeURIComponent(activeNodeId) + '/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-MCP-Token': pin
                },
                body: JSON.stringify({ command: 'verify-auth', token: pin })
            })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data && data.ok) {
                        operatorToken = pin;
                        try { sessionStorage.setItem('mcp_operator_token', pin); } catch (e) { /* ignore */ }
                        updateOperatorUiState(true);
                        if (tokenInputEl) tokenInputEl.value = '';
                        appendMcpOutput('[AUTH OK] ' + data.message, 'success');
                        showToast('Operator Mode Unlocked!', 'fa-solid fa-lock-open', 2800);
                    } else {
                        updateOperatorUiState(false);
                        appendMcpOutput('[AUTH FAILED] ' + ((data && data.error) || 'Invalid Operator PIN'), 'error');
                        showToast('Invalid Operator PIN', 'fa-solid fa-lock', 2800);
                    }
                })
                .catch(function () {
                    appendMcpOutput('[AUTH ERROR] Could not verify token with server.', 'error');
                });
        }

        function switchMcpNode(nodeId, role, hostLabel, mcpEnabled) {
            activeNodeId = nodeId || 'NODE-WIN-04';
            activeRole = role || 'Costalito';

            if (titleEl) titleEl.textContent = activeNodeId + ' · ' + activeRole;
            if (hostTagEl) {
                hostTagEl.textContent = (hostLabel || 'costalito.therodrigo.com') +
                    (mcpEnabled ? ' (127.0.0.1:9876 -> MCP Bridge)' : ' (Node Telemetry Bridge)');
            }
            if (promptHostEl) promptHostEl.textContent = 'mcp@' + activeRole.toLowerCase();

            document.querySelectorAll('.mcp-node-tab').forEach(function (tab) {
                var isMatch = tab.getAttribute('data-mcp-switch') === activeNodeId;
                tab.classList.toggle('active', isMatch);
                tab.setAttribute('aria-pressed', String(isMatch));
            });

            termLogEl.textContent = '';
            appendMcpLine(
                'Connected to ' + activeNodeId + ' (' + activeRole + ') · DmPlugin MCP Bridge (Protocol 2025-03-26).',
                'term-intro'
            );
            appendMcpLine(
                'Click any preconfigured command chip above or type "help" for full RPC syntax.',
                'term-muted'
            );

            refreshOverview(true);
            runMcpCommand('status');
        }

        function openMcpModal(nodeId, role, hostLabel, mcpEnabled, triggerEl) {
            lastTriggerEl = triggerEl || document.activeElement;
            if (typeof modal.showModal === 'function') {
                if (!modal.open) modal.showModal();
            } else {
                modal.setAttribute('open', '');
            }
            switchMcpNode(nodeId, role, hostLabel, mcpEnabled);
        }

        function closeMcpModal() {
            if (typeof modal.close === 'function') {
                if (modal.open) modal.close();
            } else {
                modal.removeAttribute('open');
            }
            if (lastTriggerEl && typeof lastTriggerEl.focus === 'function') {
                lastTriggerEl.focus();
            }
        }

        // Bind Fleet Cards & Console Buttons
        document.querySelectorAll('.fleet-card[data-mcp-node]').forEach(function (card) {
            function triggerFromCard(e) {
                var nodeId = card.getAttribute('data-mcp-node') || 'NODE-WIN-04';
                var role = card.getAttribute('data-mcp-role') || 'Costalito';
                var enabled = card.getAttribute('data-mcp-enabled') === 'true';
                var host = enabled ? 'costalito.therodrigo.com' : (role.toLowerCase() + '.node.internal');
                openMcpModal(nodeId, role, host, enabled, card);
            }

            card.addEventListener('click', function (e) {
                // Avoid double firing if clicking an inner link
                if (e.target.closest('a')) return;
                triggerFromCard(e);
            });

            card.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    if (e.target !== card) return;
                    e.preventDefault();
                    triggerFromCard(e);
                }
            });
        });

        // Bind Node Switcher Tabs inside Modal
        document.querySelectorAll('.mcp-node-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                switchMcpNode(
                    tab.getAttribute('data-mcp-switch'),
                    tab.getAttribute('data-mcp-role'),
                    tab.getAttribute('data-mcp-host'),
                    tab.getAttribute('data-mcp-enabled') === 'true'
                );
            });
        });

        // Bind Public Read Command Chips
        document.querySelectorAll('.mcp-cmd-chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var cmd = chip.getAttribute('data-mcp-cmd');
                if (cmd) runMcpCommand(cmd);
            });
        });

        // Bind Operator Command Chips
        document.querySelectorAll('.mcp-op-chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var cmd = chip.getAttribute('data-mcp-cmd');
                var arg = chip.getAttribute('data-mcp-arg');
                if (!isOperatorUnlocked) {
                    appendMcpOutput(
                        '[OPERATOR LOCKED] Enter your Operator PIN in the bar above (or type "auth <pin>") to run mutating tool: ' + cmd,
                        'error'
                    );
                    if (tokenInputEl) {
                        tokenInputEl.hidden = false;
                        tokenInputEl.focus();
                    }
                    return;
                }
                if (cmd === 'set-pet' && arg) {
                    runMcpCommand('set-pet ' + arg, { gear: arg, enabled: true });
                } else if (cmd === 'set-map' && arg) {
                    runMcpCommand('set-map ' + arg, { map: arg });
                } else if (cmd === 'set-profile' && arg) {
                    runMcpCommand('set-profile ' + arg, { profile: arg });
                } else if (cmd === 'get-config') {
                    var cPath = chip.getAttribute('data-mcp-path');
                    if (cPath) {
                        runMcpCommand('get-config ' + cPath, { path: cPath });
                    } else {
                        runMcpCommand('get-config', {});
                    }
                } else if (cmd === 'set-config') {
                    var sPath = chip.getAttribute('data-mcp-path') || 'general.offensive_config';
                    var sVal = chip.getAttribute('data-mcp-val') || '1';
                    runMcpCommand('set-config ' + sPath + ' ' + sVal, { path: sPath, value: sVal });
                } else {
                    runMcpCommand(cmd);
                }
            });
        });

        // Bind Operator Auth Form
        if (authFormEl) {
            authFormEl.addEventListener('submit', function (e) {
                e.preventDefault();
                if (isOperatorUnlocked) {
                    operatorToken = '';
                    try { sessionStorage.removeItem('mcp_operator_token'); } catch (err) { /* ignore */ }
                    updateOperatorUiState(false);
                    appendMcpOutput('[LOCKED] Operator session cleared.', 'accent');
                    return;
                }
                var val = tokenInputEl ? tokenInputEl.value : '';
                if (!val) {
                    if (tokenInputEl) tokenInputEl.focus();
                    return;
                }
                verifyAndUnlockPin(val);
            });
        }

        // Bind Raw JSON-RPC Toggle
        if (rawToggleBtn) {
            rawToggleBtn.addEventListener('click', function () {
                showRawJson = !showRawJson;
                rawToggleBtn.classList.toggle('active', showRawJson);
                rawToggleBtn.setAttribute('aria-pressed', String(showRawJson));
                appendMcpOutput(
                    'Display mode switched to: ' + (showRawJson ? 'RAW JSON-RPC 2.0 ENVELOPE' : 'FORMATTED CLI TELEMETRY'),
                    'accent'
                );
            });
        }

        // Bind Prompt Form & History
        if (termFormEl && termInputEl) {
            termFormEl.addEventListener('submit', function (e) {
                e.preventDefault();
                var v = termInputEl.value;
                termInputEl.value = '';
                runMcpCommand(v);
            });

            termInputEl.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowUp') {
                    if (historyIdx > 0) {
                        historyIdx--;
                        termInputEl.value = cmdHistory[historyIdx] || '';
                    }
                } else if (e.key === 'ArrowDown') {
                    if (historyIdx < cmdHistory.length - 1) {
                        historyIdx++;
                        termInputEl.value = cmdHistory[historyIdx] || '';
                    } else {
                        historyIdx = cmdHistory.length;
                        termInputEl.value = '';
                    }
                }
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                refreshOverview(false);
                runMcpCommand('status');
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                termLogEl.textContent = '';
            });
        }
        if (closeBtn) closeBtn.addEventListener('click', closeMcpModal);
        if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeMcpModal);

        // If token was previously saved in sessionStorage, auto-verify silently
        if (operatorToken) {
            updateOperatorUiState(true);
        } else {
            updateOperatorUiState(false);
        }
    })();

    document.addEventListener('DOMContentLoaded', function () {
        if (!document.getElementById('cve-radar-grid')) return;

        // Bind CVE Radar Filter Buttons
        var cveFilterBtns = Array.prototype.slice.call(document.querySelectorAll('.cve-filter-btn'));
        cveFilterBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var cat = btn.getAttribute('data-cve-filter') || 'latest';
                cveFilterBtns.forEach(function (b) {
                    var active = b === btn;
                    b.classList.toggle('active', active);
                    b.setAttribute('aria-pressed', String(active));
                });
                renderCveCategory(cat);
            });
        });

        // Bind Manual Sync SecOps Button
        var secopsSyncBtn = document.getElementById('secops-sync-btn');
        if (secopsSyncBtn) {
            secopsSyncBtn.addEventListener('click', function () {
                fetchSecOpsTelemetry(true);
            });
        }

        // Initial hydration + 60s background refresh
        fetchSecOpsTelemetry(false);
        setInterval(function () {
            if (!document.hidden) fetchSecOpsTelemetry(false);
        }, 60000);
    });
})();
