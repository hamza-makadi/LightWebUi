#!/bin/bash

while true; do
    # 1. CPU: Force standard locale (LC_ALL=C) so we get "98.5" instead of "98,5"
    # This prevents the parsing error that caused "100% usage"
    cpu=$(LC_ALL=C top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')

    # 2. RAM: Force standard locale here too for safety
    ram=$(LC_ALL=C free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')

    # 3. Temp: (Unchanged)
    temp_raw=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
    if [ -z "$temp_raw" ]; then
        temp="null"
    else
        temp=$((temp_raw / 1000))
    fi

    # 4. Write to file
    echo "{\"cpu_percent\": $cpu, \"ram_percent\": $ram, \"temp_c\": $temp}" > stats.json
    
    sleep 2
done
