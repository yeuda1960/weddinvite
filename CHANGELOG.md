# Changelog - Wedding Invitation System

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-01-19

### 🎉 Premium RSVP Complete Transformation

Complete overhaul of guest-facing RSVP page to premium experience matching Project #2.

### ✨ Added

#### Multi-Step RSVP Stepper
- **3 attendance options**: Yes / Maybe / Not Attending
- **Progress indicator** with 3 steps visualization
- **Conditional flows** based on choice
- **Smooth animations** between steps
- **Auto-scroll** to active step
- **Back navigation** on all steps

#### Visual Enhancements
- **Intro video** appears on EVERY visit (no localStorage)
- **Continuous scroll** layout (no "boxy cards")
- **Section reordering**: Invitation → Details → RSVP
- **Flowers decoration** wraps event details card
- **Premium typography** with Amatic SC font

#### Media Integration
- Video intro: `/media/intro/envelope.mp4`
- Background music: `/media/audio/All_You_Need_Is_Love-*.mp3`
- Lottie decorations: `/media/lottie/*.json`
- Custom font: `/premium/fonts/AmaticSC-Regular.ttf`

#### User Experience
- Floating music toggle (🎵)
- Smooth scroll + auto-scroll
- Fade-in animations
- Mobile responsive
- RTL Hebrew support

### 🔧 Changed

#### Firestore Schema (Extended, Not Breaking)
- **New field**: `attendanceStatus` - "yes" | "maybe" | "no"
- **Modified**: `attending` - can be `true`, `false`, or `null`
- **All existing fields preserved**

#### Files Modified
- `public/rsvp.html` - Stepper structure
- `public/css/rsvp-premium.css` - Premium styles
- `public/js/rsvp.js` - Global exports
- `public/js/rsvp-premium-effects.js` - Video/Lottie/Audio
- `README.md` - Updated documentation

### 🚀 Files Added
- `public/js/rsvp-stepper.js` - Stepper controller
- `docs/PREMIUM_ASSETS.md` - Asset specifications
- `docs/PREMIUM_RSVP_TRANSFORMATION.md` - Implementation guide
- `public/media/*` - Media assets structure
- `CHANGELOG.md` - This file

### 🔒 Zero Breaking Changes
- ✅ Link format: `/rsvp.html?phone=...` unchanged
- ✅ Phone normalization unchanged
- ✅ Firestore path: `guests/{normalizedPhone}` unchanged
- ✅ WhatsApp flow unaffected
- ✅ Admin dashboard unaffected

### 📊 Statistics
- **24 files changed**: 3,485 insertions, 219 deletions
- **New JavaScript**: 884 lines (stepper + effects)
- **New CSS**: 476 lines (premium styles)
- **Documentation**: 1,000+ lines

---

## [1.0.0] - Previous Version

Initial version with basic RSVP functionality.

---

**Branch**: `feature/premium-rsvp-ui`  
**Base**: `main`  
**Status**: ✅ Complete
