chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "gistify") {
        showGistOverlay(request.text);
    }
});

function showGistOverlay(originalText) {
    // Remove existing overlay if any
    const existing = document.getElementById("gist-extension-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "gist-extension-overlay";

    overlay.innerHTML = `
    <div class="gist-card">
      <div class="gist-header">
        <div class="gist-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <span class="gist-title">Gist AI</span>
        <button class="gist-close" id="gist-close-btn">&times;</button>
      </div>
      <div class="gist-content">
        <div class="gist-loading" id="gist-loading">
          <div class="gist-spinner"></div>
          <span>Simplifying Jargon...</span>
        </div>
        <div class="gist-result" id="gist-result" style="display: none;">
          <p id="gist-text"></p>
        </div>
      </div>
      <div class="gist-footer">
        <span>Enterprise Enterprise Access</span>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    document.getElementById("gist-close-btn").onclick = () => overlay.remove();

    // Mock simplification logic
    setTimeout(() => {
        const loading = document.getElementById("gist-loading");
        const result = document.getElementById("gist-result");
        const textElem = document.getElementById("gist-text");

        loading.style.display = "none";
        result.style.display = "block";

        // Simple mock logic: just append "(Simplified)" - in real world this calls an API
        textElem.innerText = `[Simplified Gist]: The selected text "${originalText.substring(0, 50)}..." has been simplified to its core meaning for clarity. (Full API integration required for live results).`;
    }, 1500);
}
