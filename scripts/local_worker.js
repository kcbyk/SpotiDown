const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());

const ROOT = path.join(__dirname, '..');
const YTDLP_EXE = path.join(ROOT, 'yt-dlp.exe');
const FFMPEG_EXE = path.join(ROOT, 'ffmpeg.exe');
const YTDLP = fs.existsSync(YTDLP_EXE) ? YTDLP_EXE : 'yt-dlp';
const FFMPEG = fs.existsSync(FFMPEG_EXE) ? FFMPEG_EXE : 'ffmpeg';

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const YTDLP_AUDIO_FORMAT = 'bestaudio[ext=m4a]/bestaudio';

const cookiesFromBrowser = typeof process.env.COOKIES_FROM_BROWSER === 'string'
  ? process.env.COOKIES_FROM_BROWSER.trim()
  : 'chrome';

function spawnYtDlp(args) {
  const base = [
    '--no-warnings',
    '--no-playlist',
    '--geo-bypass',
    '--retries', '3',
    '--fragment-retries', '3',
    '--extractor-args', 'youtube:player_client=android,web',
    '--user-agent', DEFAULT_UA,
    '--add-header', 'Referer:https://www.youtube.com/',
    '--cookies-from-browser', cookiesFromBrowser
  ];
  return spawn(YTDLP, [...base, ...args], { cwd: ROOT, windowsHide: true });
}

function execYtDlpJson(args) {
  const base = [
    '--no-warnings',
    '--no-playlist',
    '--geo-bypass',
    '--retries', '3',
    '--fragment-retries', '3',
    '--extractor-args', 'youtube:player_client=android,web',
    '--user-agent', DEFAULT_UA,
    '--add-header', 'Referer:https://www.youtube.com/',
    '--cookies-from-browser', cookiesFromBrowser
  ];
  return new Promise((resolve, reject) => {
    execFile(YTDLP, [...base, ...args], { cwd: ROOT, windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(String(stderr || error.message || 'yt-dlp failed').slice(-2000)));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(e);
      }
    });
  });
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api/info', async (req, res) => {
  const query = String(req.query.query || '').trim();
  if (!query) return res.status(400).json({ success: false, error: 'Query parametresi bulunamadı.' });

  try {
    const target = query.includes('youtube.com') || query.includes('youtu.be')
      ? query
      : `ytsearch1:${query}`;
    const info = await execYtDlpJson(['-f', YTDLP_AUDIO_FORMAT, '-j', target]);
    const durationFormatted = info.duration
      ? new Date(parseInt(info.duration, 10) * 1000).toISOString().substr(14, 5)
      : 'Bilinmiyor';

    return res.json({
      success: true,
      source: query.includes('spotify') ? 'spotify' : (query.includes('youtube') || query.includes('youtu.be') ? 'youtube' : 'search'),
      title: info.title,
      artist: info.uploader || info.channel || 'YouTube',
      thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`,
      youtubeUrl: `https://www.youtube.com/watch?v=${info.id}`,
      youtubeId: info.id,
      duration: durationFormatted
    });
  } catch (error) {
    return res.status(200).json({ success: false, error: error.message || 'Bir hata oluştu.' });
  }
});

app.get('/api/download', async (req, res) => {
  const id = String(req.query.id || '').trim();
  const format = String(req.query.format || 'm4a').trim();
  const play = String(req.query.play || req.query.inline || '') === '1';

  if (!id) return res.status(400).json({ success: false, error: 'Video ID gereklidir.' });

  const title = String(req.query.title || 'download').replace(/[\\\/:\*\?"<>\|]/g, '').trim();
  const videoUrl = `https://www.youtube.com/watch?v=${id}`;

  const yt = spawnYtDlp(['-f', YTDLP_AUDIO_FORMAT, '-o', '-', videoUrl]);
  let ytErr = '';
  yt.stderr.on('data', (c) => { ytErr = (ytErr + c.toString()).slice(-20000); });

  const sendError = (message, detail) => {
    if (res.headersSent) return res.destroy();
    return res.status(502).json({ success: false, error: message, detail });
  };

  if (play) {
    const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', '-f', 'mp3', 'pipe:1'], { cwd: ROOT, windowsHide: true });
    let ffErr = '';
    ff.stderr.on('data', (c) => { ffErr = (ffErr + c.toString()).slice(-20000); });
    yt.stdout.pipe(ff.stdin);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    Readable.from(ff.stdout).pipe(res);
    yt.on('close', (code) => { if (code !== 0) sendError('YouTube indirme başarısız oldu.', ytErr.slice(-1200)); });
    ff.on('close', (code) => { if (code !== 0) sendError('Ses dönüştürme başarısız oldu.', ffErr.slice(-1200)); });
    return;
  }

  if (format === 'wav') {
    const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn', '-f', 'wav', 'pipe:1'], { cwd: ROOT, windowsHide: true });
    let ffErr = '';
    ff.stderr.on('data', (c) => { ffErr = (ffErr + c.toString()).slice(-20000); });
    yt.stdout.pipe(ff.stdin);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.wav"`);
    res.setHeader('Content-Type', 'audio/wav');
    Readable.from(ff.stdout).pipe(res);
    yt.on('close', (code) => { if (code !== 0) sendError('YouTube indirme başarısız oldu.', ytErr.slice(-1200)); });
    ff.on('close', (code) => { if (code !== 0) sendError('Ses dönüştürme başarısız oldu.', ffErr.slice(-1200)); });
    return;
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.m4a"`);
  res.setHeader('Content-Type', 'audio/mp4');
  yt.stdout.pipe(res);
  yt.on('close', (code) => { if (code !== 0) sendError('YouTube indirme başarısız oldu.', ytErr.slice(-1200)); });
});

app.listen(PORT, () => {
  console.log(`Local worker started: http://localhost:${PORT}`);
});

