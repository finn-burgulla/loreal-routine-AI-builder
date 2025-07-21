/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Array to keep track of selected products */
let selectedProducts = [];

/* Helper function to save selected products to localStorage */
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Helper function to load selected products from localStorage */
function loadSelectedProductsFromStorage() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
    } catch (e) {
      selectedProducts = [];
    }
  }
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Store all products for filtering */
let allProducts = [];

/* Get reference to the product search input */
const productSearch = document.getElementById("productSearch");

/* Helper function to filter products by category and search */
function filterProducts() {
  // Get selected category
  const selectedCategory = categoryFilter.value;
  // Get search keyword (lowercase for easier matching)
  const keyword = productSearch.value.trim().toLowerCase();

  // Filter products by category and keyword
  let filtered = allProducts;
  if (selectedCategory) {
    filtered = filtered.filter(
      (product) => product.category === selectedCategory
    );
  }
  if (keyword) {
    filtered = filtered.filter(
      (product) =>
        product.name.toLowerCase().includes(keyword) ||
        product.brand.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword)
    );
  }
  displayProducts(filtered);
}

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products; // Save all products for filtering
  return allProducts;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card${
      selectedProducts.some((p) => p.id === product.id) ? " selected" : ""
    }" 
         data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="toggle-description-btn"
          aria-expanded="false"
          aria-controls="desc-${product.id}"
          type="button">
          View Description
        </button>
        <div class="product-description"
          id="desc-${product.id}"
          aria-hidden="true">
          ${product.description}
        </div>
      </div>
    </div>
  `
    )
    .join("");

  // Add click event listeners to product cards
  const productCards = productsContainer.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      // Prevent toggling selection if clicking the description button
      if (event.target.classList.contains("toggle-description-btn")) return;
      const productId = parseInt(card.getAttribute("data-product-id"));
      const product = products.find((p) => p.id === productId);
      const index = selectedProducts.findIndex((p) => p.id === productId);
      if (index === -1) {
        selectedProducts.push(product);
        card.classList.add("selected");
      } else {
        selectedProducts.splice(index, 1);
        card.classList.remove("selected");
      }
      updateSelectedProductsList();
      saveSelectedProducts();
    });
  });

  // Add event listeners for description toggle buttons
  const descBtns = productsContainer.querySelectorAll(
    ".toggle-description-btn"
  );
  descBtns.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent card selection
      const descId = btn.getAttribute("aria-controls");
      const descDiv = productsContainer.querySelector(`#${descId}`);
      const expanded = btn.getAttribute("aria-expanded") === "true";
      if (expanded) {
        btn.setAttribute("aria-expanded", "false");
        descDiv.setAttribute("aria-hidden", "true");
        descDiv.classList.remove("expanded");
        btn.textContent = "View Description";
      } else {
        btn.setAttribute("aria-expanded", "true");
        descDiv.setAttribute("aria-hidden", "false");
        descDiv.classList.add("expanded");
        btn.textContent = "Hide Description";
      }
    });
  });
}

/* Show selected products with remove button */
function updateSelectedProductsList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected</div>`;
    saveSelectedProducts(); // Save to localStorage
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-item">
        <img src="${product.image}" alt="${product.name}" width="40" height="40">
        <span>${product.name}</span>
        <button class="remove-selected-btn" data-product-id="${product.id}" title="Remove">&times;</button>
      </div>
    `
    )
    .join("");

  // Add event listeners for remove buttons
  const removeBtns = selectedProductsList.querySelectorAll(
    ".remove-selected-btn"
  );
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const productId = parseInt(btn.getAttribute("data-product-id"));
      // Remove from selectedProducts
      selectedProducts = selectedProducts.filter((p) => p.id !== productId);
      // Also update product card visual state
      const card = productsContainer.querySelector(
        `.product-card[data-product-id="${productId}"]`
      );
      if (card) card.classList.remove("selected");
      updateSelectedProductsList();
      saveSelectedProducts(); // Save to localStorage
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  // If allProducts is empty, load them
  if (allProducts.length === 0) {
    await loadProducts();
  }
  filterProducts();
});

// Update: When search input changes, filter products in real-time
productSearch.addEventListener("input", () => {
  filterProducts();
});

// Array to keep track of chat conversation history
let conversationHistory = [
  {
    role: "system",
    content:
      "You are a helpful beauty advisor. Only answer questions about L’Oréal products, skincare, haircare, or routines. If asked about anything else, politely refuse and explain you can only help with beauty advice.",
  },
];

/* Chat form submission handler - now supports conversation history and web citations */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get the user's question from the input field
  const userInput = document.getElementById("userInput").value;

  // Add user's message to conversation history
  conversationHistory.push({
    role: "user",
    content: userInput,
  });

  // Show loading message
  chatWindow.innerHTML = "<div>Thinking...</div>";

  try {
    // Send POST request to Cloudflare Worker with full conversation history
    const response = await fetch(
      "https://loreal-chatbot-worker.sb2318.workers.dev",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: conversationHistory }),
      }
    );

    // Parse the response as JSON
    const data = await response.json();

    // Use 'reply' property if present (for simulated web search/citations)
    const aiReply =
      data.reply ||
      (data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content);

    if (aiReply) {
      // Add AI's reply to conversation history
      conversationHistory.push({
        role: "assistant",
        content: aiReply,
      });

      // Display the full conversation in chatWindow, rendering links
      chatWindow.innerHTML = conversationHistory
        .filter((msg) => msg.role !== "system")
        .map((msg) => {
          if (msg.role === "user") {
            return `<div style="margin-bottom:8px;"><strong>You:</strong> ${msg.content}</div>`;
          } else {
            // Convert markdown links to HTML links for AI replies
            let htmlContent = msg.content.replace(
              /\[([^\]]+)\]\(([^)]+)\)/g,
              '<a href="$2" target="_blank" rel="noopener">$1</a>'
            );
            return `<div style="margin-bottom:16px;"><strong>Advisor:</strong> ${htmlContent}</div>`;
          }
        })
        .join("");
    } else {
      chatWindow.innerHTML =
        "<div>Sorry, I couldn't answer your question. Please try again.</div>";
    }
  } catch (error) {
    chatWindow.innerHTML =
      "<div>There was an error connecting to the AI. Please try again later.</div>";
  }

  // Clear the input field
  document.getElementById("userInput").value = "";
});

// Get reference to the "Generate Routine" button
const generateRoutineBtn = document.getElementById("generateRoutine");

// Add click event listener for Generate Routine button
generateRoutineBtn.addEventListener("click", async () => {
  // Show loading message in chat window
  chatWindow.innerHTML = "<div>Generating your routine...</div>";

  // Gather selected product info (name, brand, category, description)
  const productInfo = selectedProducts.map((product) => {
    return {
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
    };
  });

  // Build messages array for OpenAI API
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful beauty advisor. Only answer questions about L’Oréal products, skincare, haircare, or routines. If asked about anything else, politely refuse and explain you can only help with beauty advice. Suggest a routine using the selected products below. Explain your choices simply for beginners. Also, ensure the instructions provided are formatted in normal text without any special formatting. Make sure to provide clear, step-by-step instructions that are easy to follow.",
    },
    {
      role: "user",
      content: `Here are my selected products:\n${productInfo
        .map(
          (p) => `- ${p.name} (${p.brand}) [${p.category}]: ${p.description}`
        )
        .join("\n")}\nPlease build a routine for me.`,
    },
  ];

  try {
    // Send POST request to Cloudflare Worker
    const response = await fetch(
      "https://loreal-chatbot-worker.sb2318.workers.dev",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No API key needed for Cloudflare Worker
        },
        body: JSON.stringify({ messages }),
      }
    );

    // Parse the response as JSON
    const data = await response.json();

    // Use 'reply' property if present (for simulated web search/citations)
    const aiReply =
      data.reply ||
      (data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content);

    if (aiReply) {
      // Convert markdown links to HTML links for display
      let htmlContent = aiReply.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      );
      chatWindow.innerHTML = `<div>${htmlContent}</div>`;
    } else {
      chatWindow.innerHTML =
        "<div>Sorry, I couldn't generate a routine. Please try again.</div>";
    }
  } catch (error) {
    // Show error message if something goes wrong
    chatWindow.innerHTML =
      "<div>There was an error connecting to the AI. Please try again later.</div>";
  }
});

// Get reference to the RTL toggle button
const rtlToggle = document.getElementById("rtlToggle");

// Add click event listener to toggle RTL layout
rtlToggle.addEventListener("click", () => {
  // Toggle RTL class on body and page-wrapper
  document.body.classList.toggle("rtl");
  document.querySelector(".page-wrapper").classList.toggle("rtl");
  // Update button text
  if (document.body.classList.contains("rtl")) {
    rtlToggle.textContent = "Disable RTL Layout";
  } else {
    rtlToggle.textContent = "Enable RTL Layout";
  }
});

/* On page load, restore selected products from localStorage */
loadSelectedProductsFromStorage();
updateSelectedProductsList();
