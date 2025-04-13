// Function to track reel interactions
function trackReelInteraction(type) {
    chrome.storage.sync.get(['reelStats'], function(result) {
        const stats = result.reelStats || {
            clicked: 0,
            scrolled: 0
        };

        if (type === 'click') {
            stats.clicked++;
        } else if (type === 'scroll') {
            stats.scrolled++;
        }

        // Save updated stats
        chrome.storage.sync.set({
            reelStats: stats
        });

        // Update popup if it's open
        chrome.runtime.sendMessage({
            type: 'statsUpdate',
            stats: stats
        });
    });
}

// Function to add click tracking to reels
function addReelTracking() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('youtube.com')) {
        // Track clicks on YouTube Shorts
        const shortsLinks = document.querySelectorAll('a[href*="/shorts/"], ytd-reel-video-renderer');
        shortsLinks.forEach(link => {
            if (!link.dataset.trackingAdded) {
                link.addEventListener('click', () => trackReelInteraction('click'));
                link.dataset.trackingAdded = 'true';
            }
        });

        // Track scrolled shorts
        const shortsElements = document.querySelectorAll('ytd-reel-video-renderer, ytd-rich-grid-media');
        shortsElements.forEach(element => {
            if (!element.dataset.trackingAdded) {
                const observer = new IntersectionObserver(
                    (entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const isShort = element.querySelector('a[href*="/shorts/"]');
                                if (isShort) {
                                    trackReelInteraction('scroll');
                                }
                            }
                        });
                    },
                    { threshold: 0.5 }
                );
                observer.observe(element);
                element.dataset.trackingAdded = 'true';
            }
        });
    } else {
        // Track clicks on reels (existing code for other platforms)
        const reelLinks = document.querySelectorAll('a[href*="/reels/"], div[role="button"][tabindex="0"]');
        reelLinks.forEach(link => {
            if (!link.dataset.trackingAdded) {
                link.addEventListener('click', () => trackReelInteraction('click'));
                link.dataset.trackingAdded = 'true';
            }
        });

        // Track scrolled reels (existing code for other platforms)
        const reelElements = document.querySelectorAll('article, div[role="button"][tabindex="0"]');
        reelElements.forEach(element => {
            if (!element.dataset.trackingAdded) {
                const observer = new IntersectionObserver(
                    (entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const isReel = element.querySelector('video') || 
                                             element.textContent.toLowerCase().includes('reel') ||
                                             element.querySelector('a[href*="/reels/"]');
                                if (isReel) {
                                    trackReelInteraction('scroll');
                                }
                            }
                        });
                    },
                    { threshold: 0.5 }
                );
                observer.observe(element);
                element.dataset.trackingAdded = 'true';
            }
        });
    }
}

// Function to remove reels based on the current website and preferences
function removeReels() {
    // Get current preferences
    chrome.storage.sync.get(['sitePreferences'], function(result) {
        const preferences = result.sitePreferences || {
            youtube: true,
            instagram: true,
            facebook: true,
            linkedin: true
        };

        const hostname = window.location.hostname;
        
        if (hostname.includes('youtube.com')) {
            if (preferences.youtube) {
                // Only add the blocking style if shorts should be hidden
                const styleElement = document.createElement('style');
                styleElement.id = 'shorts-blocker-style';
                styleElement.textContent = `
                    ytd-reel-shelf-renderer,
                    ytd-reel-video-renderer,
                    ytd-rich-grid-media[is-short],
                    ytd-rich-section-renderer[is-shorts-shelf],
                    ytd-video-renderer:has(a[href*="/shorts/"]),
                    ytd-mini-guide-entry-renderer[aria-label*="Shorts"],
                    ytd-guide-entry-renderer:has(a[title="Shorts"]) {
                        display: none !important;
                    }
                `;
                document.head.appendChild(styleElement);
            } else {
                // If shorts should be visible, just remove any existing blocker style
                const existingStyle = document.getElementById('shorts-blocker-style');
                if (existingStyle) {
                    existingStyle.remove();
                }
                // Track interactions when blocking is disabled
                addReelTracking();
            }
        }
        else if (hostname.includes('instagram.com')) {
            if (preferences.instagram) {
                // Remove reels from sidebar
                const sidebarReels = document.querySelectorAll('a[href*="/reels/"]');
                sidebarReels.forEach(element => {
                    // Remove the entire list item containing the reels link
                    const listItem = element.closest('div[role="button"], a, li');
                    if (listItem) listItem.remove();
                });

                // Remove reels from explore page - more aggressive approach
                const exploreSelectors = [
                    'div[role="button"][tabindex="0"]',
                    'a[role="link"]',
                    'div._aagv', // Instagram's internal class for media containers
                    'div[class*="explore"]' // Explore grid items
                ];
                
                exploreSelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        // Check multiple indicators for reels
                        const isReel = element.querySelector('video') || 
                                    element.textContent.toLowerCase().includes('reel') ||
                                    element.getAttribute('href')?.includes('/reels/') ||
                                    element.querySelector('svg[aria-label*="Reel"]') ||
                                    element.querySelector('div[class*="reel"]') ||
                                    element.closest('div[class*="reel"]');
                        
                        if (isReel) {
                            // Try to remove the entire grid item
                            const gridItem = element.closest('div._aabd, div._aagv, article, div[role="presentation"]');
                            if (gridItem) {
                                gridItem.remove();
                            } else {
                                element.remove();
                            }
                        }
                    });
                });

                // Remove reels from main feed
                const feedReels = document.querySelectorAll('article');
                feedReels.forEach(article => {
                    const hasReel = article.querySelector('video') || 
                                article.textContent.toLowerCase().includes('reel') ||
                                article.querySelector('a[href*="/reels/"]') ||
                                article.querySelector('svg[aria-label*="Reel"]');
                    if (hasReel) {
                        article.remove();
                    }
                });

                // Remove reels tab from profile
                const profileReelsTab = document.querySelector('a[href*="/reels/"]');
                if (profileReelsTab) {
                    const tabContainer = profileReelsTab.closest('div[role="tablist"]');
                    if (tabContainer) tabContainer.remove();
                }

                // Add styles to fix grid layout and hide reel indicators
                const style = document.createElement('style');
                style.textContent = `
                    /* Hide reel indicators and icons */
                    div[aria-label*="Reel"], 
                    div[class*="reelIcon"],
                    svg[aria-label*="Reel"] { 
                        display: none !important; 
                    }

                    /* Fix explore page grid layout */
                    div._aagv {
                        display: inline-block !important;
                        margin: 0 !important;
                    }
                    
                    /* Main grid container */
                    div._aabd {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 1px !important;
                        width: 100% !important;
                    }

                    /* Grid items */
                    article._ac7v._al7v {
                        margin: 0 !important;
                        width: 100% !important;
                    }

                    /* Explore page container */
                    div[style*="grid"] {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 1px !important;
                        width: 100% !important;
                    }
                `;
                document.head.appendChild(style);
            } else {
                addReelTracking();
            }
        } 
        else if (hostname.includes('facebook.com')) {
            if (preferences.facebook) {
                // Facebook reels - more comprehensive selectors
                const facebookSelectors = [
                    'a[href*="/reel/"]',
                    'div[data-pagelet*="Reels"]',
                    'div[aria-label*="Reel"]',
                    'div[class*="reel"]',
                    'div[role="article"] video',
                    'div[data-visualcompletion*="reel"]'
                ];
                
                facebookSelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        const parent = element.closest('div[role="article"], div[class*="reel"]');
                        if (parent) parent.remove();
                    });
                });
            } else {
                addReelTracking();
            }
        }
        else if (hostname.includes('linkedin.com')) {
            if (preferences.linkedin) {
                // LinkedIn reels (short-form videos)
                const linkedinReels = document.querySelectorAll('div[data-urn*="feedUpdate"], div[class*="feed-shared-update-v2"]');
                linkedinReels.forEach(element => {
                    const hasVideo = element.querySelector('video');
                    const hasReelText = element.textContent.toLowerCase().includes('reel') || 
                                    element.textContent.toLowerCase().includes('short');
                    if (hasVideo && hasReelText) {
                        element.remove();
                    }
                });
            } else {
                addReelTracking();
            }
        }
    });
}

// Run the function when the page loads
removeReels();

// Run more frequently for explore page and shorts
setInterval(removeReels, 1000);

// Also run when new content is loaded (for infinite scroll)
const observer = new MutationObserver(removeReels);
observer.observe(document.body, {
    childList: true,
    subtree: true
}); 