// Get all checkboxes and stats elements
const checkboxes = {
    youtube: document.getElementById('youtube'),
    instagram: document.getElementById('instagram'),
    facebook: document.getElementById('facebook'),
    linkedin: document.getElementById('linkedin')
};

const reelsClickedElement = document.getElementById('reelsClicked');
const reelsScrolledElement = document.getElementById('reelsScrolled');
const resetButton = document.getElementById('resetStats');

// Load saved preferences and stats
chrome.storage.sync.get(['sitePreferences', 'reelStats'], function(result) {
    const preferences = result.sitePreferences || {
        youtube: true,
        instagram: true,
        facebook: true,
        linkedin: true
    };

    const stats = result.reelStats || {
        clicked: 0,
        scrolled: 0
    };

    // Set checkbox states
    Object.keys(checkboxes).forEach(site => {
        checkboxes[site].checked = preferences[site];
    });

    // Update stats display
    updateStatsDisplay(stats);
});

// Save preferences when changed
Object.keys(checkboxes).forEach(site => {
    checkboxes[site].addEventListener('change', function() {
        // Get current preferences
        chrome.storage.sync.get(['sitePreferences'], function(result) {
            const preferences = result.sitePreferences || {
                youtube: true,
                instagram: true,
                facebook: true,
                linkedin: true
            };

            // Update preference
            preferences[site] = checkboxes[site].checked;

            // Save updated preferences
            chrome.storage.sync.set({
                sitePreferences: preferences
            });
        });
    });
});

// Reset stats when button is clicked
resetButton.addEventListener('click', function() {
    const stats = {
        clicked: 0,
        scrolled: 0
    };

    // Save reset stats
    chrome.storage.sync.set({
        reelStats: stats
    }, function() {
        // Update display
        updateStatsDisplay(stats);
    });
});

// Function to update stats display
function updateStatsDisplay(stats) {
    reelsClickedElement.textContent = stats.clicked;
    reelsScrolledElement.textContent = stats.scrolled;
}

// Listen for stat updates from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'statsUpdate') {
        updateStatsDisplay(request.stats);
    }
}); 