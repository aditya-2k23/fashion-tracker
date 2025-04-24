document.addEventListener("DOMContentLoaded", function () {
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const tryNowBtn = document.getElementById("try-now-btn");
  const landingSection = document.getElementById("landing");
  const appContainer = document.getElementById("app-container");
  const homeBtn = document.getElementById("home-btn");
  const aboutBtn = document.getElementById("about-btn");
  const aboutModal = document.getElementById("about-modal");
  const closeModal = document.querySelector(".close-modal");

  const GEMINI_API_KEY = CONFIG.GEMINI_API_KEY;

  tryNowBtn.addEventListener("click", function () {
    showChatInterface();
  });

  homeBtn.addEventListener("click", function (e) {
    e.preventDefault();
    showLandingPage();
  });

  function showChatInterface() {
    landingSection.style.height = "0";
    landingSection.style.overflow = "hidden";
    landingSection.style.opacity = "0";
    landingSection.style.transition = "opacity 0.5s ease, height 0.8s ease";

    appContainer.classList.add("visible");

    setTimeout(() => {
      appContainer.scrollIntoView({ behavior: "smooth" });
      userInput.focus();
    }, 100);
  }

  function showLandingPage() {
    landingSection.style.height = "77vh";
    landingSection.style.overflow = "visible";
    landingSection.style.opacity = "1";

    appContainer.classList.remove("visible");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  aboutBtn.addEventListener("click", function (e) {
    e.preventDefault();
    aboutModal.style.display = "block";
  });

  closeModal.addEventListener("click", function () {
    aboutModal.style.display = "none";
  });

  window.addEventListener("click", function (e) {
    if (e.target === aboutModal) {
      aboutModal.style.display = "none";
    }
  });

  function addMessage(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");
    messageDiv.classList.add(
      sender === "user" ? "user-message" : "bot-message"
    );

    try {
      const json = JSON.parse(message);
      if (Array.isArray(json)) {
        messageDiv.innerHTML = createEventCards(json);
      } else {
        messageDiv.textContent = message;
      }
    } catch {
      messageDiv.textContent = message;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "typing-indicator";
    indicator.classList.add("typing-indicator", "bot-message");
    indicator.innerHTML = "<span></span><span></span><span></span>";
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) {
      indicator.remove();
    }
  }

  function createEventCards(events) {
    let html = "";
    events.forEach((event) => {
      const tags = event.tags || [];
      html += `
                <div class="event-card">
                    <h3>${event.name}</h3>
                    <div class="date-location">
                        <span>${event.date}</span>
                        <span>${event.location}</span>
                    </div>
                    <p>${event.description}</p>
                    <div class="tags">
                        ${tags
                          .map((tag) => `<span class="tag">${tag}</span>`)
                          .join("")}
                    </div>
                </div>
            `;
    });
    return html;
  }

  function extractEventsFromResponse(text) {
    try {
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[0]);
          if (Array.isArray(jsonData)) {
            return jsonData;
          }
        } catch (e) {
          console.error("Failed to parse JSON from response", e);
        }
      }

      const events = [];
      const eventBlocks = text
        .split(/(?:Event|Fashion Event) \d+:/i)
        .filter((block) => block.trim());

      if (eventBlocks.length > 0) {
        eventBlocks.forEach((block) => {
          const lines = block.split("\n").filter((line) => line.trim());
          const event = {
            name: "",
            date: "",
            location: "",
            description: "",
            tags: [],
          };

          if (lines.length > 0) {
            event.name = lines[0].replace(/^Name:?\s*/i, "").trim();
          }

          lines.forEach((line) => {
            if (line.match(/date:?\s*/i)) {
              event.date = line.replace(/date:?\s*/i, "").trim();
            } else if (line.match(/location:?\s*/i)) {
              event.location = line.replace(/location:?\s*/i, "").trim();
            } else if (line.match(/description:?\s*/i)) {
              event.description = line.replace(/description:?\s*/i, "").trim();
            } else if (line.match(/tags:?\s*/i)) {
              event.tags = line
                .replace(/tags:?\s*/i, "")
                .split(",")
                .map((tag) => tag.trim());
            }
          });

          if (event.name) {
            events.push(event);
          }
        });
      }

      return events.length > 0 ? events : null;
    } catch (error) {
      console.error("Error extracting events:", error);
      return null;
    }
  }

  async function getGeminiResponse(message) {
    try {
      const prompt = `
                You are a fashion event assistant. The user is asking about fashion events.

                User message: "${message}"

                If the user is asking about fashion events in a specific location, please provide information about relevant fashion events.
                Include the following details for each event:
                - Name of the event
                - Date of the event (use future dates, as today is May 2025)
                - Location details
                - Brief description
                - Tags or categories

                Present the information in a structured format and be specific about the location mentioned.
                If the user's message doesn't specify a location, ask them which city they're interested in.

                Format your response as a JSON array if possible, like this:
                [
                    {
                        "name": "Event Name",
                        "date": "Date",
                        "location": "Location",
                        "description": "Description",
                        "tags": ["tag1", "tag2"]
                    }
                ]
            `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt + "\n\nUser query: " + message,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 2,
              topK: 32,
              topP: 1,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        console.error("API Error:", data.error);
        return {
          text: `Error: ${
            data.error.message || "An error occurred with the Gemini API"
          }`,
          html: "",
        };
      }

      const responseText =
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0].text
          ? data.candidates[0].content.parts[0].text
          : "No response received from the API.";

      const events = extractEventsFromResponse(responseText);

      if (events && events.length > 0) {
        const eventsHTML = createEventCards(events);
        return {
          text: "",
          html: eventsHTML,
        };
      } else {
        return {
          text: responseText,
          html: "",
        };
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);

      const lowercaseMsg = message.toLowerCase();
      const locations = Object.keys(sampleEvents || {});
      const foundLocation = locations.find((location) =>
        lowercaseMsg.includes(location.toLowerCase())
      );

      if (foundLocation && sampleEvents && sampleEvents[foundLocation]) {
        const events = sampleEvents[foundLocation];
        const eventsHTML = createEventCards(events);
        return {
          text: "",
          html: eventsHTML,
        };
      } else {
        return {
          text: "I encountered an error connecting to the Gemini API. Please try again later. In the meantime, I can help you find fashion events in New York, London, Paris, Milan, or Mumbai using my local database.",
          html: "",
        };
      }
    }
  }

  async function handleUserMessage() {
    const message = userInput.value.trim();
    if (message === "") return;

    addMessage(message, "user");
    userInput.value = "";

    showTypingIndicator();

    try {
      const response = await getGeminiResponse(message);
      removeTypingIndicator();

      if (response.text) {
        addMessage(response.text, "bot");
      }

      if (response.html) {
        const eventsDiv = document.createElement("div");
        eventsDiv.classList.add("message", "bot-message");
        eventsDiv.innerHTML = response.html;
        chatMessages.appendChild(eventsDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      if (!response.text && !response.html) {
        addMessage(
          "I couldn't find any fashion events matching your criteria. Please try another location or event type.",
          "bot"
        );
      }
    } catch (error) {
      removeTypingIndicator();
      addMessage(
        "Sorry, I encountered an error while processing your request. Please try again later.",
        "bot"
      );
    }
  }

  sendBtn.addEventListener("click", handleUserMessage);
  userInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      handleUserMessage();
    }
  });
});
