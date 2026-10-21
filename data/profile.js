// ---------------------------------------------------------------------------
// Site content. Edit THIS file to change what the page shows — no need to
// touch routes, views or CSS. Placeholders you still need to fill in are
// marked with TODO.
// ---------------------------------------------------------------------------

const profile = {
    name: "Luis Rodrigo García Hernández",
    handle: "rodrigo@therodrigo.com:~$",
    role: "Technical Support Specialist & Open-Source Engineer",
    education: "B.S. Digital Systems & Robotics Engineering — ITESM",
    bio: "Digital Systems and Robotics Engineer specializing in open-source software compliance, infrastructure virtualization, and high-performance server automation. Proven track record auditing enterprise platforms, developing resilient script logic, and orchestrating bare-metal clusters under strict SLA requirements.",
    tags: [
        "Open-Source Compliance",
        "Homelab & Virtualization",
        "Server Automation",
        "Game Server Tuning"
    ],
    languages: "EN Advanced · ES Native",
    // Public contact channels shown in the footer
    contact: {
        email: "contacto@therodrigo.com",
        linkedin: "https://www.linkedin.com/in/luis-rodrigo-garcia-hernandez-43376678",
        phone: "+52 442 169 4805",
        whatsapp: "https://wa.me/524421694805",
        cv: "/CV_Luis_Rodrigo_Garcia_Hernandez.pdf"
    }
};

// Career timeline (04 · Career) — condensed from the CV
const workHistory = [
    {
        company: "ZAP-Hosting",
        role: "Technical Support & Infrastructure Engineer",
        period: "Nov 2025 – Present",
        location: "Remote — Mexico City, MX",
        current: true,
        bullets: [
            "Provision and monitor client hosting across domains, webspaces, VPS and bare-metal dedicated blades on Proxmox VE hypervisors.",
            "Deploy and fine-tune dedicated game server architectures with SteamCMD, optimizing multi-instance resource allocation.",
            "Analyze packet captures using Wireshark (PCAP) to diagnose false-positive connection drops in PletX DDoS mitigation filters.",
            "Resolve Tier-1/Tier-2 escalations across network, software and hardware layers under strict uptime SLAs."
        ]
    },
    {
        company: "Continental Automotive",
        role: "Open-Source Compliance Engineer",
        period: "Nov 2019 – Jan 2025",
        location: "Querétaro, MX",
        bullets: [
            "Audited enterprise software for open-source license compliance with FOSSology, Black Duck Hub and SPDX.",
            "Built Bash/Python automation with error-handling and logging; maintained API integrations between compliance tools and internal platforms.",
            "Administered Ubuntu servers and contributed to an internal AWS (S3, EC2, RDS) web tool for audit and compliance workflows."
        ]
    },
    {
        company: "Congeladora Niño",
        role: "Maintenance Engineer",
        period: "Mar 2019 – Oct 2019",
        location: "Irapuato, MX",
        collapsed: true, // hidden behind the "Load more" button
        bullets: [
            "Cut downtime through efficient troubleshooting and root-cause analysis of equipment failures.",
            "Maintained and repaired complex electrical equipment (forklifts, electric pallet trucks)."
        ]
    }
];

const techStack = {
    languages: ["PowerShell", "Bash", "Node.js", "JavaScript"],
    networking: ["nftables", "Netplan", "ProFTPD", "Reverse Proxies", "Wireshark (PCAP)"],
    systems: ["Debian 13 Linux", "Docker Containers", "Proxmox VE / KVM"]
};

// "What I do" focus cards shown inside 01 · About
const serverNodes = [
    { name: "Automation & Scripting", type: "Custom Launcher Frameworks & Background Daemons", status: "Active" },
    { name: "Infrastructure Migrations", type: "Server Optimization & Live Environment Transitions", status: "Active" },
    { name: "Dedicated Environments", type: "Game Server Architecture & Multi-Instancing Tuning", status: "Online" }
];

const hostVPS = {
    provider: "ZAP-Hosting",
    hypervisor: "Proxmox VE",
    machineModel: "Q35 (KVM Virtualized)",
    cpu: "4 vCPUs",
    ram: "8 GB RAM",
    storage: "25 GB SSD Storage",
    os: "Debian 13 (Trixie)"
};

const localPC = {
    name: "STINGRAY-DESKTOP",
    cpu: "AMD Ryzen 9 7900X3D",
    ram: "64GB DDR5 RAM",
    gpu: "AMD Radeon RX 7900XTX",
    storage: "1TB NVMe SSD",
    motherboard: "Gigabyte B650 (rev. 1.1)",
    cooler: "ASUS ROG RYUO III 360 ARGB (White)",
    cabinet: "Asus TUF Gaming GT501 RGB (White)"
};

const lastWins = [
    { title: "Automated Appointment Checker Script", year: "2026", details: "Developed a resilient automated monitoring and notification script to poll local systems and ensure zero-delay slot scheduling.", deepDiveId: "appointment-checker" },
    { title: "Centralized Software Cloud Node", year: "2024", details: "Proposed and deployed a cloud-based server for centralized software management at Continental, driving global engineering collaboration." },
    { title: "Scrum Master", year: "2024", details: "Supported sprint planning and Agile ceremonies to improve delivery predictability and cross-team collaboration." }
];

const personalMeta = {
    pets: [
        { name: "Wiwi", type: "Cat", detail: "Quality control mascot of Wiwi Shop" },
        { name: "Memo", type: "Cat", detail: "Chief treat taster & interactive snack connoisseur" },
        { name: "Pomeranian", type: "Dog", detail: "Post-litter cycles healthy management" }
    ],
    hobbies: [
        "High-performance server multi-instancing",
        "Game server performance optimization",
        "Automated gameplay scripting frameworks",
        "Following local football match leagues & tracking mascot concepts"
    ]
};

// Only these 4 nodes are shown / allowed on the graph API (chat: "solo quiero poner 4 vps")
// Uptime %, tracked days, and RTT ping are hydrated dynamically from RRDtool via /api/fleet/telemetry
const vpsFleet = [
    { id: "NODE-WIN-01", type: "Windows Server 2019", role: "Miffy", osClass: "fa-windows", color: "#00a4ef", mcpEnabled: false, hostLabel: "miffy.node.internal" },
    { id: "NODE-WIN-02", type: "Windows Server 2019", role: "Mapple", osClass: "fa-windows", color: "#00a4ef", mcpEnabled: false, hostLabel: "mapple.node.internal" },
    { id: "NODE-WIN-03", type: "Windows Server 2019", role: "Lana", osClass: "fa-windows", color: "#00a4ef", mcpEnabled: false, hostLabel: "lana.node.internal" },
    { id: "NODE-WIN-04", type: "Windows Server", role: "Costalito", osClass: "fa-windows", color: "#00a4ef", mcpEnabled: true, hostLabel: "costalito.therodrigo.com" }
];

// Hub cards (04 · Wins & Projects). href:null + badge "SOON" renders a disabled
// "coming soon" card. type:"promo" renders the discount-code card with a copy
// button. Add/remove entries freely.
const hubLinks = [
    {
        title: "Technical Inspection, Punch List & Work Order Suite",
        desc: "Industrial asset inspection system, sequential multi-stage handoff workflow (MEC/ELEC/CAI), shutdown punch lists, and JD Edwards CAM integration.",
        icon: "fa-solid fa-industry",
        href: "/technical-inspection",
        badge: "LIVE",
        deepDiveId: "inspection-cam-suite"
    },
    {
        title: "Fleet Telemetry",
        desc: "Live smokeping-style latency graphs for the VPS fleet, straight from RRDtool.",
        icon: "fa-solid fa-satellite-dish",
        href: "#fleet",
        badge: "LIVE",
        deepDiveId: "fleet-telemetry"
    },
    {
        title: "Construction Cost Estimator",
        desc: "Web-based construction budgeting & unit price estimation suite with automated material explosion breakdown.",
        icon: "fa-solid fa-calculator",
        href: "/preswin",
        badge: "LIVE",
        deepDiveId: "preswin"
    },
    {
        title: "Local AI Engineering Copilot & Diagnostics Rig",
        desc: "Dedicated on-premise AI accelerator running Qwen3.8-27B-GGUF locally on 24GB GDDR6 VRAM. Powers rapid full-stack project scaffolding, complex script synthesis, and private daily sysadmin log troubleshooting with zero cloud latency and total data privacy.",
        icon: "fa-solid fa-brain",
        href: "#",
        badge: "LOCAL RIG",
        deepDiveId: "local-qwen-copilot"
    },
    {
        title: "Wiwi Shop — Handmade Boutique",
        desc: "Handmade with love in Mexico: Crochet amigurumis, artisan jewelry, and Cruz Azulito merchandise with interactive feeding station for Memo.",
        icon: "fa-solid fa-cat",
        href: "/Wiwishop",
        badge: "LIVE",
        deepDiveId: null
    },
    {
        type: "promo",
        title: "ZAP-Hosting",
        desc: "Premium vServers & game servers — the same host this site runs on. 20% off with my code:",
        icon: "fa-solid fa-server",
        href: "https://zap-hosting.com/",
        code: "Bombiux",
        badge: "20% OFF"
    }
];

// Footer marquee (rendered twice in the view for the infinite loop)
const techMarquee = [
    { icon: "fa-brands fa-linux", label: "Linux" },
    { icon: "fa-solid fa-server", label: "Proxmox VE" },
    { icon: "fa-brands fa-docker", label: "Docker" },
    { icon: "fa-solid fa-scale-balanced", label: "FOSSology" },
    { icon: "fa-solid fa-file-shield", label: "SPDX" },
    { icon: "fa-solid fa-shield-halved", label: "Black Duck Hub" },
    { icon: "fa-brands fa-aws", label: "AWS (S3, EC2, RDS)" },
    { icon: "fa-solid fa-terminal", label: "PowerShell" },
    { icon: "fa-solid fa-code", label: "Bash" },
    { icon: "fa-brands fa-node-js", label: "Node.js" },
    { icon: "fa-brands fa-js", label: "JavaScript" },
    { icon: "fa-brands fa-python", label: "Python" },
    { icon: "fa-brands fa-git-alt", label: "Git" },
    { icon: "fa-brands fa-steam", label: "SteamCMD" },
    { icon: "fa-solid fa-network-wired", label: "nftables" },
    { icon: "fa-solid fa-project-diagram", label: "Netplan" },
    { icon: "fa-solid fa-route", label: "Reverse Proxies" },
    { icon: "fa-solid fa-brain", label: "Qwen3.8-27B-GGUF" },
    { icon: "fa-solid fa-microchip", label: "AMD ROCm" },
    { icon: "fa-solid fa-upload", label: "ProFTPD" }
];

// Themes offered by the switcher (id maps to [data-theme] in style.css)
const themes = [
    { id: "solid-black", label: "Solid Black" },
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
    { id: "neon", label: "Neon" },
    { id: "forest", label: "Forest" },
    { id: "ocean", label: "Ocean" }
];

// Technical Deep Dives (05 · Wins & Projects modales / Lab Write-ups)
const projectDeepDives = [
    {
        id: "preswin",
        title: "PresWin — Construction Cost Estimator",
        kicker: "Production Deployment // Live Service",
        badge: "LIVE",
        badgeClass: "badge-ok",
        icon: "fa-solid fa-calculator",
        overview: "A specialized web-based application engineered for structural engineers and project estimators to generate automated unit-price breakdowns, real-time material explosion calculations, and instant cost estimations for civil engineering works.",
        specs: [
            { label: "Runtime", value: "Node.js (PM2 fork) on port 4000" },
            { label: "Gateway", value: "Nginx reverse proxy with WS upgrade" },
            { label: "Payload Capacity", value: "50MB client upload limit" },
            { label: "Storage", value: "Persistent SQLite & JSON schema" }
        ],
        architecture: `[Client Browser (HTTPS / WSS)]
               │
               ▼
[Cloudflare Edge CDN] ──> [Let's Encrypt ECDSA SSL]
               │
               ▼
[Nginx Reverse Proxy] (:443)
  ├── Route: ^~ /preswin
  ├── Upgrade: $http_upgrade (WebSockets)
  └── Max Body: 50MB
               │
               ▼
[PM2 Node.js Daemon] (:4000)
  ├── Realtime Calculation Engine
  └── Material Explosion Matrix`,
        snippetTitle: "Nginx Gateway & Proxy Configuration",
        snippetLang: "nginx",
        snippet: `location ^~ /preswin {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 50M;
}`,
        outcomes: [
            "Cuts manual spreadsheet estimation time by over 70% with automatic material cost decomposition.",
            "Sub-millisecond internal routing through local loopback proxy behind Cloudflare SSL.",
            "Resilient daemon isolation under PM2 process supervisor with zero impact on primary portfolio."
        ],
        liveUrl: "/preswin",
        liveLabel: "Launch PresWin Live App"
    },
    {
        id: "appointment-checker",
        title: "Automated Appointment Checker Script",
        kicker: "Autonomous Daemon // Systems Poller",
        badge: "LIVE",
        badgeClass: "badge-ok",
        icon: "fa-solid fa-bell",
        overview: "A resilient Python-based background watcher designed to continuously monitor high-demand scheduling platforms. Automatically negotiates bot challenges, detects liberated time-slots within milliseconds, and dispatches multi-channel instant priority alerts.",
        specs: [
            { label: "Daemon", value: "Python 3 (/opt/cita-control/app.py)" },
            { label: "Listener", value: "127.0.0.1:8090 (/Appointment_Checker)" },
            { label: "Polling Cadence", value: "Dynamic jittered interval (anti-ban)" },
            { label: "Alert Dispatch", value: "Webhooks + Push notification API" }
        ],
        architecture: `[Target Government / Service Portal]
               ▲
               │ (Jittered HTTPS Requests / Session Keepalive)
[Python 3 Autonomous Daemon] (:8090)
  ├── Anti-bot Header Fingerprinting & Session Rotation
  ├── DOM / JSON Response Parser (Zero-delay slot detector)
  └── Multi-channel Dispatcher (Telegram / Pushover API)
               │
               ▼
[Instant Priority Push Notification to Mobile Device]`,
        snippetTitle: "Resilient Polling Loop with Exponential Backoff & Jitter",
        snippetLang: "python",
        snippet: `def poll_target_service(session, target_url):
    retries, base_backoff = 0, 2.5
    while not shutdown_event.is_set():
        try:
            resp = session.get(target_url, headers=ROTATED_HEADERS, timeout=6.0)
            if resp.status_code == 200:
                slots = extract_available_slots(resp.text)
                if slots:
                    dispatch_priority_alert(slots)
            # Dynamic human-mimicking jitter
            sleep_time = base_backoff + random.uniform(0.3, 1.8)
            time.sleep(sleep_time)
        except RequestException as err:
            time.sleep(min(60, base_backoff * (2 ** retries)))
            retries += 1`,
        outcomes: [
            "Zero human monitoring needed: alerts triggered within 1.2s of slot publication.",
            "Operates 24/7 as an isolated low-footprint daemon consuming < 0.1% CPU and 45MB RAM.",
            "100% success rate in zero-delay scheduling for target application windows."
        ],
        liveUrl: null,
        liveLabel: null
    },
    {
        id: "inspection-cam-suite",
        title: "Technical Inspection, Punch List & Work Order Suite",
        kicker: "Industrial Systems // JD Edwards CAM (F1201 / F4801 / F41021)",
        badge: "LIVE",
        badgeClass: "badge-ok",
        icon: "fa-solid fa-industry",
        overview: "Operational reliability and field inspection suite for heavy industrial rotary kilns and continuous production plants. Resolves maintenance bottlenecks with a 4-stage sequential handoff (LOTO → MEC/PAIL → ELEC → CAI), real-time field measurements (vibration, temperature, FRL pressure), immediate corrective work orders vs. scheduled shutdown punch-listing, and bidirectional JD Edwards CAM synchronization.",
        specs: [
            { label: "Plant Target", value: "Industrial Production Lines & Rotary Kilns" },
            { label: "ERP Integration", value: "JD Edwards CAM (F1201 / F4801 / F41021 / F3111)" },
            { label: "Workflow Chain", value: "4-Stage LOTO → MEC/PAIL → ELEC → CAI Handoff" },
            { label: "Client Runtime", value: "Dual Split-Screen (Executive Dashboard + Mobile App)" }
        ],
        architecture: `[Technician in Field (Mobile PWA / QR Scanner)]
               │
               ▼ (Field Measurements: Vibration, Temp, Air FRL, Gap Cono)
[Technical Inspection & Dispatch Engine]
  ├── Safety & LOTO Clearance Verification
  ├── Realtime Severity Matrix: [En Marcha OT] vs [Próximo Paro Punch List]
  └── Sequential Handoff Dispatch: MEC/PAIL ──► ELEC (Align) ──► CAI (Testing)
               │
               ├──► [Executive Dashboard & Chief KPIs (Realtime Board)]
               │
               ▼
[JD Edwards Integration Bridge (CAM / Orchestrator / Z-Tables)]
  ├── F1201 / F1202: Asset Master & Meter Readings (61235, 61481, 64637, 1304786)
  ├── F4801 / F3112: Work Orders & Sequential Routing Operations
  └── F41021 / F3111: MRO Spare Parts Inventory Reservation & Parts Explosion`,
        snippetTitle: "JD Edwards CAM Work Order & Handoff Payload",
        snippetLang: "json",
        snippet: `{
  "jdeCAMTransaction": {
    "action": "CREATE_OR_UPDATE_WO",
    "assetNumber": "61421",
    "technicalTag": "M232-VENT",
    "system": "PRECALENTADOR",
    "workOrder": {
      "table": "F4801",
      "orderType": "WM",
      "summary": "Fuga de aire en sello y desalineación detectada en campo",
      "priority": "1 - CRITICAL",
      "status": "40 - IN_PROGRESS_ELEC_ALIGN"
    },
    "routingSteps": [
      { "step": 10, "area": "SAFETY_LOTO", "status": "COMPLETED", "signedBy": "Carlos Mendoza" },
      { "step": 20, "area": "MEC_PAIL",    "status": "COMPLETED", "signedBy": "Juan García" },
      { "step": 30, "area": "ELEC",        "status": "ACTIVE",    "action": "Acoplar y alinear motor" },
      { "step": 40, "area": "CAI",         "status": "PENDING",   "action": "Pruebas funcionales con carga" }
    ],
    "mroInventoryReservation": {
      "table": "F41021",
      "warehouse": "ALM-07",
      "items": [
        { "itemNumber": "ROD-22220-E", "qty": 1, "status": "ALLOCATED" }
      ]
    }
  }
}`,
        outcomes: [
            "Eliminates office sign-off ambiguity with verified on-site digital signatures, photos, and meter logs.",
            "De-bottlenecks inter-department handoffs (ELEC motor coupling no longer stalled waiting on MEC without notice).",
            "Prevents emergency shutdown parts cannibalization by pre-validating JDE MRO stock (F41021) for planned punch lists."
        ],
        liveUrl: "/technical-inspection",
        liveLabel: "Launch Inspection & CAM Suite"
    },
    {
        id: "fleet-telemetry",
        title: "Smokeping Fleet Telemetry v2.0",
        kicker: "Realtime Systems // Parallel RRDtool",
        badge: "LIVE",
        badgeClass: "badge-ok",
        icon: "fa-solid fa-satellite-dish",
        overview: "Custom-built, smokeping-style latency and jitter visualizer monitoring four distributed VPS nodes. Combines a parallel sub-second ICMP collector with multi-tier circular RRD databases (24h/7d/30d), live JSON telemetry endpoints, and theme-synced HiDPI 600x160 rendering.",
        specs: [
            { label: "Collector", value: "Parallel Bash ICMPv4 subshells (~2s max)" },
            { label: "RRA Tiers", value: "24h (1m) · 7d (15m) · 30d (1h) AVG/MIN/MAX" },
            { label: "Thresholds", value: "<0.85ms Nominal · 0.85-2ms Jitter · >2ms Spike" },
            { label: "Renderer", value: "HiDPI 600x160 + 6-Theme Dynamic Palette" }
        ],
        architecture: `[4 Target Infrastructure Nodes]
       │
       ▼ (Concurrent background ICMP probes: probe_node() & + wait)
[Multi-RRA Circular Databases] (/var/lib/rrd/*_ping.rrd)
  ├── RRA 1: 1m step × 1440 rows (24 Hours high-res)
  ├── RRA 2: 15m step × 672 rows (7 Days AVG/MIN/MAX)
  └── RRA 3: 1h step × 720 rows  (30 Days AVG/MIN/MAX)
       │
       ├──► GET /api/fleet/telemetry?range=1h|4h|24h|7d (Live LAST/AVG/MIN/MAX/JITTER)
       └──► GET /api/graphs/latency/:id?range=...&theme=... (HiDPI 600x160 Smokeping)`,
        snippetTitle: "Parallel ICMP Collector & Smokeping CDEF Pipeline",
        snippetLang: "bash",
        snippet: `# Concurrent background probe per node (prevents serial timeout cascades)
probe_node() {
  local name="$1" ip="$2" rrd="/var/lib/rrd/\${1}_ping.rrd"
  local avg=$(LC_ALL=C ping -c 3 -i 0.2 -q -W 2 "$ip" | awk -F'/' '/rtt/ {print $5}')
  rrdtool update "$rrd" "N:\${avg:-U}"
}
for S in "\${SERVERS[@]}"; do probe_node "\${S%%:*}" "\${S##*:}" & done; wait

# HiDPI 600x160 Smokeping graph with trend variance & sub-ms thresholds
rrdtool graph - --start -4h --width 600 --height 160 --alt-autoscale-max \\
  DEF:raw=$RRD:ping:AVERAGE CDEF:ping=raw,200,GT,UNKN,raw,IF \\
  CDEF:trend=ping,900,TRENDNAN CDEF:ping_good=ping,0,0.85,LIMIT \\
  LINE1.2:trend#60a5fa99::dashes=4,3 LINE2:ping_good#10b981`,
        outcomes: [
            "Parallel probing cuts collection cycle from ~12s serial down to <2s constant.",
            "Live sub-millisecond RTT, RFC 3550 jitter, and packet-loss metrics streamed via /api/fleet/telemetry.",
            "Interactive 1H / 4H / 24H / 7D window switching with automatic 6-theme color synchronization."
        ],
        liveUrl: "#fleet",
        liveLabel: "View Fleet Telemetry Live"
    },
    {
        id: "local-qwen-copilot",
        title: "Local AI Engineering Copilot & Diagnostics Rig",
        kicker: "On-Premises High-Throughput AI // 24GB VRAM Rig",
        badge: "LOCAL RIG",
        badgeClass: "badge-ok",
        icon: "fa-solid fa-brain",
        overview: "A dedicated on-premise AI acceleration workstation running Qwen3.8-27B-GGUF directly on bare-metal hardware. Leveraged daily to rapidly scaffold full-stack architectures (like PresWin), generate resilient automation scripts, and triage complex server logs, stack traces, and network anomalies in complete privacy without leaking proprietary client configurations or tokens to external cloud APIs.",
        specs: [
            { label: "Hardware Rig", value: "AMD Radeon RX 7900 XTX (24GB GDDR6) + Ryzen 9 7900X3D + 64GB DDR5" },
            { label: "Inference Engine", value: "Ollama / llama.cpp with AMD ROCm acceleration" },
            { label: "Model Architecture", value: "Qwen3.8-27B-GGUF (Quantized · ROCm Acceleration)" },
            { label: "VRAM Allocation", value: "100% GPU Layer Offload (~18.5GB VRAM footprint)" },
            { label: "Context Window", value: "16,384 – 32,768 tokens (Flash Attention enabled)" },
            { label: "Generation Speed", value: "~35 – 45 tokens/second sustained throughput" }
        ],
        architecture: `[Daily Engineering Workflows & Terminal Sessions]
               │
               ▼ (Activity Intent Classification)
[Dynamic Skill Dispatcher]
  ├── [Skill: Project_Scaffolding]        ──► Full-Stack Architecture & Data Matrices
  ├── [Skill: SysAdmin_Log_Triage]        ──► Live Server Error RCFA & Safe Remediation
  ├── [Skill: Script_Synthesis_Automation]──► Resilient Daemons (Bash, Python, Node.js)
  └── [Skill: Compliance_Security_Audit]  ──► SPDX License & Vulnerability Scanning
               │
               ▼ (Local HTTP / CLI prompt via 127.0.0.1:11434)
[AMD ROCm + Ollama / llama.cpp Inference Runtime]
  ├── GPU Offload: 100% Layers resident in 24GB GDDR6 VRAM
  ├── Model: Qwen3.8-27B-GGUF (Skill-Conditioned High-Precision Synthesis)
  └── Flash Attention & KV-Cache Offloading (64GB DDR5 fallback)
               │
               ▼
[Immediate Actionable Engineering Output]
  ├── Verified Code Modules (Powers projects like PresWin & Fleet Monitors)
  ├── Root Cause Analysis (RCFA) of Linux/Windows Server crashes
  └── 100% Private: Zero external telemetry, zero API costs, zero data leakage`,
        snippetTitle: "Local Modelfile & Skill-Based System Prompt",
        snippetLang: "dockerfile",
        snippet: `FROM Qwen3.8-27B-GGUF

# High-performance parameter tuning for coding & infrastructure operations
PARAMETER temperature 0.20
PARAMETER top_p 0.85
PARAMETER num_ctx 32768
PARAMETER stop "<|im_end|>"

SYSTEM """You are an autonomous Senior Systems Engineer & Technical Architect.
You operate through specialized operational SKILLS. When receiving a prompt, identify the target activity and strictly execute the corresponding skill protocol:

[SKILL: PROJECT_SCAFFOLDING]
Trigger Activity: Design, architecture, or scaffolding of new software projects, web services, APIs, and database schemas.
Protocol:
- Enforce modular domain separation (Controllers, Routes, Data, Views).
- Output minimal-dependency, production-ready boilerplate (Express, Python, SQLite).
- Ensure persistent state, graceful startup/shutdown, and structured error boundaries.

[SKILL: SYSADMIN_LOG_TRIAGE]
Trigger Activity: Diagnostic analysis of server logs, stack traces, Nginx reverse proxy faults, PM2 crashes, or network anomalies.
Protocol:
- Execute immediate Root Cause Failure Analysis (RCFA) and isolate the failing component.
- Deliver a 2-line impact summary followed by exact, non-destructive remediation commands.
- Never output dangerous wildcard deletes; prioritize log preservation and service continuity.

[SKILL: SCRIPT_SYNTHESIS_AUTOMATION]
Trigger Activity: Authoring or optimizing automation scripts, cron jobs, and background worker daemons.
Protocol:
- In Bash: enforce 'set -euo pipefail', trap signals, and implement idempotent execution.
- In Python: use strict type hints, robust exception handling, structured JSON logging, and exponential backoff.
- In PowerShell/Node: utilize non-blocking async streams and proper exit codes.

[SKILL: COMPLIANCE_SECURITY_AUDIT]
Trigger Activity: Codebase vulnerability inspection, hardcoded secret detection, or open-source license review.
Protocol:
- Map software components to SPDX / OpenChain license standards (flagging GPL/AGPL contamination in commercial contexts).
- Identify hardcoded tokens, insecure system calls, and buffer hazards.

ROUTING RULE:
For any incoming activity or request:
1. Detect whether the task is Scaffolding, Log Triage, Automation Scripting, or Compliance Audit.
2. Activate and follow that designated [SKILL: ...] protocol strictly.
3. Deliver concise, production-ready code and solutions with zero unnecessary conversational filler."""`,
        outcomes: [
            "Accelerates new project scaffolding, boilerplate generation, and schema design by over 60%.",
            "Enables safe, private triaging of sensitive production server logs and client network configs without third-party NDA violations.",
            "Eliminates cloud API rate limits, subscriptions, and network latency with instantaneous 40+ tok/s local generation."
        ],
        liveUrl: null,
        liveLabel: null
    }
];

module.exports = {
    profile, techStack, serverNodes, hostVPS, localPC, workHistory,
    lastWins, personalMeta, vpsFleet, hubLinks, techMarquee, themes,
    projectDeepDives
};
