const tooltip = d3.select("#tooltip");

// Helper for transforms
const translate = (x, y) => `translate(${x},${y})`;

// --- Global variables to store data and track drawing state ---
let loadedAnimals = null;
let loadedWorld = null;
let countryMapping = null; // Declare countryMapping
const chartsDrawn = {
  worldMapSection: false,
  bubbleChartSection: false,
  barChartsSection: false,
};

// Handle Tabs Switching
const tabButtons = document.querySelectorAll(".tab-btn");
const tabSections = document.querySelectorAll(".tab-section");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;

    // Deactivate all buttons and sections
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabSections.forEach((sec) => sec.classList.remove("active"));

    // Activate clicked button and corresponding section
    btn.classList.add("active");
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      targetSection.classList.add("active");
    } else {
      console.error("Target section not found:", targetId);
      return; // Stop if section not found
    }

    // --- Draw chart if it hasn't been drawn yet ---
    if (
      !chartsDrawn[targetId] &&
      loadedAnimals &&
      loadedWorld &&
      countryMapping
    ) {
      // Check if data is loaded
      console.log(`Drawing chart for: ${targetId}`);
      try {
        if (targetId === "worldMapSection") {
          drawWorldMap(loadedWorld, loadedAnimals, countryMapping);
          chartsDrawn[targetId] = true;
        } else if (targetId === "bubbleChartSection") {
          drawBubbleChart(loadedAnimals);
          chartsDrawn[targetId] = true;
        } else if (targetId === "barChartsSection") {
          drawBarCharts(loadedAnimals);
          chartsDrawn[targetId] = true;
        }
      } catch (error) {
        console.error(`Error drawing chart for ${targetId}:`, error);
        // Optionally display an error message in the UI for that section
        if (targetSection) {
          targetSection.innerHTML = `<p style="color: red;">Could not draw chart. Error: ${error.message}</p>`;
        }
      }
    } else if (!loadedAnimals || !loadedWorld || !countryMapping) {
      console.warn("Attempted to draw chart before data was loaded.");
    }
  });
});

// Load Data
Promise.all([
  d3.csv("data/animals.csv"),
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
  d3.json("data/country-mapping.json"),
])
  .then(([animals, world, countryMappingData]) => {
    console.log("Data loaded successfully.");

    // Store data globally
    loadedAnimals = animals;
    loadedWorld = world;
    countryMapping = countryMappingData; // Store countryMapping

    // --- Data Intro ---
    const totalAnimals = animals.length;
    d3.select("#totalAnimals").text(
      `This dataset contains information about ${totalAnimals} animals.`
    );

    // --- Draw ONLY the initially active chart ---
    const initialActiveTab = document.querySelector(".tab-btn.active");
    if (initialActiveTab) {
      const initialTargetId = initialActiveTab.dataset.target;
      if (
        initialTargetId === "worldMapSection" &&
        loadedWorld &&
        countryMapping
      ) {
        console.log("Drawing initial chart: World Map");
        try {
          drawWorldMap(loadedWorld, loadedAnimals, countryMapping);
          chartsDrawn[initialTargetId] = true;
        } catch (error) {
          console.error("Error drawing initial world map:", error);
          d3.select("#worldMap").html(
            `<p style="color: red;">Could not draw map. Error: ${error.message}</p>`
          );
        }
      }
      // Add similar blocks here if a different tab could be initially active
    } else {
      console.warn("No initially active tab found.");
    }
  })
  .catch((error) => {
    console.error("Error loading data:", error);
    // Display error message to user
    d3.select("main").html(
      `<div style="color: red; text-align: center; padding: 20px;">Failed to load data. Please check the console and data paths. Error: ${error.message}</div>`
    );
  });

// World Map (Add dimension check for robustness)
// World Map (Add dimension check for robustness)
function drawWorldMap(world, data, countryMapping) {
  const container = d3.select("#worldMap");
  if (!container.node()) {
    console.error("World map container not found.");
    return;
  }
  container.select("svg").remove(); // Clear previous SVG
  console.log("Data in drawWorldMap:", data); // Debugging

  const containerRect = container.node().getBoundingClientRect();
  const width = containerRect.width;
  const height = containerRect.height;

  // Check dimensions BEFORE proceeding
  if (width <= 0 || height <= 0) {
    console.warn("WorldMap container has invalid dimensions. Skipping draw.", {
      width,
      height,
    });
    container.html(
      `<p style="color: orange;">Map container not ready. Try resizing or reloading.</p>`
    ); // Placeholder
    return;
  }

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`) // Use viewBox for responsiveness
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("width", "100%")
    .attr("height", "100%");

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 25) // Adjusted Y position
    .attr("text-anchor", "middle")
    .style("font-size", "18px") // Adjusted font size
    .style("fill", "#4ade80")
    .text("Animal Distribution by Location");

  const projection = d3
    .geoNaturalEarth1()
    // Adjust fitSize slightly if needed, ensure topojson feature is valid
    .fitSize(
      [width * 0.95, height * 0.9],
      topojson.feature(world, world.objects.countries)
    );

  const path = d3.geoPath().projection(projection);

  let countries = topojson.feature(world, world.objects.countries).features;

  const countryNameById = new Map();
  countries.forEach((d) => countryNameById.set(d.id, d.properties.name));

  const normalize = (str) => (str ? str.trim().toLowerCase() : "");

  // Initialize country animals map
  const countryAnimals = {};
  countryNameById.forEach((countryName) => {
    countryAnimals[countryName] = [];
  });

  // Map of map country: list of animal names
  data.forEach((d) => {
    if (!d["Countries Found"] || !d.Animal) return;
    const places = d["Countries Found"].split(/,|;/);

    places.forEach((place) => {
      const normalizedPlace = normalize(place);
      for (const mapCountryName of Object.keys(countryMapping)) {
        if (
          countryMapping[mapCountryName].some(
            (mapped) => normalizedPlace === normalize(mapped)
          )
        ) {
          if (countryAnimals.hasOwnProperty(mapCountryName)) {
            countryAnimals[mapCountryName].push(d.Animal);
          }
        }
      }
    });
  });

  const countryCounts = {};
  for (const country in countryAnimals) {
    countryCounts[country] = countryAnimals[country].length;
  }
  console.log("Country Counts:", countryCounts); // Debugging

  const maxCount = d3.max(Object.values(countryCounts)) || 1;
  const opacityScale = d3.scaleLinear().domain([0, maxCount]).range([0.3, 1.0]);
  const color = "#22c55e";

  // Zoom Behavior
  const zoom = d3
    .zoom()
    .scaleExtent([1, 8]) // Optional: Limit zoom level
    .on("zoom", (event) => {
      mapGroup.attr("transform", event.transform);
    });

  const mapGroup = svg
    .append("g")
    .attr("transform", translate(0, 30))
    .call(zoom);

  mapGroup
    .selectAll("path")
    .data(countries)
    .join("path")
    .attr("d", path)
    .attr("fill", (d) => {
      const count = countryCounts[d.properties.name] || 0;
      return count > 0 ? color : "#222";
    })
    .attr("opacity", (d) => {
      const count = countryCounts[d.properties.name] || 0;
      return count > 0 ? opacityScale(count) : 1;
    })
    .attr("stroke", "#666")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1.5);
      const countryName = d.properties.name;
      const count = countryCounts[countryName] || 0;
      tooltip
        .style("display", "block")
        .html(`<b>${countryName}</b><br>Total Animals: ${count}`); // Changed to "Total Animals"
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "#666").attr("stroke-width", 0.5);
      tooltip.style("display", "none");
    })
    .on("click", (event, d) => {
      const countryName = d.properties.name;
      const animals = countryAnimals[countryName] || []; // Get the array
      //const animals = Array.from(animalsSet).sort();
      const listContainer = d3.select("#familyList"); // Renamed variable for clarity
      listContainer.html(`<h3>${countryName}</h3>`);
      if (animals.length > 0) {
        const ul = listContainer.append("ul");
        animals.forEach((a) => {
          ul.append("li").text(a);
        });
      } else {
        listContainer
          .append("p")
          .text("No specific animals listed for this country in the dataset.");
      }
    });

  // --- Legend ---
  const legendWidth = 200;
  const legendHeight = 80;
  const legendX = 20;
  const legendY = height - legendHeight - 10;

  const legend = svg.append("g").attr("transform", translate(legendX, legendY));

  legend
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "rgba(0,0,0,0.3)")
    .attr("rx", 5);

  legend
    .append("text")
    .attr("x", legendWidth / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("fill", "#ccc")
    .style("font-size", "15px")
    .text("Animal Density");

  const legendScale = d3
    .scaleLinear()
    .domain([0.3, 1.0])
    .range([0, legendWidth - 30]);
  const legendAxis = d3
    .axisBottom(legendScale)
    .ticks(3)
    .tickFormat((d, i) => ["Low", "Moderate", "High"][i]);

  const legendGroup = legend.append("g").attr("transform", translate(15, 30));

  const gradient = legendGroup
    .append("defs")
    .append("linearGradient")
    .attr("id", "opacityGradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%");

  gradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", color)
    .attr("stop-opacity", 0.3);
  gradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", color)
    .attr("stop-opacity", 1.0);

  legendGroup
    .append("rect")
    .attr("width", legendWidth - 30)
    .attr("height", 10)
    .style("fill", "url(#opacityGradient)");

  legendGroup
    .append("g")
    .attr("transform", translate(0, 10))
    .call(legendAxis)
    .selectAll("text")
    .style("font-size", "9px");
  // Add zoom behavior to the map
}
// Bubble Chart (Add dimension check)
// Bubble Chart (Add dimension check and text force simulation)
function drawBubbleChart(data) {
  const container = d3.select("#bubbleChart");
  if (!container.node()) {
    console.error("Bubble chart container not found.");
    return;
  }
  container.select("svg").remove(); // Clear previous

  const containerRect = container.node().getBoundingClientRect();
  const width = containerRect.width;
  const height = containerRect.height;

  if (width <= 0 || height <= 0) {
    console.warn(
      "BubbleChart container has invalid dimensions. Skipping draw.",
      { width, height }
    );
    container.html(
      '<p style="color: orange;">Chart container not ready. Try resizing or reloading.</p>'
    );
    return;
  }

  // --- Define Oval Shape Parameters ---
  const ovalPadding = 0.05; // 5% padding from edges
  const targetOvalWidth = width * (1 - ovalPadding * 2);
  const targetOvalHeight = height * (1 - ovalPadding * 2) * 0.7; // Make it wider than tall (adjust this ratio)
  const centerX = width / 2;
  const centerY = height / 2;
  const semiAxisX = targetOvalWidth / 2;
  const semiAxisY = targetOvalHeight / 2;

  // --- Pack Layout (for radii and initial positions) ---
  const familyGroups = d3.groups(data, (d) => d.Family || "Unknown");
  const familyData = familyGroups.map(([family, animals]) => ({
    id: family,
    value: animals.length,
    animals: animals.map((a) => a.Animal).sort(),
    family: family,
  }));

  const pack = d3.pack().size([width, height]).padding(5);

  const root = d3.hierarchy({ children: familyData }).sum((d) => d.value);

  const nodes = pack(root).leaves(); // These are the bubble nodes

  // --- Adjust Radius Scale ---
  const maxBubbleRadius = 100;
  const minBubbleRadius = 20;
  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(nodes, (d) => d.value)]) // Use d.value from nodes
    .range([minBubbleRadius, maxBubbleRadius]);

  // --- Force Simulation for Bubble Positioning ---
  const bubbleSimulation = d3
    .forceSimulation(nodes)
    .force(
      "collide",
      d3
        .forceCollide()
        .radius((d) => radiusScale(d.value) + 1) // Use radiusScale
        .strength(0.7)
    ) // Prevent overlap
    .force("x", d3.forceX(centerX).strength(0.04 * (semiAxisY / semiAxisX))) // Weaker if wider
    .force("y", d3.forceY(centerY).strength(0.04 * (semiAxisX / semiAxisY))) // Stronger if wider
    .stop();

  // Run the simulation for a fixed number of ticks
  const numTicks = 200;
  for (let i = 0; i < numTicks; ++i) {
    bubbleSimulation.tick();
  }

  // --- Color Scale ---
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  // --- SVG Setup ---
  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("width", "100%")
    .attr("height", "100%")
    .style("cursor", "grab");

  const zoomGroup = svg.append("g"); // Group for zoomable content

  // --- Draw Bubbles ---
  const bubbleGroups = zoomGroup
    .selectAll(".bubble-group")
    .data(nodes)
    .join("g")
    .attr("class", "bubble-group")
    .attr("transform", (d) => translate(d.x, d.y)); // Position the group at the bubble center

  bubbleGroups
    .append("circle")
    .attr("r", (d) => radiusScale(d.value)) // Use radiusScale
    .attr("fill", (d) => colorScale(d.data.family))
    .attr("stroke", "#111")
    .attr("stroke-width", 1)
    .on("mouseover", (event, d) => {
      // Tooltip on circle
      tooltip
        .style("display", "block")
        .html(
          `<b>${d.data.family}</b> (${
            d.data.value
          } animals)<hr style="margin: 2px 0; border-color: #555;">${d.data.animals.join(
            "<br>"
          )}`
        );
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", () => tooltip.style("display", "none"));

  // --- Prepare Data for Text Simulation ---
  const textNodesData = nodes.map((node) => ({
    id: node.data.id + "-text", // Unique ID for text node
    fx: 0, // Initial position relative to bubble center (group origin)
    fy: 0,
    x: 0, // Simulation will control these
    y: 0,
    bubble_r: radiusScale(node.value), // Use radiusScale
    family: node.data.family,
    fontSize: Math.max(10, Math.min(20, radiusScale(node.value) / 3)), // Calculate font size once
  }));

  // --- Draw Text Elements ---
  const textElements = bubbleGroups
    .append("text")
    .data(textNodesData) // Bind text data
    .attr("text-anchor", "middle")
    .attr("dy", ".35em") // Vertical alignment
    .style("font-size", (d) => d.fontSize + "px")
    .style("fill", "#fff")
    .style("pointer-events", "none") // Ignore text for mouse events on circle
    .text((d) => d.family);

  // --- Force Simulation for Text ---
  const simulation = d3
    .forceSimulation(textNodesData)
    // Pull text towards the center (0,0) of its bubble group
    .force("x", d3.forceX(0).strength(0.03))
    .force("y", d3.forceY(0).strength(0.03))
    // Prevent text labels from overlapping significantly
    .force(
      "collide",
      d3
        .forceCollide()
        .radius((d) => d.fontSize * 1.1)
        .strength(0.6)
    ) // Radius based on font size
    .on("tick", ticked);

  // --- Tick Function ---
  function ticked() {
    textElements
      .each(function (d) {
        // Custom boundary force: Keep text inside its bubble radius
        const padding = d.fontSize * 0.5; // Small padding from edge
        const distance = Math.sqrt(d.x * d.x + d.y * d.y);
        const maxDistance = d.bubble_r - padding;

        if (distance > maxDistance) {
          // If outside, push back towards center
          const scale = maxDistance / distance;
          d.x *= scale;
          d.y *= scale;
        }
      })
      // Update text positions
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y);
  }

  // Stop simulation after a while (optional, good for static layouts)
  // setTimeout(() => {
  //     simulation.stop();
  //     console.log("Text simulation stopped.");
  // }, 4000); // Stop after 4 seconds

  // --- Zoom ---
  const zoom = d3
    .zoom()
    .scaleExtent([0.3, 12]) // Adjusted min scale slightly
    .on("zoom", (event) => {
      zoomGroup.attr("transform", event.transform);
    });

  svg.call(zoom);

  // Optional: Initial zoom fit (uncomment if needed)
  const bounds = zoomGroup.node().getBBox();
  const fullWidth = bounds.width;
  const fullHeight = bounds.height;
  const midX = bounds.x + fullWidth / 2 + 90;
  const midY = bounds.y + fullHeight / 2;
  if (fullWidth && fullHeight && width && height) {
    const scale = Math.min(
      8,
      0.9 / Math.max(fullWidth / width, fullHeight / height)
    );
    const translate = [width / 2 - scale * midX, height / 2 - scale * midY];
    svg
      .transition()
      .duration(500)
      .call(
        zoom.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      );
  }

  // --- Legend for Size ---
  const legendValues = [1, 2, 4, 6];

  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 200}, 20)`); // Position at top right

  legend
    .append("text")
    .attr("x", 50)
    .attr("y", 20)
    .style("font-size", "20px")
    .style("fill", "#ccc")
    .text("Family Size:");

  const legendYOffset = 100; // Starting vertical offset
  legendValues.forEach((value, i) => {
    const radius = radiusScale(value);
    const yOffset = legendYOffset + i * (radius + 60); // Position them vertically
    const xOffset = 100;

    legend
      .append("circle")
      .attr("cx", xOffset)
      .attr("cy", yOffset)
      .attr("r", radius)
      .style("fill", "rgba(255,255,255,0.2)") // Transparent white
      .attr("stroke", "#888");

    legend
      .append("text")
      .attr("x", xOffset - 5)
      .attr("y", yOffset + 5)
      .style("font-size", "16px")
      .style("fill", "#ccc")
      .attr("text-anchor", "start")
      .text(Math.round(value));
  });
}
// Bar Charts (Main function - no changes needed here)
// Helper function (already present)
const parseRange = (val) => {
  if (!val || typeof val !== "string") return null;
  val = val.replace(/,/g, "").trim().toLowerCase();
  if (val === "not applicable" || val === "") return null;
  if (val.startsWith("up to")) {
    const match = val.match(/([\d\.]+)/);
    return match ? parseFloat(match[1]) : null;
  }
  if (val.includes("ton")) {
    const match = val.match(/([\d\.]+)/);
    return match ? parseFloat(match[1]) * 1000 : null;
  }
  if (val.includes("range")) {
    const parts = val.split("-").map((d) => parseFloat(d.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return (parts[0] + parts[1]) / 2;
    }
  }
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
};

// Single Bar Chart (Add dimension check)
// Single Bar Chart (Add dimension check)
function drawSingleBarChart(
  containerId,
  chartData,
  metricKey,
  yAxisLabel,
  barColor,
  tooltipUnit,
  maxValue
) {
  const container = d3.select(containerId);
  if (!container.node()) {
    console.error(`Bar chart container ${containerId} not found.`);
    return;
  }
  container.select("svg").remove(); // Clear previous SVG

  const containerRect = container.node().getBoundingClientRect();
  const margin = { top: 20, right: 60, bottom: 60, left: 100 }; // Adjusted margins
  const width = containerRect.width - margin.left - margin.right;
  const height = containerRect.height - margin.top - margin.bottom;

  // Check dimensions BEFORE proceeding
  if (width <= 0 || height <= 0) {
    console.warn(
      `BarChart container ${containerId} has invalid dimensions. Skipping draw.`,
      { width, height }
    );
    container.html(
      '<p style="color: orange;">Chart container not ready. Try resizing or reloading.</p>'
    ); // Placeholder
    return;
  }

  // --- Rest of the single bar chart drawing code ---
  // (Keep the existing single bar chart code from the previous correct version here)
  // Make sure it uses the calculated width and height variables.
  // Example start:
  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("width", "100%")
    .attr("height", "100%")
    .append("g")
    .attr("transform", translate(margin.left, margin.top));

  const y = d3
    .scaleBand()
    .domain(chartData.map((d) => d.diet))
    .range([0, height])
    .padding(0.2);

  // Logarithmic Scale
  const x = d3
    .scaleLog() // Use d3.scaleLog() instead of scaleLinear
    .domain([0.1, maxValue]) // Set the minimum to a small non-zero value
    .range([0, width]);

  svg
    .append("g")
    .attr("class", "axis y-axis")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em");

  svg
    .append("g")
    .attr("class", "axis x-axis")
    .attr("transform", translate(0, height))
    .call(d3.axisBottom(x).ticks(8, ".1f")) // Force 6 ticks
    .call((g) => g.select(".domain").remove());

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5) // Position at the bottom
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#ccc")
    .text(yAxisLabel);

  // Create bars
  svg
    .selectAll(".bar")
    .data(chartData)
    .join("rect")
    .attr("class", "bar")
    .attr("y", (d) => y(d.diet))
    .attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", (d) => x(d[metricKey]))
    .attr("fill", barColor)
    .on("mouseover", (event, d) => {
      tooltip
        .style("display", "block")
        .html(
          `<b>${d.diet}</b><br>${yAxisLabel}: ${
            d[metricKey] ? d[metricKey].toFixed(1) : "N/A"
          } ${tooltipUnit}`
        );
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("display", "none");
    });

  // Add text labels to the right of each bar
  svg
    .selectAll(".bar-label")
    .data(chartData)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", (d) => x(d[metricKey]) + 5) // Position to the right of the bar
    .attr("y", (d) => y(d.diet) + y.bandwidth() / 2)
    .attr("dy", ".35em") // Vertically center the text
    .attr("text-anchor", "start") // Align text to the start
    .style("font-size", "10px")
    .style("fill", "#fff")
    .text((d) => d[metricKey].toFixed(1));
  // --- End of single bar chart drawing code ---
}

function drawBarCharts(data) {
  const dietGroups = d3.groups(data, (d) => d.Diet || "Unknown");
  console.log(dietGroups); // Log the diet groups for debugging
  const processedData = dietGroups
    .map(([diet, animals]) => {
      const heights = animals
        .map((d) => parseRange(d["Height (cm)"]))
        .filter((v) => v !== null && !isNaN(v));
      const weights = animals
        .map((d) => parseRange(d["Weight (kg)"]))
        .filter((v) => v !== null && !isNaN(v));
      const lifespans = animals
        .map((d) => parseRange(d["Lifespan (years)"]))
        .filter((v) => v !== null && !isNaN(v));
      console.log(lifespans);
      return {
        diet: diet,
        heights: heights, // Store the arrays for ratio calculation
        weights: weights,
        lifespans: lifespans,
        avgHeight: heights.length > 0 ? d3.mean(heights) : 0, // Keep for scaling
        avgWeight: weights.length > 0 ? d3.mean(weights) : 0, // Keep for scaling
        avgLifespan: lifespans.length > 0 ? d3.mean(lifespans) : 0, // Keep for scaling
      };
    })
    .filter((d) => d.diet !== "Unknown");

  processedData.sort((a, b) => d3.ascending(a.diet, b.diet));

  // Calculate totals for ratios
  const totalHeights = d3.sum(processedData, (d) => d.heights.length);
  const totalWeights = d3.sum(processedData, (d) => d.weights.length);
  const totalLifespans = d3.sum(processedData, (d) => d.lifespans.length);

  // Calculate ratios
  const ratioData = processedData.map((d) => ({
    diet: d.diet,
    heightRatio: totalHeights > 0 ? d.heights.length / totalHeights : 0,
    weightRatio: totalWeights > 0 ? d.weights.length / totalWeights : 0,
    lifespanRatio: totalLifespans > 0 ? d.lifespans.length / totalLifespans : 0,
    maxHeight: d3.max(processedData, (d) => d.avgHeight),
    maxWeight: d3.max(processedData, (d) => d.avgWeight),
    maxLifespan: d3.max(processedData, (d) => d.avgLifespan),
    avgHeight: d.avgHeight,
    avgWeight: d.avgWeight,
    avgLifespan: d.avgLifespan,
  }));

  // Call the drawing function for each individual bar chart
  // These will also check dimensions internally now
  drawSingleBarChart(
    "#heightBarChart",
    ratioData,
    "avgHeight",
    "Average Height (cm)",
    "#22c55e",
    "cm",
    d3.max(processedData, (d) => d.avgHeight)
  ); // Pass max value
  drawSingleBarChart(
    "#weightBarChart",
    ratioData,
    "avgWeight",
    "Average Weight (kg)",
    "#4ade80",
    "kg",
    d3.max(processedData, (d) => d.avgWeight)
  ); // Pass max value
  drawSingleBarChart(
    "#lifespanBarChart",
    ratioData,
    "avgLifespan",
    "Average Lifespan (years)",
    "#86efac",
    "years",
    d3.max(processedData, (d) => d.avgLifespan)
  ); // Pass max value
}
