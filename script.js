// Initialize variables
let scroller, figure, tooltip, tooltipVisible = false, currentStep = 0;
let swayData = { ECR: {}, ECN: {} }; // Stores loaded sway data for each participant
let selectedParticipant = 1; // Default participant
let isPlaying = false;
let animationTimer;
let currentTimeIndex = 0;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async function () {
    scroller = scrollama();
    
    // Create tooltip with explicit styling
    tooltip = d3.select("body").append("div")
        .attr("id", "tooltip")
        .classed("tooltip", true)
        .classed("hidden", true)
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("z-index", 1000)
        .style("display", "none");

    await loadData(); // Load data first
    setupVisualization();
    setupParticipantSelector();
    setupAnimationControls(); // Setup animation controls

    // Setup scroller AFTER visualization is ready
    scroller
        .setup({
            step: ".step",
            offset: 0.5,
            debug: false
        })
        .onStepEnter(handleStepEnter)
        .onStepExit(handleStepExit);

    // Handle window resize
    window.addEventListener("resize", scroller.resize);
});

// ** Load and process data **
async function loadData() {
    const filePaths = { ECR: "./data/ECR_All.csv", ECN: "./data/ecn_aggregate.csv" };
    
    for (let condition in filePaths) {
        try {
            const rawData = await d3.csv(filePaths[condition]);
            swayData[condition] = {};

            rawData.forEach(d => {
                let participant = parseInt(d.subject_id, 10);
                let time = parseFloat(d.Second);
                let copX = parseFloat(d.CoPx);
                let copY = parseFloat(d.CoPy);

                if (!isNaN(participant) && !isNaN(time) && !isNaN(copX) && !isNaN(copY)) {
                    if (!swayData[condition][participant]) {
                        swayData[condition][participant] = [];
                    }
                    swayData[condition][participant].push({ time, copX, copY });
                }
            });

            // Sort data by time for each participant
            for (let participant in swayData[condition]) {
                swayData[condition][participant].sort((a, b) => a.time - b.time);
                
                // Calculate average COP position for each participant
                const avgX = d3.mean(swayData[condition][participant], d => d.copX);
                const avgY = d3.mean(swayData[condition][participant], d => d.copY);
                
                // Store the average values
                swayData[condition][participant].avgX = avgX;
                swayData[condition][participant].avgY = avgY;
            }

            console.log(`✅ Loaded ${condition} data:`, swayData[condition]);
        } catch (error) {
            console.warn(`⚠️ File not found: ${filePaths[condition]} (Skipping)`);
        }
    }
}

// ** Setup Visualization **
function setupVisualization() {
    const container = d3.select("#visualization");
    const width = container.node().getBoundingClientRect().width;
    const height = container.node().getBoundingClientRect().height;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Create a boundary box instead of a balance platform
    // This box will represent the area within which the figure can move
    // Moving the box up by 50px to better center the figure within it
    const boxSize = 300; 
    const boxYOffset = -22; 
    
    g.append("rect")
        .attr("class", "boundary-box")
        .attr("x", -boxSize/2)
        .attr("y", -boxSize/2 + boxYOffset) // Offset the box upward
        .attr("width", boxSize)
        .attr("height", boxSize)
        .attr("rx", 5)
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
    
    // Add a center marker to indicate the origin
    g.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 3)
        .attr("fill", "#999");

    // Human figure - initially positioned at (0,0) which is the center
    figure = g.append("g")
        .attr("class", "human-figure")
        .attr("transform", "translate(0, 0)") // Start at origin
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

    // Head
    figure.append('circle').attr('cx', 0).attr('cy', -120).attr('r', 25).attr('fill', '#3498db');
    // Body
    figure.append('rect').attr('x', -15).attr('y', -95).attr('width', 30).attr('height', 100).attr('fill', '#3498db');
    // Arms
    figure.append('line').attr('x1', -15).attr('y1', -70).attr('x2', -40).attr('y2', -30).attr('stroke', '#3498db').attr('stroke-width', 10);
    figure.append('line').attr('x1', 15).attr('y1', -70).attr('x2', 40).attr('y2', -30).attr('stroke', '#3498db').attr('stroke-width', 10);
    // Legs - making them longer but not as long as before
    figure.append('line').attr('x1', -10).attr('y1', 5).attr('x2', -20).attr('y2', 100).attr('stroke', '#3498db').attr('stroke-width', 15);
    figure.append('line').attr('x1', 10).attr('y1', 5).attr('x2', 20).attr('y2', 100).attr('stroke', '#3498db').attr('stroke-width', 15);
}

// ** Animation Controls Setup **
function setupAnimationControls() {
    const controls = d3.select("#animation-controls");
    
    // Make the existing controls a fixed footer
    controls
        .style("position", "fixed")
        .style("bottom", "0")
        .style("left", "0")
        .style("width", "100%")
        .style("background-color", "rgba(255, 255, 255, 0.9)")
        .style("padding", "10px 20px")
        .style("box-shadow", "0 -2px 10px rgba(0, 0, 0, 0.1)")
        .style("z-index", "1000")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center");
    
    // Style the inner elements for better appearance in the footer
    controls.select("#play-button")
        .style("margin-right", "15px")
        .style("padding", "8px 15px")
        .style("background", "#3498db")
        .style("color", "white")
        .style("border", "none")
        .style("border-radius", "4px")
        .style("cursor", "pointer");
    
    controls.select("#time-slider")
        .style("flex-grow", "1")
        .style("margin", "0 10px");
    
    controls.select("#time-display")
        .style("min-width", "70px")
        .style("text-align", "right");
    
    // Play/Pause button
    controls.select("#play-button").on("click", togglePlayPause);
    
    // Time slider
    controls.select("#time-slider").on("input", function() {
        pauseAnimation();
        currentTimeIndex = parseInt(this.value);
        updateFigurePosition();
    });
    
    // Add some padding to the bottom of the page to account for the fixed footer
    d3.select("body").style("padding-bottom", "60px");
}

// ** Toggle Play/Pause **
function togglePlayPause() {
    const playButton = d3.select("#play-button");
    
    if (isPlaying) {
        pauseAnimation();
        playButton.html('<i class="fas fa-play"></i> Play');
    } else {
        startAnimation();
        playButton.html('<i class="fas fa-pause"></i> Pause');
    }
}

// ** Start Animation **
function startAnimation() {
    if (isPlaying) return;
    isPlaying = true;
    
    const condition = currentStep === 2 ? "ECR" : "ECN";
    const participantData = swayData[condition][selectedParticipant];
    
    if (!participantData || participantData.length === 0) return;
    
    // If we're at the beginning, start from the origin
    if (currentTimeIndex === 0) {
        figure.attr("transform", "translate(0, 0)");
    }
    
    const maxTime = 60; // 60 seconds animation
    const fps = 30; // frames per second
    const interval = 1000 / fps;
    
    animationTimer = setInterval(() => {
        currentTimeIndex++;
        
        // Update slider position
        d3.select("#time-slider")
            .property("value", currentTimeIndex)
            .property("max", maxTime * fps);
            
        // Update time display
        const seconds = Math.floor(currentTimeIndex / fps);
        d3.select("#time-display").text(`Time: ${seconds.toFixed(0)}s`);
        
        if (currentTimeIndex >= maxTime * fps) {
            currentTimeIndex = 0;
        }
        
        updateFigurePosition();
    }, interval);
}

// ** Pause Animation **
function pauseAnimation() {
    if (!isPlaying) return;
    isPlaying = false;
    clearInterval(animationTimer);
}

// ** Update Figure Position based on current time **
function updateFigurePosition() {
    const condition = currentStep === 2 ? "ECR" : "ECN";
    const participantData = swayData[condition][selectedParticipant];
    
    if (!participantData || participantData.length === 0) return;
    
    // If time index is 0 and not playing, keep figure at origin
    if (currentTimeIndex === 0 && !isPlaying) {
        figure.transition()
            .duration(300)
            .attr("transform", "translate(0, 0)");
        return;
    }
    
    // Convert current animation frame to seconds
    const fps = 30;
    const currentTime = currentTimeIndex / fps;
    
    // Find the closest data point to the current time
    const dataPoint = findDataPointByTime(participantData, currentTime);
    
    if (!dataPoint) return;
    
    // Scale factor for visualization (adjust as needed)
    // Using a smaller scale factor to keep movement within the box
    const scaleFactor = 2500;
    
    // Calculate the position relative to the average (centering the sway around origin)
    const xOffset = (dataPoint.copX - participantData.avgX) * scaleFactor;
    const yOffset = (dataPoint.copY - participantData.avgY) * scaleFactor;
    
    // Update figure position
    figure.transition()
        .duration(30) // Quick transition for smooth animation
        .attr("transform", `translate(${xOffset}, ${yOffset})`);
    
    // Update tooltip if it's visible
    if (tooltipVisible) {
        updateTooltip(condition, dataPoint);
    }
}

// ** Find the closest data point to a given time **
function findDataPointByTime(data, targetTime) {
    if (!data || data.length === 0) return null;
    
    // If time is beyond our data, return the last point
    if (targetTime >= data[data.length - 1].time) {
        return data[data.length - 1];
    }
    
    // If time is before our data, return the first point
    if (targetTime <= data[0].time) {
        return data[0];
    }
    
    // Find closest point by binary search
    let left = 0;
    let right = data.length - 1;
    
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        
        if (data[mid].time === targetTime) {
            return data[mid];
        }
        
        if (data[mid].time < targetTime) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    // Get the two closest points
    const beforeIndex = Math.max(0, right);
    const afterIndex = Math.min(data.length - 1, left);
    
    // Determine which is closer
    const beforeDiff = Math.abs(data[beforeIndex].time - targetTime);
    const afterDiff = Math.abs(data[afterIndex].time - targetTime);
    
    return beforeDiff < afterDiff ? data[beforeIndex] : data[afterIndex];
}

// ** Scroll Step Handlers **
// Add a new function to perform the permutation test and create the visualization
// ** Setup Permutation Test **
function setupPermutationTest() {
    // Clear any existing visualization first
    d3.select("#permutation-test-container").selectAll("*").remove();
    
    // Create a container for the permutation test visualization
    const container = d3.select("#permutation-test-container");
    const width = container.node().getBoundingClientRect().width;
    const height = 400; // Fixed height for the histogram
    
    // Create SVG
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
    
    // Add a group for the histogram
    const g = svg.append("g")
        .attr("transform", `translate(50, 50)`); // Increased top margin from 20 to 50
    
    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25) // Moved up from 30 to 25
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Permutation Test: Absolute Difference in Mean CoPx");
    
    // Add subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 45) // Moved up from 50 to 45
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("The observed difference shows the mean difference between the participants' medial lateral center of pressure");
    
    // Extract raw CoPx values for both conditions (not participant means)
    const ecrValues = [];
    const ecnValues = [];
    
    // Extract all CoPx values for both conditions
    for (let participant in swayData.ECR) {
        if (swayData.ECR[participant] && swayData.ECR[participant].length > 0) {
            swayData.ECR[participant].forEach(d => {
                ecrValues.push(d.copX);
            });
        }
    }
    
    for (let participant in swayData.ECN) {
        if (swayData.ECN[participant] && swayData.ECN[participant].length > 0) {
            swayData.ECN[participant].forEach(d => {
                ecnValues.push(d.copX);
            });
        }
    }
    
    // Limit to same length if needed (like in Python code)
    const minLength = Math.min(ecrValues.length, ecnValues.length);
    const ecrTrimmed = ecrValues.slice(0, minLength);
    const ecnTrimmed = ecnValues.slice(0, minLength);
    
    // Calculate observed statistic: absolute mean difference between conditions
    const observedDifferences = [];
    for (let i = 0; i < minLength; i++) {
        observedDifferences.push(ecnTrimmed[i] - ecrTrimmed[i]);
    }
    
    const observedStatistic = Math.abs(d3.mean(observedDifferences));
    
    // Perform permutation test
    const numPermutations = 1000;
    const permutationResults = [];
    
    // Combine data for permutation
    const allData = [...ecrTrimmed, ...ecnTrimmed];
    
    // Run permutation test
    for (let i = 0; i < numPermutations; i++) {
        // Shuffle the data
        const shuffled = [...allData].sort(() => Math.random() - 0.5);
        
        // Split into two groups of original sizes
        const perm_ecn = shuffled.slice(0, minLength);
        const perm_ecr = shuffled.slice(minLength, 2 * minLength);
        
        // Calculate differences between values
        const permDifferences = [];
        for (let j = 0; j < minLength; j++) {
            permDifferences.push(perm_ecn[j] - perm_ecr[j]);
        }
        
        // Calculate absolute mean of differences
        permutationResults.push(Math.abs(d3.mean(permDifferences)));
    }
    
    // Create histogram
    const histogramWidth = width - 100; // Adjust for margins
    const histogramHeight = height - 100; // Adjust for margins
    
    // Calculate histogram bins
    const bins = d3.histogram()
        .domain([0, d3.max(permutationResults) * 1.1]) // Add some padding
        .thresholds(30) // Match Python's 30 bins
        (permutationResults);
    
    // Set up scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.x1)])
        .range([0, histogramWidth]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([histogramHeight, 0]);
    
    // Add x-axis
    g.append("g")
        .attr("transform", `translate(0, ${histogramHeight})`)
        .call(d3.axisBottom(x).ticks(10))
        .append("text")
        .attr("x", histogramWidth / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .text("Mean Difference in CoPx");
    
    // Add y-axis
    g.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -histogramHeight / 2)
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .text("Frequency");
    
    // Create bars
    g.selectAll(".bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.x0))
        .attr("y", d => y(d.length))
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("height", d => histogramHeight - y(d.length))
        .attr("fill", "#69b3a2")
        .attr("opacity", 0.7);
    
    // Add KDE curve (similar to sns.histplot with kde=True)
    const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(100));
    const density = kde(permutationResults);
    
    // Scale density values to match histogram height
    const densityMax = d3.max(density, d => d[1]);
    const histMax = d3.max(bins, d => d.length);
    const densityScale = histMax / densityMax;
    
    // Create the KDE line
    const line = d3.line()
        .curve(d3.curveBasis)
        .x(d => x(d[0]))
        .y(d => y(d[1] * densityScale));
    
    g.append("path")
        .datum(density)
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("d", line);
    
    // Add line for observed statistic
    g.append("line")
        .attr("x1", x(observedStatistic))
        .attr("x2", x(observedStatistic))
        .attr("y1", 0)
        .attr("y2", histogramHeight)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
    
    // Calculate p-value (matching Python implementation)
    const pValue = permutationResults.filter(d => d >= observedStatistic).length / numPermutations;
    
    // Add annotation with arrow (similar to Python's annotate)
    const arrowX = observedStatistic * 0.6;
    const arrowY = y(d3.max(bins, d => d.length) * 0.8);
    
    // Add arrow
    g.append("path")
        .attr("d", `M${x(arrowX)},${arrowY} L${x(observedStatistic)},${y(2)}`)
        .attr("stroke", "red")
        .attr("fill", "none")
        .attr("marker-end", "url(#arrow)");
    
    // Add arrowhead marker definition
    svg.append("defs").append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 5)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "red");
    
    // Add annotation text
    g.append("text")
        .attr("x", x(arrowX))
        .attr("y", arrowY - 15)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .style("font-size", "10px")
        .text(`Observed Diff: ${observedStatistic.toFixed(3)}`);
    
    g.append("text")
        .attr("x", x(arrowX))
        .attr("y", arrowY)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .style("font-size", "10px")
        .text(`P-Value: ${pValue.toFixed(3)}`);
    
    // Add observed label
    g.append("text")
        .attr("x", x(observedStatistic))
        .attr("y", histogramHeight + 30)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .style("font-weight", "bold")
        .text("Observed");
}

// Helper functions for KDE
function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
}

function kernelEpanechnikov(k) {
    return function(v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}

// Modify the handleStepEnter function to properly handle the permutation test
function handleStepEnter(response) {
    currentStep = response.index + 1;
    d3.selectAll(".step").classed("is-active", false);
    d3.select(response.element).classed("is-active", true);
    
    // Reset animation when changing steps
    pauseAnimation();
    currentTimeIndex = 0;
    d3.select("#play-button").html('<i class="fas fa-play"></i> Play');
    d3.select("#time-slider").property("value", 0);
    d3.select("#time-display").text("Time: 0s");
    
    // Reset figure to origin
    figure.transition()
        .duration(300)
        .attr("transform", "translate(0, 0)");
    
    // Call updateVisualization but don't update figure position
    updateVisualization(currentStep);
    
    // If we're on the permutation test step
    if (currentStep === 3) {
        const container = d3.select("#permutation-test-container");
        
        // First, create a visualization container if it doesn't exist
        if (container.select("#viz-container").empty()) {
            container.append("div")
                .attr("id", "viz-container");
        }
        
        // Then add the button if it doesn't exist
        if (container.select("#redo-permutation").empty()) {
            container.append("button")
                .attr("id", "redo-permutation")
                .style("display", "block")
                .style("margin", "20px auto")
                .style("padding", "8px 15px")
                .style("background", "#3498db")
                .style("color", "white")
                .style("border", "none")
                .style("border-radius", "4px")
                .style("cursor", "pointer")
                .text("Run New Permutation Test")
                .on("click", function() {
                    // Only remove the visualization, not the button
                    container.select("#viz-container").selectAll("*").remove();
                    runPermutationTest();
                });
        }
        
        // Run the test if visualization doesn't exist yet
        if (container.select("#viz-container svg").empty()) {
            runPermutationTest();
        }
    }
}

// Create a separate function to run the permutation test and update the visualization
// Complete the runPermutationTest function with all the necessary code
function runPermutationTest() {
    // Get the visualization container
    const vizContainer = d3.select("#permutation-test-container").select("#viz-container");
    
    // Clear any existing content
    vizContainer.selectAll("*").remove();
    
    // Get dimensions
    const width = vizContainer.node().getBoundingClientRect().width || 
                  d3.select("#permutation-test-container").node().getBoundingClientRect().width;
    const height = 400;
    
    // Create SVG in the visualization container
    const svg = vizContainer.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
    
    // Add a group for the histogram
    const g = svg.append("g")
        .attr("transform", `translate(50, 50)`);
    
    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Permutation Test: Absolute Difference in Mean CoPx");
    
    // Add subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("The observed difference shows the mean difference between the participants' medial lateral center of pressure");
    
    // Extract raw CoPx values for both conditions (not participant means)
    const ecrValues = [];
    const ecnValues = [];
    
    // Extract all CoPx values for both conditions
    for (let participant in swayData.ECR) {
        if (swayData.ECR[participant] && swayData.ECR[participant].length > 0) {
            swayData.ECR[participant].forEach(d => {
                ecrValues.push(d.copX);
            });
        }
    }
    
    for (let participant in swayData.ECN) {
        if (swayData.ECN[participant] && swayData.ECN[participant].length > 0) {
            swayData.ECN[participant].forEach(d => {
                ecnValues.push(d.copX);
            });
        }
    }
    
    // Limit to same length if needed (like in Python code)
    const minLength = Math.min(ecrValues.length, ecnValues.length);
    const ecrTrimmed = ecrValues.slice(0, minLength);
    const ecnTrimmed = ecnValues.slice(0, minLength);
    
    // Calculate observed statistic: absolute mean difference between conditions
    const observedDifferences = [];
    for (let i = 0; i < minLength; i++) {
        observedDifferences.push(ecnTrimmed[i] - ecrTrimmed[i]);
    }
    
    const observedStatistic = Math.abs(d3.mean(observedDifferences));
    
    // Perform permutation test
    const numPermutations = 1000;
    const permutationResults = [];
    
    // Combine data for permutation
    const allData = [...ecrTrimmed, ...ecnTrimmed];
    
    // Run permutation test
    for (let i = 0; i < numPermutations; i++) {
        // Shuffle the data
        const shuffled = [...allData].sort(() => Math.random() - 0.5);
        
        // Split into two groups of original sizes
        const perm_ecn = shuffled.slice(0, minLength);
        const perm_ecr = shuffled.slice(minLength, 2 * minLength);
        
        // Calculate differences between values
        const permDifferences = [];
        for (let j = 0; j < minLength; j++) {
            permDifferences.push(perm_ecn[j] - perm_ecr[j]);
        }
        
        // Calculate absolute mean of differences
        permutationResults.push(Math.abs(d3.mean(permDifferences)));
    }
    
    // Create histogram
    const histogramWidth = width - 100; // Adjust for margins
    const histogramHeight = height - 100; // Adjust for margins
    
    // Calculate histogram bins
    const bins = d3.histogram()
        .domain([0, d3.max(permutationResults) * 1.1]) // Add some padding
        .thresholds(30) // Match Python's 30 bins
        (permutationResults);
    
    // Set up scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.x1)])
        .range([0, histogramWidth]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([histogramHeight, 0]);
    
    // Add x-axis
    g.append("g")
        .attr("transform", `translate(0, ${histogramHeight})`)
        .call(d3.axisBottom(x).ticks(10))
        .append("text")
        .attr("x", histogramWidth / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .text("Mean Difference in CoPx");
    
    // Add y-axis
    g.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -histogramHeight / 2)
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .text("Frequency");
    
    // Create bars
    g.selectAll(".bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.x0))
        .attr("y", d => y(d.length))
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("height", d => histogramHeight - y(d.length))
        .attr("fill", "#69b3a2")
        .attr("opacity", 0.7);
    
    // Add KDE curve (similar to sns.histplot with kde=True)
    const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(100));
    const density = kde(permutationResults);
    
    // Scale density values to match histogram height
    const densityMax = d3.max(density, d => d[1]);
    const histMax = d3.max(bins, d => d.length);
    const densityScale = histMax / densityMax;
    
    // Create the KDE line
    const line = d3.line()
        .curve(d3.curveBasis)
        .x(d => x(d[0]))
        .y(d => y(d[1] * densityScale));
    
    g.append("path")
        .datum(density)
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("d", line);
    
    // Add line for observed statistic
    g.append("line")
        .attr("x1", x(observedStatistic))
        .attr("x2", x(observedStatistic))
        .attr("y1", 0)
        .attr("y2", histogramHeight)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
    
    // Calculate p-value (matching Python implementation)
    const pValue = permutationResults.filter(d => d >= observedStatistic).length / numPermutations;
    
    // Add annotation with arrow (similar to Python's annotate)
    const arrowX = observedStatistic * 0.6;
    const arrowY = y(d3.max(bins, d => d.length) * 0.8);
    
    // Add arrow
    g.append("path")
        .attr("d", `M${x(arrowX)},${arrowY} L${x(observedStatistic)},${y(2)}`)
        .attr("stroke", "red")
        .attr("fill", "none")
        .attr("marker-end", "url(#arrow)");
    
    // Add arrowhead marker definition
    svg.append("defs").append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 5)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "red");
    
    // Add annotation text
    g.append("text")
        .attr("x", x(arrowX))
        .attr("y", arrowY - 15)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .style("font-size", "10px")
        .text(`Observed Diff: ${observedStatistic.toFixed(3)}`);
    
    g.append("text")
        .attr("x", x(arrowX))
        .attr("y", arrowY)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .style("font-size", "10px")
        .text(`P-Value: ${pValue.toFixed(3)}`);
    
    // Add observed label
    g.append("text")
        .attr("x", x(observedStatistic))
        .attr("y", histogramHeight + 30)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .style("font-weight", "bold")
        .text("Observed");
}

function handleStepExit(response) {}

// ** Update Visualization **
function updateVisualization(step) {
    const condition = step === 1 ? "ECR" : "ECN";
    if (!swayData[condition][selectedParticipant]) return;
    
    // Reset time index when changing visualization
    currentTimeIndex = 0;
    
    // Reset figure position to origin when changing visualization
    figure.transition()
        .duration(300)
        .attr("transform", "translate(0, 0)");
    
    // Update max value for slider based on data length
    const participantData = swayData[condition][selectedParticipant];
    if (participantData && participantData.length > 0) {
        const maxSeconds = 60; // 60 seconds animation
        const fps = 30;
        d3.select("#time-slider")
            .property("max", maxSeconds * fps)
            .property("value", 0);
    }
    
    // Don't automatically call updateFigurePosition here
    // This prevents the figure from moving away from origin
}

// ** Participant Selector **
function setupParticipantSelector() {
    const selector = d3.select("#participantSelector").on("change", function () {
        selectedParticipant = +this.value;
        // Reset animation when changing participant
        pauseAnimation();
        currentTimeIndex = 0;
        d3.select("#play-button").html('<i class="fas fa-play"></i> Play');
        d3.select("#time-slider").property("value", 0);
        d3.select("#time-display").text("Time: 0s");
        
        updateVisualization(currentStep);
    });
    for (let i = 1; i <= 28; i++) selector.append("option").attr("value", i).text(`Participant ${i}`);
}

function updateTooltip(condition, dataPoint) {
    if (!dataPoint) return;
    
    // Make sure we're using the actual data values, not references
    const tooltipContent = `
        <div class="tooltip-title" style="color: white;">Participant ${selectedParticipant}</div>
        <div class="tooltip-stat"><span class="tooltip-label">Condition:</span><span>${condition}</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">Time:</span><span>${dataPoint.time.toFixed(0)}s</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">COPx:</span><span>${dataPoint.copX.toFixed(3)}m</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">COPy:</span><span>${dataPoint.copY.toFixed(3)}m</span></div>`;
    
    // Force tooltip to update and be visible
    tooltip.html(tooltipContent)
           .classed("hidden", false)
           .classed("visible", true)
           .style("opacity", 1)
           .style("display", "block");
    
    // For debugging
    console.log("Tooltip updated with:", {
        participant: selectedParticipant,
        condition: condition,
        time: dataPoint.time,
        copX: dataPoint.copX,
        copY: dataPoint.copY
    });
}

function moveTooltip(event) {
    if (!tooltipVisible) return;
    
    // Make sure tooltip is visible and positioned correctly
    tooltip.style("left", `${event.pageX + 15}px`)
           .style("top", `${event.pageY - 10}px`)
           .style("opacity", 1)
           .style("display", "block");
}

function showTooltip(event) {
    tooltipVisible = true;
    
    // Make sure tooltip is visible with proper styling
    tooltip.classed("hidden", false)
           .classed("visible", true)
           .style("opacity", 1)
           .style("display", "block")
           .style("position", "absolute")
           .style("z-index", 1000);
    
    // Get current data point and update tooltip content when shown
    const condition = currentStep === 2 ? "ECR" : "ECN";
    const participantData = swayData[condition][selectedParticipant];
    
    if (participantData && participantData.length > 0) {
        const fps = 30;
        const currentTime = currentTimeIndex / fps;
        const dataPoint = findDataPointByTime(participantData, currentTime);
        
        if (dataPoint) {
            updateTooltip(condition, dataPoint);
        }
    }
    
    // Position tooltip at the event location
    moveTooltip(event);
}

function hideTooltip() {
    tooltipVisible = false;
    tooltip
        .classed("hidden", true)
        .classed("visible", false)
        .style("opacity", 0)
        .style("display", "none");
}
