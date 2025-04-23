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

  // Add landing page transition
  tryNowBtn.addEventListener("click", function () {
    showChatInterface();
  });

  // Home button functionality
  homeBtn.addEventListener("click", function (e) {
    e.preventDefault();
    showLandingPage();
  });

  // Show chat interface
  function showChatInterface() {
    landingSection.style.height = "0";
    landingSection.style.overflow = "hidden";
    landingSection.style.opacity = "0";
    landingSection.style.transition = "opacity 0.5s ease, height 0.8s ease";

    // Show app container
    appContainer.classList.add("visible");

    // Scroll to app container
    setTimeout(() => {
      appContainer.scrollIntoView({ behavior: "smooth" });
      userInput.focus();
    }, 100);
  }

  // Show landing page
  function showLandingPage() {
    // Reset landing section
    landingSection.style.height = "77vh";
    landingSection.style.overflow = "visible";
    landingSection.style.opacity = "1";

    // Hide app container
    appContainer.classList.remove("visible");

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // About modal functionality
  aboutBtn.addEventListener("click", function (e) {
    e.preventDefault();
    aboutModal.style.display = "block";
  });

  // Close modal when clicking X
  closeModal.addEventListener("click", function () {
    aboutModal.style.display = "none";
  });

  // Close modal when clicking outside
  window.addEventListener("click", function (e) {
    if (e.target === aboutModal) {
      aboutModal.style.display = "none";
    }
  });

  // Function to add a message to the chat
  function addMessage(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");
    messageDiv.classList.add(
      sender === "user" ? "user-message" : "bot-message"
    );
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Function to add typing indicator
  function showTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "typing-indicator";
    indicator.classList.add("typing-indicator", "bot-message");
    indicator.innerHTML = "<span></span><span></span><span></span>";
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Function to remove typing indicator
  function removeTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) {
      indicator.remove();
    }
  }

  // Function to create event cards - enhanced design
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

  // Extract events from response
  function extractEventsFromResponse(text) {
    try {
      // Look for JSON-like structures in the text
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

      // If no JSON found, try to parse structured text
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

          // Extract name (usually first line)
          if (lines.length > 0) {
            event.name = lines[0].replace(/^Name:?\s*/i, "").trim();
          }

          // Extract other details
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

          // If we have at least a name, add the event
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

  // Function to handle Gemini API response
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyC_vUEKXfRNZJUbuA4u7QOq8R9LGymwOdI`,
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
              temperature: 0.4,
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

      // Get the response text
      const responseText =
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0].text
          ? data.candidates[0].content.parts[0].text
          : "No response received from the API.";

      // Extract events from the response
      const events = extractEventsFromResponse(responseText);

      if (events && events.length > 0) {
        // We have events, create HTML for them
        const eventsHTML = createEventCards(events);
        return {
          // Changed to empty string to remove the text container
          text: "",
          html: eventsHTML,
        };
      } else {
        // Just return the text response
        return {
          text: responseText,
          html: "",
        };
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);

      // Fallback to mock data if API call fails
      const lowercaseMsg = message.toLowerCase();
      const locations = Object.keys(sampleEvents || {});
      const foundLocation = locations.find((location) =>
        lowercaseMsg.includes(location.toLowerCase())
      );

      if (foundLocation && sampleEvents && sampleEvents[foundLocation]) {
        const events = sampleEvents[foundLocation];
        const eventsHTML = createEventCards(events);
        return {
          // Changed to empty string to remove the text container
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

  // Sample events data for fallback
  const sampleEvents = {
    "New York": [
      {
        name: "NYC Fashion Week Spring Collection",
        date: "May 15-22, 2025",
        location: "Manhattan Fashion Center, NY",
        description:
          "Annual showcase of the latest spring collections from top designers and emerging talents.",
        tags: ["runway", "high fashion", "designers"],
      },
      {
        name: "Sustainable Fashion Expo",
        date: "May 28-30, 2025",
        location: "Brooklyn Exhibition Hall",
        description:
          "Exhibition focused on sustainable and eco-friendly fashion innovations and brands.",
        tags: ["sustainable", "eco-friendly", "exhibition"],
      },
    ],
    London: [
      {
        name: "London Fashion Summit",
        date: "June 5-8, 2025",
        location: "Royal Exhibition Centre",
        description:
          "Industry leaders gather to discuss future trends and innovations in the fashion world.",
        tags: ["conference", "networking", "industry"],
      },
    ],
    Paris: [
      {
        name: "Haute Couture Week Paris",
        date: "May 20-26, 2025",
        location: "Grand Palais, Paris",
        description:
          "Prestigious showcase of handcrafted high-end fashion designs from the world's most exclusive fashion houses.",
        tags: ["haute couture", "luxury", "exclusive"],
      },
    ],
  };

  // Function to handle user message
  async function handleUserMessage() {
    const message = userInput.value.trim();
    if (message === "") return;

    // Add user message to chat
    addMessage(message, "user");
    userInput.value = "";

    // Show typing indicator
    showTypingIndicator();

    // Get response from Gemini API
    try {
      const response = await getGeminiResponse(message);
      removeTypingIndicator();

      // Add bot text response (if any)
      if (response.text) {
        addMessage(response.text, "bot");
      }

      // If there's HTML content (events), add it
      if (response.html) {
        const eventsDiv = document.createElement("div");
        eventsDiv.classList.add("message", "bot-message");
        eventsDiv.innerHTML = response.html;
        chatMessages.appendChild(eventsDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      // If both text and HTML are empty, show a generic message
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

  // Event listeners
  sendBtn.addEventListener("click", handleUserMessage);
  userInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      handleUserMessage();
    }
  });
});
