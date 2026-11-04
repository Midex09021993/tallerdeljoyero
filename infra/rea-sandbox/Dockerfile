FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

COPY --chown=node:node server.mjs ./server.mjs

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=2 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--disable-proto=throw", "server.mjs"]
