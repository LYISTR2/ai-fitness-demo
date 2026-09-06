# ============================================================
# 炼炼 · AI 健身房训练助手 — Dockerfile
# 轻量静态站点：nginx:alpine + 纯 HTML/CSS/JS，无 npm 依赖
# ============================================================
FROM nginx:1.27-alpine

# 站点配置与静态资源
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY scripts /usr/share/nginx/html/scripts

# 健康检查：通过容器内 wget 探测根路径
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]