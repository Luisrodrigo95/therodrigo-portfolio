#!/bin/bash
# =============================================================================
# therodrigo.com — Parallel ICMPv4 RRD Telemetry Collector (v2.0)
# Improvement D:
#   1. Parallel execution (& + wait) so all 4 nodes are probed concurrently
#      in ~2 seconds total (prevents serial timeout cascading).
#   2. Multi-RRA Round-Robin Database schema:
#      - RRA 1: 1-minute resolution for 24 hours (1440 rows)
#      - RRA 2: 15-minute resolution (AVG/MIN/MAX) for 7 days (672 rows)
#      - RRA 3: 1-hour resolution (AVG/MIN/MAX) for 30 days (720 rows)
# =============================================================================

RRD_DIR="/var/lib/rrd"
mkdir -p "$RRD_DIR"

SERVERS=(
    "node-win-01:194.156.90.100"
    "node-win-02:194.156.90.101"
    "node-win-03:194.156.90.103"
    "node-win-04:5.175.184.234"
)

ensure_rrd_schema() {
    local rrd_file="$1"
    if [ ! -f "$rrd_file" ]; then
        rrdtool create "$rrd_file" \
            --step 60 \
            DS:ping:GAUGE:120:0:5000 \
            RRA:AVERAGE:0.5:1:1440 \
            RRA:AVERAGE:0.5:15:672 \
            RRA:MIN:0.5:15:672 \
            RRA:MAX:0.5:15:672 \
            RRA:AVERAGE:0.5:60:720 \
            RRA:MIN:0.5:60:720 \
            RRA:MAX:0.5:60:720
    fi
}

probe_node() {
    local name="$1"
    local ip="$2"
    local rrd_file="${RRD_DIR}/${name}_ping.rrd"

    ensure_rrd_schema "$rrd_file"

    # Send 3 ICMP probes with 2s deadline; extract avg RTT in ms
    local ping_avg
    ping_avg=$(LC_ALL=C ping -c 3 -i 0.2 -q -W 2 "$ip" 2>/dev/null | awk -F'/' '/rtt|round-trip/ {print $5}')

    if [ -z "$ping_avg" ]; then
        ping_avg="U"
    fi

    rrdtool update "$rrd_file" "N:${ping_avg}"
}

# Launch all node probes concurrently in background subshells
for SERVER in "${SERVERS[@]}"; do
    NAME="${SERVER%%:*}"
    IP="${SERVER##*:}"
    probe_node "$NAME" "$IP" &
done

# Wait for all parallel probes to complete (~0.5s - 2.0s max)
wait
exit 0
