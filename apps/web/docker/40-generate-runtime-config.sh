#!/bin/sh
set -eu

template_path="/usr/share/nginx/html/taskbandit-runtime-config.template.js"
target_path="/usr/share/nginx/html/taskbandit-runtime-config.js"

if [ ! -f "$template_path" ]; then
  exit 0
fi

envsubst '${TASKBANDIT_API_BASE_URL} ${TASKBANDIT_ADMIN_BASE_URL} ${TASKBANDIT_CLIENT_BASE_URL}' \
  < "$template_path" \
  > "$target_path"
