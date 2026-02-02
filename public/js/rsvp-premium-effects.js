/**
 * RSVP Premium Effects
 * ====================
 * Handles premium UI features: video intro, lottie animations, audio controller, smooth transitions
 * 
 * Assets required (fixed paths):
 * - /media/intro/envelope.mp4
 * - /media/lottie/event-side-decoration.json (top decoration)
 * - /media/lottie/flowers.json (optional flowers animation)
 * - /media/audio/All_You_Need_Is_Love-104256-mobiles24.mp3
 */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const ASSETS = {
        introVideo: '/premium/media/envelope.mp4',
        topLottie: '/premium/lottie/hero.json',
        flowersLottie: '/premium/decor/flowers.svg', // Optional - SVG decoration
        bgAudio: '/premium/media/bg-music.mp3'
    };

    const STORAGE_KEYS = {
        // REMOVED: introShown - intro must show every visit
        audioEnabled: 'rsvp_audio_enabled',
        audioMuted: 'rsvp_audio_muted' // Only store mute state
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    function logInfo(msg, data) {
        console.log(`[Premium RSVP] ${msg}`, data || '');
    }

    function logWarning(msg, data) {
        console.warn(`[Premium RSVP] ⚠️ ${msg}`, data || '');
    }

    function checkAssetExists(url) {
        return fetch(url, { method: 'HEAD' })
            .then(response => response.ok)
            .catch(() => false);
    }

    // ============================================
    // VIDEO INTRO OVERLAY
    // ============================================
    const IntroVideo = {
        overlay: null,
        video: null,
        skipBtn: null,

        async init() {
            this.overlay = document.getElementById('introOverlay');
            if (!this.overlay) {
                logWarning('Intro overlay element not found');
                return;
            }

            // CRITICAL: Always show intro overlay - never skip based on localStorage
            // The overlay will wait for user click/tap before playing video

            // Check if video exists
            const videoExists = await checkAssetExists(ASSETS.introVideo);
            if (!videoExists) {
                logWarning(`Video not found: ${ASSETS.introVideo}`);
                this.showFallback();
                return;
            }

            // Load video (but don't autoplay - wait for user gesture)
            this.loadVideo();
        },

        loadVideo() {
            // Create video element
            this.video = document.createElement('video');
            this.video.className = 'intro-video';
            this.video.src = ASSETS.introVideo;
            this.video.autoplay = false; // CRITICAL: Never autoplay - wait for user gesture
            this.video.muted = false; // Unmuted for better experience
            this.video.playsInline = true;
            this.video.preload = 'auto';
            // Ensure visual continuity - poster or first frame should look like closed envelope

            // Replace intro content
            const introContent = this.overlay.querySelector('.intro-content');
            if (introContent) {
                introContent.innerHTML = '';
                introContent.appendChild(this.video);

                // Add simple text hint (no button)
                const hintCtx = document.createElement('div');
                hintCtx.className = 'tap-to-open-hint';
                hintCtx.innerHTML = '<p class="tap-hint">לחץ לפתיחה ✨</p>';
                introContent.appendChild(hintCtx);
            }

            // Video events
            this.video.addEventListener('loadeddata', () => {
                logInfo('Video loaded, waiting for user interaction');
            });

            this.video.addEventListener('ended', () => {
                logInfo('Video ended');
                this.hide();
            });

            this.video.addEventListener('error', (e) => {
                logWarning('Video playback error', e);
                this.showFallback();
            });

            // User tap/click to play video AND start music
            let userInteracted = false;
            // Listen on the entire overlay
            this.overlay.addEventListener('click', (e) => {
                if (!userInteracted) {
                    userInteracted = true;

                    // Hide hint
                    const hint = this.overlay.querySelector('.tap-to-open-hint');
                    if (hint) hint.style.opacity = '0';

                    // Play video (user gesture unlocks audio)
                    this.playVideo();

                    // Start music (same gesture unlocks audio)
                    AudioController.startAfterIntro();
                }
            });
        },

        async playVideo() {
            if (!this.video) return;

            try {
                await this.video.play();
                logInfo('Video playing');
            } catch (error) {
                logWarning('Autoplay failed (user interaction required)', error);
                // Show a play button or hint
                this.showPlayHint();
            }
        },

        showPlayHint() {
            const hint = document.createElement('div');
            hint.className = 'intro-play-hint';
            hint.innerHTML = '<div class="play-icon">▶</div><p>לחץ לפתיחה</p>';
            hint.onclick = () => {
                this.playVideo();
                hint.remove();
            };
            this.overlay.appendChild(hint);
        },

        showFallback() {
            // Show simple animation fallback (emoji or lottie)
            const introContent = this.overlay.querySelector('.intro-content');
            if (introContent) {
                introContent.innerHTML = `
                    <div class="intro-fallback">
                        <div class="intro-emoji">💌</div>
                        <h2>ברוכים הבאים</h2>
                        <p class="tap-hint">לחץ לפתיחה ✨</p>
                    </div>
                `;
            }
            this.overlay.addEventListener('click', () => this.hide());
        },

        hide(immediate = false) {
            if (!this.overlay) return;

            // CRITICAL: Do NOT store introShown in localStorage
            // Intro must show every visit

            // Fade out
            if (immediate) {
                this.overlay.style.display = 'none';
            } else {
                this.overlay.style.opacity = '0';
                this.overlay.style.visibility = 'hidden';
                setTimeout(() => {
                    this.overlay.style.display = 'none';
                }, 800);
            }

            // Reveal main content with animation
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.style.opacity = '1';
                mainContent.style.pointerEvents = 'all';
            }

            logInfo('Intro hidden, main content revealed');
        }
    };

    // ============================================
    // LOTTIE ANIMATIONS
    // ============================================
    const LottieAnimations = {
        topAnimation: null,
        flowersAnimation: null,
        lottieLoaded: false,

        async init() {
            // Load lottie library
            await this.loadLottieLib();
            if (!this.lottieLoaded) return;

            // Initialize animations
            this.initTopAnimation();
            this.initFlowersAnimation();
        },

        async loadLottieLib() {
            if (window.lottie) {
                this.lottieLoaded = true;
                return;
            }

            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
                script.onload = () => {
                    this.lottieLoaded = true;
                    logInfo('Lottie library loaded');
                    resolve();
                };
                script.onerror = () => {
                    logWarning('Failed to load lottie library');
                    resolve();
                };
                document.head.appendChild(script);
            });
        },

        async initTopAnimation() {
            const container = document.getElementById('topLottieContainer');
            if (!container) {
                logWarning('Top lottie container not found');
                return;
            }

            // Check if animation file exists
            const exists = await checkAssetExists(ASSETS.topLottie);
            if (!exists) {
                logWarning(`Top lottie not found: ${ASSETS.topLottie}`);
                // Graceful fallback: show subtle background instead
                container.style.background = 'linear-gradient(180deg, rgba(212, 175, 55, 0.1) 0%, transparent 100%)';
                container.style.height = '150px';
                return;
            }

            try {
                this.topAnimation = window.lottie.loadAnimation({
                    container: container,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: ASSETS.topLottie
                });
                logInfo('Top lottie animation loaded');
            } catch (error) {
                logWarning('Failed to load top lottie', error);
                // Graceful fallback
                container.style.background = 'linear-gradient(180deg, rgba(212, 175, 55, 0.1) 0%, transparent 100%)';
                container.style.height = '150px';
            }
        },

        async initFlowersAnimation() {
            // Flowers are now SVG decoration via CSS ::before/::after
            // No JavaScript needed - handled by CSS
            logInfo('Flowers decoration handled via CSS');
        }
    };

    // ============================================
    // AUDIO CONTROLLER
    // ============================================
    const AudioController = {
        audio: null,
        toggle: null,
        enabled: false,
        started: false,

        async init() {
            this.audio = document.getElementById('bgMusic');
            this.toggle = document.getElementById('musicToggle');

            if (!this.audio || !this.toggle) {
                logWarning('Audio elements not found');
                return;
            }

            // Check if audio file exists
            const audioExists = await checkAssetExists(ASSETS.bgAudio);
            if (!audioExists) {
                logWarning(`Audio file not found: ${ASSETS.bgAudio}`);
                this.toggle.style.display = 'none';
                return;
            }

            // Set audio source
            this.audio.src = ASSETS.bgAudio;
            this.audio.volume = 0.6;
            this.audio.loop = true;

            // Load mute preference (only store mute state, not intro state)
            const savedMuted = localStorage.getItem(STORAGE_KEYS.audioMuted);
            this.muted = savedMuted === 'true';

            // Setup toggle
            this.toggle.addEventListener('click', () => this.toggleAudio());
            this.toggle.style.display = 'flex';

            // Update UI
            this.updateUI();

            logInfo('Audio controller initialized');
        },

        startAfterIntro() {
            // Start audio after user gesture (from intro click)
            // Only play if not muted
            if (!this.muted && !this.started) {
                this.play();
            }
        },

        async play() {
            if (!this.audio) return;

            try {
                await this.audio.play();
                this.started = true;
                this.muted = false;
                this.updateUI();
                // Save mute state (false = not muted = playing)
                localStorage.setItem(STORAGE_KEYS.audioMuted, 'false');
                logInfo('Audio playing');
            } catch (error) {
                logWarning('Audio playback failed (user interaction required)', error);
            }
        },

        pause() {
            if (!this.audio) return;
            this.audio.pause();
            this.started = false;
            this.muted = true;
            this.updateUI();
            // Save mute state (true = muted = paused)
            localStorage.setItem(STORAGE_KEYS.audioMuted, 'true');
            logInfo('Audio paused');
        },

        toggleAudio() {
            if (this.audio.paused || this.muted) {
                this.play();
            } else {
                this.pause();
            }
        },

        updateUI() {
            if (!this.toggle) return;

            if (this.started && !this.muted) {
                this.toggle.classList.add('music-playing');
                this.toggle.setAttribute('aria-label', 'השתק מוזיקה');
            } else {
                this.toggle.classList.remove('music-playing');
                this.toggle.setAttribute('aria-label', 'הפעל מוזיקה');
            }
        }
    };

    // ============================================
    // SMOOTH SCROLL & TRANSITIONS
    // ============================================
    const SmoothEffects = {
        init() {
            // Intersection observer for fade-in animations
            this.setupScrollReveal();

            // Smooth scroll for anchor links
            this.setupSmoothScroll();
        },

        setupScrollReveal() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            // Observe all .section-reveal elements
            document.querySelectorAll('.section-reveal').forEach(el => {
                observer.observe(el);
            });
        },

        setupSmoothScroll() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        }
    };

    // ============================================
    // ASSET VALIDATION (DEV TOOL)
    // ============================================
    const AssetValidator = {
        async validate() {
            logInfo('Validating premium assets...');

            const results = {};

            for (const [key, url] of Object.entries(ASSETS)) {
                const exists = await checkAssetExists(url);
                results[key] = exists;

                if (exists) {
                    logInfo(`✓ ${key}: ${url}`);
                } else {
                    logWarning(`✗ ${key}: ${url} NOT FOUND`);
                }
            }

            // Display results in console
            console.table(results);

            // Display on-screen warning if critical assets are missing
            const criticalMissing = !results.introVideo || !results.bgAudio;
            if (criticalMissing) {
                this.showAssetWarning();
            }

            return results;
        },

        showAssetWarning() {
            const warning = document.createElement('div');
            warning.className = 'asset-warning';
            warning.innerHTML = `
                <div class="asset-warning-content">
                    <h3>⚠️ Assets Missing</h3>
                    <p>Some premium assets are not found. Please upload files to:</p>
                    <ul>
                        <li><code>/public/media/intro/envelope.mp4</code></li>
                        <li><code>/public/media/audio/All_You_Need_Is_Love-104256-mobiles24.mp3</code></li>
                        <li><code>/public/media/lottie/event-side-decoration.json</code></li>
                        <li><code>/public/media/lottie/flowers.json</code> (optional)</li>
                    </ul>
                    <button onclick="this.parentElement.parentElement.remove()">Close</button>
                </div>
            `;
            document.body.appendChild(warning);
        }
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    async function initialize() {
        logInfo('Initializing premium effects...');

        // Validate assets (dev mode only - check for ?debug param)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('debug')) {
            await AssetValidator.validate();
        }

        // Initialize modules
        await IntroVideo.init();
        await AudioController.init();
        await LottieAnimations.init();
        SmoothEffects.init();

        logInfo('Premium effects initialized ✨');
    }

    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Export for debugging
    window.PremiumRSVP = {
        IntroVideo,
        AudioController,
        LottieAnimations,
        AssetValidator
    };

})();
