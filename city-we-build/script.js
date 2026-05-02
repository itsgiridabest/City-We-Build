// =====================================================================
// City We Build — main JavaScript file
// Plain JavaScript. No frameworks. Read top-to-bottom!
// =====================================================================

// ------- 1. CONFIG --------------------------------------------------
// Your OpenRouter API key. Paste it between the quotes.
// NOTE: Anyone who visits the site can read this key — that's the trade-off
// for keeping things simple. Use a key with a small spending limit!
const OPENROUTER_API_KEY = "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";

// Which AI model to use. This one supports images (vision).
// Browse more at https://openrouter.ai/models
const MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

// Boston city center (used as the default map location)
const BOSTON = { lat: 42.3601, lng: -71.0589 };


// ------- 2. SET UP THE MAP ------------------------------------------
// Create the Leaflet map inside the <div id="map">
const map = L.map("map").setView([BOSTON.lat, BOSTON.lng], 13);

// Add the map "tiles" (the actual streets/buildings image) from OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);


// ------- 3. GRAB HTML ELEMENTS WE'LL USE ----------------------------
const form = document.getElementById("upload-form");
const photoInput = document.getElementById("photo");
const descInput = document.getElementById("description");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");


// ------- 4. HANDLE FORM SUBMISSION ----------------------------------
form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the page from reloading

  const file = photoInput.files[0];
  if (!file) return;

  // Show loading state
  submitBtn.disabled = true;
  statusEl.classList.remove("error");
  statusEl.textContent = "Analyzing...";

  try {
    // Step A: convert the photo to a base64 data URL (the AI needs that format)
    const imageDataUrl = await fileToDataUrl(file);

    // Step B: ask the AI what the problem is + how to fix it
    const result = await analyzeImage(imageDataUrl, descInput.value);

    // Step C: figure out where to drop the pin (user location, else Boston)
    const location = await getLocation();

    // Step D: add a marker to the map
    addMarker(location, imageDataUrl, result.problem, result.solution);

    // Reset the form
    form.reset();
    statusEl.textContent = "Done! Pin added to the map.";
  } catch (err) {
    console.error(err);
    statusEl.classList.add("error");
    statusEl.textContent = "Error: " + err.message;
  } finally {
    submitBtn.disabled = false;
  }
});


// ------- 5. HELPER: convert a File to a base64 data URL --------------
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // e.g. "data:image/png;base64,...."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


// ------- 6. HELPER: call the OpenRouter AI ---------------------------
async function analyzeImage(imageDataUrl, userText) {
  // Build the prompt
  const userPrompt =
    "You are analyzing a photo of a city problem in Boston. " +
    "Identify the issue and suggest a realistic fix. " +
    "Reply ONLY with valid JSON in this exact shape: " +
    '{"problem":"one sentence","solution":"one sentence"}. ' +
    (userText ? "Extra context from user: " + userText : "");

  // Send the request to OpenRouter (uses the OpenAI-compatible chat API)
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + OPENROUTER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error("AI request failed: " + text);
  }

  const data = await response.json();
  const messageText = data.choices[0].message.content;

  // The AI sometimes wraps JSON in ```json ... ``` — strip that
  const cleaned = messageText.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // If parsing fails, just show the raw text
    return { problem: cleaned, solution: "(AI did not return structured JSON)" };
  }
}


// ------- 7. HELPER: get user's location, fallback to Boston ----------
function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(BOSTON);

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(BOSTON), // user denied or error -> use Boston
      { timeout: 5000 }
    );
  });
}


// ------- 8. HELPER: add a pin to the map ----------------------------
function addMarker(location, imageDataUrl, problem, solution) {
  // Build the HTML that shows up inside the popup when pin is clicked
  const popupHtml = `
    <div class="popup">
      <img src="${imageDataUrl}" alt="problem photo" />
      <b>📸 Problem:</b> ${escapeHtml(problem)}
      <b>💡 Solution:</b> ${escapeHtml(solution)}
    </div>
  `;

  L.marker([location.lat, location.lng])
    .addTo(map)
    .bindPopup(popupHtml);
}


// ------- 9. SAFETY: escape user/AI text before putting in HTML -------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
