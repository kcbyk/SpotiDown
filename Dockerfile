FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-venv \
    python3-pip \
    libsndfile1 \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --no-cache-dir --upgrade pip \
  && python3 -m pip install --no-cache-dir yt-dlp

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"
ENV PYTHON="/opt/venv/bin/python"

RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu \
  && pip install --no-cache-dir demucs soundfile

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]

