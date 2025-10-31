# SparrowStream

![edit alt](https://github.com/sivaranjiniezhumalai/SparrowStream/blob/main/backend/Sparrowstream-architecture-image.png?raw=true)


The above describes all about my system architecture design
overview chart
But still requires more configurations and detailed form... soon will be fixing it 

What it all about ???
yes, 
I built a live video streaming platform using Node.js, FFmpeg, and Node-Media-Server.
The system receives live input from OBS Studio, converts it to HLS format in real time, and serves it to viewers with low latency.
It forms the backend core of an OTT-style app similar to Hotstar.
Currently, I’ve completed the live-streaming feature, and I’m extending it to include video upload and playback functionality.

🧩 Phase 1: Project Setup

Created a Node.js backend project from scratch.
Installed and configured Node-Media-Server (NMS) — the engine that accepts live RTMP streams and converts them into HLS format (.m3u8 + .ts files).
Set up folder structure:

⚙️ Phase 2: Live Streaming Backend

Configured RTMP server for receiving live streams from OBS Studio.
Configured HTTP (HLS) server to serve .m3u8 playlists and .ts chunks to viewers.
Integrated FFmpeg for real-time transcoding:
Converts raw RTMP input into HLS output
Generates small .ts chunks and playlist files (.m3u8) dynamically
Implemented FFmpeg tuning for:
Better quality (libx264 codec)
Audio synchronization (aac encoding)
Low latency (1-second HLS segments)

✅ Result:
We can go live from OBS → stream is automatically encoded → anyone can view it in VLC or browser at
http://localhost:8000/live/stream1/index.m3u8.

still required to work on latency reducing part... currently latency is ( ~ 7 – 9s delay )

