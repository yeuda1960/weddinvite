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

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const ASSETS = {
        introVideo: '/media/intro/envelope.mp4',
        topLottie: '/media/lottie/event-side-decoration.json',
        flowersLottie: '/media/lottie/flowers.json', // Optional
        bgAudio: '/media/audio/All_You_Need_Is_Love-104256-mobiles24.mp3'
    };

    const STORAGE_KEYS = {
        introShown: 'rsvp_intro_shown',
        audioEnabled: 'rsvp_audio_enabled'
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

            // Check if intro was already shown (localStorage)
            const introShown = localStorage.getItem(STORAGE_KEYS.introShown);
            if (introShown === 'true') {
                logInfo('Intro already shown, skipping');
                this.hide(true);
                return;
            }

            // Check if video exists
            const videoExists = await checkAssetExists(ASSETS.introVideo);
            if (!videoExists) {
                logWarning(`Video not found: ${ASSETS.introVideo}`);
                this.showFallback();
                return;
            }

            // Load video
            this.loadVideo();
        },

        loadVideo() {
            // Create video element
            this.video = document.createElement('video');
            this.video.className = 'intro-video';
            this.video.src = ASSETS.introVideo;
            this.video.autoplay = false;
            this.video.muted = true; // Required for autoplay
            this.video.playsInline = true;
            this.video.preload = 'auto';

            // Create skip button
            this.skipBtn = document.createElement('button');
            this.skipBtn.className = 'intro-skip-btn';
            this.skipBtn.textContent = 'דלג';
            this.skipBtn.onclick = () => this.hide();

            // Replace intro content
            const introContent = this.overlay.querySelector('.intro-content');
            if (introContent) {
                introContent.innerHTML = '';
                introContent.appendChild(this.video);
                introContent.appendChild(this.skipBtn);
            }

            // Video events
            this.video.addEventListener('loadeddata', () => {
                logInfo('Video loaded, attempting to play');
                this.playVideo();
            });

            this.video.addEventListener('ended', () => {
                logInfo('Video ended');
                this.hide();
            });

            this.video.addEventListener('error', (e) => {
                logWarning('Video playback error', e);
                this.showFallback();
            });

            // User tap to play
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.skipBtn) return;
                this.playVideo();
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

            // Mark as shown
            localStorage.setItem(STORAGE_KEYS.introShown, 'true');

            // Trigger audio start
            AudioController.startAfterIntro();

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
                container.style.display = 'none';
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
                container.style.display = 'none';
            }
        },

        async initFlowersAnimation() {
            const container = document.getElementById('flowersLottieContainer');
            if (!container) return;

            // Check if animation file exists
            const exists = await checkAssetExists(ASSETS.flowersLottie);
            if (!exists) {
                logInfo('Flowers lottie not found (optional)');
                container.style.display = 'none';
                return;
            }

            try {
                this.flowersAnimation = window.lottie.loadAnimation({
                    container: container,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: ASSETS.flowersLottie
                });
                logInfo('Flowers lottie animation loaded');
            } catch (error) {
                logWarning('Failed to load flowers lottie', error);
                container.style.display = 'none';
            }
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

            // Load user preference
            const savedPref = localStorage.getItem(STORAGE_KEYS.audioEnabled);
            this.enabled = savedPref !== 'false'; // Default to true

            // Setup toggle
            this.toggle.addEventListener('click', () => this.toggleAudio());
            this.toggle.style.display = 'flex';

            // Update UI
            this.updateUI();

            logInfo('Audio controller initialized');
        },

        startAfterIntro() {
            // Auto-start audio after intro (if enabled)
            if (this.enabled && !this.started) {
                this.play();
            }
        },

        async play() {
            if (!this.audio || this.started) return;

            try {
                await this.audio.play();
                this.started = true;
                this.enabled = true;
                this.updateUI();
                logInfo('Audio playing');
            } catch (error) {
                logWarning('Audio playback failed (user interaction required)', error);
            }
        },

        pause() {
            if (!this.audio) return;
            this.audio.pause();
            this.started = false;
            this.enabled = false;
            this.updateUI();
            logInfo('Audio paused');
        },

        toggleAudio() {
            if (this.audio.paused) {
                this.play();
            } else {
                this.pause();
            }
            // Save preference
            localStorage.setItem(STORAGE_KEYS.audioEnabled, this.enabled.toString());
        },

        updateUI() {
            if (!this.toggle) return;
            
            if (this.enabled && this.started) {
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
                anchor.addEventListener('click', function(e) {
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
