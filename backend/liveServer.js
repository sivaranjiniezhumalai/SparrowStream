const NodeMediaServer = require("node-media-server");
const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Setup directories
const mediaPath = path.join(__dirname, "media", "live");
if (!fs.existsSync(mediaPath)) {
  fs.mkdirSync(mediaPath, { recursive: true });
}

// Track active streams
const activeStreams = new Set();
const ffmpegProcesses = new Map();

// Express server
const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "media")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "media", "viewer.html"));
});

// Serve HLS files
app.get("/live/:stream/:file", (req, res) => {
  const filePath = path.join(
    __dirname,
    "media",
    "live",
    req.params.stream,
    req.params.file
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  if (req.params.file.endsWith(".m3u8")) {
    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  } else if (req.params.file.endsWith(".ts")) {
    res.set("Content-Type", "video/mp2t");
  }

  res.sendFile(filePath);
});

// Check if stream is live - FIXED
app.get("/api/stream-status", (req, res) => {
  const streamName = req.query.stream || "stream1";
  const isLive = activeStreams.has(streamName);

  console.log(
    `Stream status check: ${streamName} = ${isLive ? "LIVE" : "OFFLINE"}`
  );

  res.json({
    isLive,
    streamName,
    timestamp: new Date().toISOString(),
  });
});

const expressServer = app.listen(8001, () => {
  console.log("✅ Server: http://localhost:8001");
});

// RTMP Server
const nms = new NodeMediaServer({
  logType: 3,
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8000,
    mediaroot: "./media",
    allow_origin: "*",
  },
});

// Start FFmpeg transcoding with low latency settings
function startFFmpeg(streamName) {
  const outputPath = path.join(__dirname, "media", "live", streamName);

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const inputUrl = `rtmp://localhost/live/${streamName}`;
  const outputFile = path.join(outputPath, "index.m3u8");

  const ffmpegArgs = [
    "-i",
    inputUrl,
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-f",
    "hls",
    "-hls_time",
    "1",
    "-hls_list_size",
    "3",
    "-hls_flags",
    "delete_segments+append_list",
    "-hls_segment_type",
    "mpegts",
    "-hls_segment_filename",
    path.join(outputPath, "segment%03d.ts"),
    "-start_number",
    "0",
    outputFile,
  ];

  const ffmpeg = spawn("ffmpeg", ffmpegArgs, { windowsHide: true });

  ffmpeg.stderr.on("data", (data) => {
    const output = data.toString();
    if (output.includes("error") || output.includes("failed")) {
      console.log(`[FFmpeg]: ${output.trim()}`);
    }
  });

  ffmpeg.on("close", (code) => {
    console.log(`FFmpeg closed (code ${code})`);
    ffmpegProcesses.delete(streamName);
    activeStreams.delete(streamName);

    // Clean up HLS files after a delay
    setTimeout(() => {
      if (fs.existsSync(outputPath)) {
        fs.rmSync(outputPath, { recursive: true, force: true });
        console.log(`Cleaned up files for ${streamName}`);
      }
    }, 2000);
  });

  ffmpegProcesses.set(streamName, ffmpeg);
  activeStreams.add(streamName);
  console.log(
    `✅ Transcoding started: ${streamName} (Active: ${activeStreams.size})`
  );
}

// Stop FFmpeg
function stopFFmpeg(streamName) {
  const process = ffmpegProcesses.get(streamName);
  if (process) {
    process.kill("SIGTERM");
    ffmpegProcesses.delete(streamName);
    activeStreams.delete(streamName);
    console.log(`🛑 Stopped: ${streamName} (Active: ${activeStreams.size})`);
  }
}

// Stream started
nms.on("postPublish", (id) => {
  const streamName = id.streamName || "stream1";
  console.log(`\n📡 Stream started: ${streamName}`);

  setTimeout(() => {
    startFFmpeg(streamName);
  }, 1000);
});

// Stream ended
nms.on("donePublish", (id) => {
  const streamName = id.streamName || "stream1";
  console.log(`\n⛔ Stream ended: ${streamName}`);
  stopFFmpeg(streamName);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  ffmpegProcesses.forEach((_, streamName) => stopFFmpeg(streamName));
  expressServer.close();
  process.exit();
});

nms.run();

console.log("\n" + "=".repeat(50));
console.log("🎥 Mini Hotstar Server");
console.log("=".repeat(50));
console.log("📺 Viewer:  http://localhost:8001");
console.log("\n📹 OBS Settings:");
console.log("   Server:     rtmp://localhost/live");
console.log("   Stream Key: stream1");
console.log("=".repeat(50) + "\n");
