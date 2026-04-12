#!/bin/sh
set -eu

for template_path in \
  /usr/share/nginx/html/taskbandit-runtime-config.template.js \
  /usr/share/nginx/html/admin/taskbandit-runtime-config.template.js
do
  if [ ! -f "$template_path" ]; then
    continue
  fi

  target_path="${template_path%.template.js}.js"
  envsubst '${TASKBANDIT_API_BASE_URL} ${TASKBANDIT_WEB_BASE_URL} ${TASKBANDIT_ADMIN_BASE_URL} ${TASKBANDIT_CLIENT_BASE_URL}' \
    < "$template_path" \
    > "$target_path"
done
