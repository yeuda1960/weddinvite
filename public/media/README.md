# Premium RSVP Media Assets

This folder contains rich media assets for the premium RSVP experience.

## Folder Structure

```
media/
├── intro/
│   └── envelope.mp4          (Required: Video intro overlay)
├── audio/
│   └── All_You_Need_Is_Love-104256-mobiles24.mp3  (Required: Background music)
├── lottie/
│   ├── event-side-decoration.json  (Important: Top decoration)
│   ├── flowers.json                (Optional: Flowers decoration)
│   └── header-bg.gif               (Optional: Header background)
└── README.md (this file)
```

## Quick Start

### 1. Intro Video
**File:** `intro/envelope.mp4`
- **Format:** MP4 (H.264)
- **Size:** < 5MB
- **Duration:** 3-5 seconds
- **Resolution:** 1080p (portrait or landscape)
- **Content:** Envelope opening or wedding intro animation

### 2. Background Music
**File:** `audio/All_You_Need_Is_Love-104256-mobiles24.mp3`
- **Format:** MP3
- **Size:** < 3MB
- **Bitrate:** 128kbps
- **Duration:** 2-4 minutes (loops)
- **Content:** Romantic, wedding-themed music

### 3. Top Lottie Decoration
**File:** `lottie/event-side-decoration.json`
- **Format:** Lottie JSON
- **Size:** < 200KB
- **Content:** Top header decoration (floral, ornamental)

### 4. Flowers Decoration (Optional)
**File:** `lottie/flowers.json`
- **Format:** Lottie JSON
- **Size:** < 200KB
- **Content:** Corner floral decoration

## Asset Validation

Test your assets work:

```bash
# 1. Start local server
firebase serve

# 2. Open RSVP with debug mode
http://localhost:5000/rsvp.html?debug=true

# 3. Check browser console (F12) for validation results
```

## Detailed Documentation

See **`/docs/PREMIUM_ASSETS.md`** for:
- Detailed specifications
- Optimization tips
- Troubleshooting guide
- Where to find free/premium assets
- Copyright & licensing info

## Need Help?

1. **Missing assets?** Page will show fallback UI gracefully
2. **Not loading?** Check file paths match exactly
3. **Console errors?** Open DevTools (F12) to see error messages
4. **Debug mode:** Add `?debug=true` to URL for asset validation

---

**Status:** ✅ Basic media structure in place  
**Last Updated:** 2026-01-19
