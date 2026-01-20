# Premium RSVP Assets Guide

**Status:** Premium UI with Video Intro, Lottie Animations, and Background Music  
**Last Updated:** 2026-01-19

---

## Overview

The premium RSVP page (`/rsvp.html`) now includes rich media features for an elegant guest experience:
- **Video intro overlay** (envelope opening animation)
- **Lottie decorations** (top and flowers animations)
- **Background music** (starts after user interaction)
- **Smooth scroll animations**

All assets are **fixed paths** (not editable by admin) to ensure consistent branding and performance.

---

## Required Assets

### 1. Intro Video (CRITICAL)

**File Path:** `public/media/intro/envelope.mp4`

**Specifications:**
- **Format:** MP4 (H.264 codec recommended)
- **Duration:** 3-5 seconds ideal
- **Resolution:** 1080x1920 (portrait) or 1920x1080 (landscape)
- **File Size:** < 5MB recommended (for fast loading)
- **Content:** Envelope opening animation or wedding-themed intro

**Behavior:**
- Plays automatically on first visit (muted for autoplay policy)
- Can be skipped with "דלג" button
- Remembers if already shown (localStorage)
- Fallback to emoji animation if missing

**How to Add:**
```bash
# Place your video file here:
public/media/intro/envelope.mp4
```

---

### 2. Background Music (CRITICAL)

**File Path:** `public/media/audio/All_You_Need_Is_Love-104256-mobiles24.mp3`

**Specifications:**
- **Format:** MP3
- **Duration:** 2-4 minutes (loops automatically)
- **Bitrate:** 128kbps recommended (balance quality/size)
- **File Size:** < 3MB recommended
- **Content:** Romantic background music, wedding theme

**Behavior:**
- Starts after intro video ends (requires user interaction)
- Toggle button (🎵) to play/pause
- User preference saved in localStorage
- Volume set to 60% by default

**How to Add:**
```bash
# Place your audio file here:
public/media/audio/All_You_Need_Is_Love-104256-mobiles24.mp3
```

---

### 3. Top Lottie Decoration (IMPORTANT)

**File Path:** `public/media/lottie/event-side-decoration.json`

**Specifications:**
- **Format:** Lottie JSON (Adobe After Effects export)
- **File Size:** < 200KB recommended
- **Content:** Top header decoration (floral, ornamental, etc.)
- **Animation:** Loops continuously

**Behavior:**
- Displays at top of page (centered)
- Fades in smoothly
- Hidden gracefully if missing

**How to Add:**
```bash
# Place your lottie JSON file here:
public/media/lottie/event-side-decoration.json
```

**Where to Get Lottie Files:**
- [LottieFiles.com](https://lottiefiles.com/) - Free animations
- Create custom: Adobe After Effects + Bodymovin plugin
- Hire designer: Fiverr, Upwork

---

### 4. Flowers Lottie Decoration (OPTIONAL)

**File Path:** `public/media/lottie/flowers.json`

**Specifications:**
- **Format:** Lottie JSON
- **File Size:** < 200KB recommended
- **Content:** Floral corner decoration
- **Animation:** Subtle, loops

**Behavior:**
- Displays in bottom-right corner
- Optional enhancement
- Page works fine without it

**How to Add:**
```bash
# Place your lottie JSON file here (optional):
public/media/lottie/flowers.json
```

---

## Asset Validation

### Automatic Validation

The premium effects script automatically checks for missing assets and logs warnings:

```bash
# Open RSVP page with debug mode:
http://localhost:5000/rsvp.html?debug=true
```

**What to Check:**
1. Open browser DevTools (F12)
2. Look at Console tab
3. See validation results:
   ```
   [Premium RSVP] Validating premium assets...
   [Premium RSVP] ✓ introVideo: /media/intro/envelope.mp4
   [Premium RSVP] ✓ bgAudio: /media/audio/All_You_Need_Is_Love-104256-mobiles24.mp3
   [Premium RSVP] ✓ topLottie: /media/lottie/event-side-decoration.json
   [Premium RSVP] ⚠️ flowersLottie: /media/lottie/flowers.json NOT FOUND
   ```

### Manual Validation

**Check files exist:**
```bash
# From project root:
dir public\media\intro\envelope.mp4
dir public\media\audio\All_You_Need_Is_Love-104256-mobiles24.mp3
dir public\media\lottie\event-side-decoration.json
dir public\media\lottie\flowers.json
```

**Check file sizes:**
```bash
# Video should be < 5MB:
du -h public/media/intro/envelope.mp4

# Audio should be < 3MB:
du -h public/media/audio/All_You_Need_Is_Love-104256-mobiles24.mp3
```

---

## Fallback Behavior

### If Video is Missing:
- Shows animated emoji (💌) fallback
- Still displays intro overlay
- Click to continue to main page

### If Audio is Missing:
- Music toggle button hidden
- No errors shown
- Page works normally

### If Lottie is Missing:
- Decoration simply doesn't appear
- No visual gap or error
- Page layout unaffected

**Philosophy:** Graceful degradation - page always works, even without premium assets.

---

## Git & Deployment

### .gitignore Configuration

Large media files can be excluded from Git to keep repo size small:

```gitignore
# Large media files (optional - add to .gitignore)
public/media/intro/*.mp4
public/media/audio/*.mp3

# Keep lottie (they're usually small)
!public/media/lottie/*.json
```

### Deployment Checklist

Before deploying to Firebase:

1. ✅ All critical assets in place (video, audio, top lottie)
2. ✅ Test locally: `firebase serve`
3. ✅ Open: `http://localhost:5000/rsvp.html?debug=true`
4. ✅ Verify no 404 errors in Network tab
5. ✅ Test on mobile device
6. ✅ Deploy: `firebase deploy`

---

## Troubleshooting

### Video Not Playing

**Symptom:** Intro overlay shows but video doesn't play

**Solutions:**
1. Check file format: Must be MP4 (H.264)
2. Check file size: Large files take time to load
3. Check browser console for errors
4. Try different browser (Chrome/Safari/Firefox)
5. Check autoplay policy (video must be muted for autoplay)

### Audio Not Starting

**Symptom:** Music toggle appears but audio doesn't play

**Solutions:**
1. Click the music toggle button (🎵)
2. Check browser autoplay policy
3. Check file format: Must be MP3
4. Check console for errors
5. Try on different device

### Lottie Not Showing

**Symptom:** Decoration space is blank

**Solutions:**
1. Check JSON file is valid
2. Open JSON in text editor - should start with `{"v":`
3. Check file size (< 200KB recommended)
4. Verify file path is exact
5. Check browser console for lottie errors

### Page Loads Slowly

**Symptom:** Long wait before page is interactive

**Solutions:**
1. Reduce video file size (compress/optimize)
2. Reduce audio file size (lower bitrate)
3. Use CDN for large files
4. Enable gzip compression on server
5. Optimize lottie JSON (remove unused layers)

---

## Converting & Optimizing Assets

### Video Optimization

**Using FFmpeg (free tool):**
```bash
# Compress video to < 5MB:
ffmpeg -i original.mp4 -vcodec h264 -acodec aac -crf 23 -preset slow envelope.mp4

# Check file size:
du -h envelope.mp4
```

### Audio Optimization

**Using FFmpeg:**
```bash
# Convert to MP3, 128kbps:
ffmpeg -i original.wav -acodec libmp3lame -b:a 128k bg.mp3

# Trim duration (first 180 seconds):
ffmpeg -i original.mp3 -t 180 -acodec copy bg-trimmed.mp3
```

### Lottie Optimization

**Using Lottie Tools:**
1. Go to [lottiefiles.com/tools](https://lottiefiles.com/tools)
2. Upload your JSON
3. Click "Optimize"
4. Download optimized version

---

## Asset Sources

### Free Resources

**Video:**
- [Pexels](https://www.pexels.com/videos/) - Free stock videos
- [Pixabay](https://pixabay.com/videos/) - Free wedding videos
- [Coverr](https://coverr.co/) - Free beautiful videos

**Audio:**
- [Free Music Archive](https://freemusicarchive.org/)
- [YouTube Audio Library](https://studio.youtube.com/)
- [Incompetech](https://incompetech.com/) - Royalty-free music

**Lottie:**
- [LottieFiles](https://lottiefiles.com/) - Thousands of free animations
- [Flaticon Animated Icons](https://www.flaticon.com/animated-icons)

### Premium Resources

**Video:**
- [Envato Elements](https://elements.envato.com/) - Unlimited downloads
- [Motion Array](https://motionarray.com/)
- [Artgrid](https://artgrid.io/)

**Audio:**
- [Epidemic Sound](https://www.epidemicsound.com/)
- [Artlist](https://artlist.io/)
- [AudioJungle](https://audiojungle.net/)

---

## Security & Copyright

⚠️ **Important:**
- Only use assets you have rights to
- Free resources may require attribution
- Check license before using
- Don't use copyrighted music without permission
- Consider royalty-free or Creative Commons music

---

## Contact & Support

**Questions about assets?**
- Check browser console (F12) for error messages
- Test with `?debug=true` parameter
- Verify file paths are exactly as documented
- Contact: [Your email/support channel]

---

*End of Premium Assets Guide*
