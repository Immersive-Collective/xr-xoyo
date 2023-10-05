#!/bin/sh

if [ -z "$1" ]; then
    echo "No video file provided. Usage: ./scriptname.sh <video_file>"
    exit 1
fi

ffmpeg -y \
   -i "$1" \
   -force_key_frames "expr:gte(t,n_forced*2)" \
   -sc_threshold 0 \
   -c:v libx264 -b:v 1500k \
   -c:a copy \
   -hls_time 6 \
   -hls_playlist_type vod \
   -hls_segment_type fmp4 \
   -hls_segment_filename "fileSequence%d.m4s" \
   prog_index.m3u8
