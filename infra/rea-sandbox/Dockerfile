FROM node:22-bookworm-slim AS node-runtime

# Ghidra 12.2 requires JDK 25. Temurin provides a preconfigured runtime/JDK.
FROM eclipse-temurin:25-jdk-jammy

COPY --from=node-runtime /usr/local/ /usr/local/

ENV NODE_ENV=production
ENV PORT=8080
ENV JAVA_HOME=/opt/java/openjdk
ENV GHIDRA_INSTALL_DIR=/opt/ghidra_12.2_PUBLIC
# Keep the JVM bounded inside Railway 1 GiB runner memory.
ENV JAVA_TOOL_OPTIONS="-Xms128m -Xmx512m -XX:MaxMetaspaceSize=192m -XX:+UseSerialGC"
ENV PATH="${JAVA_HOME}/bin:/usr/local/bin:${PATH}"

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates curl procps unzip binutils \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fL --retry 3 \
    -o /tmp/ghidra.zip \
    https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_12.2_build/ghidra_12.2_PUBLIC_20261016.zip \
  && echo "2c2cd776db3c1f6a097ba418922378ac3649cadd5e844a6f5f088ae628a7be67  /tmp/ghidra.zip" | sha256sum -c - \
  && unzip -q /tmp/ghidra.zip -d /opt \
  && rm /tmp/ghidra.zip \
  && test -x "${GHIDRA_INSTALL_DIR}/support/analyzeHeadless" \
  && test -x "${GHIDRA_INSTALL_DIR}/Ghidra/Features/Decompiler/os/linux_x86_64/decompile"

RUN node --version \
  && npm --version \
  && java -version \
  && npm install --global rea-agents@latest \
  && rea --version \
  && rea doctor --provider ghidra --json

COPY --chown=1000:1000 server.mjs ./server.mjs
COPY --chown=1000:1000 pe-inspector.mjs ./pe-inspector.mjs
COPY --chown=1000:1000 rea-engine.mjs ./rea-engine.mjs

RUN node --check server.mjs && node --check pe-inspector.mjs && node --check rea-engine.mjs

USER 1000:1000
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=2 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--disable-proto=throw", "server.mjs"]
