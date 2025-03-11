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
    tooltip = d3.select("body").append("div").attr("id", "tooltip").classed("tooltip hidden", true);

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

    // Balance platform
    g.append("rect")
        .attr("class", "platform")
        .attr("x", -100)
        .attr("y", 150)
        .attr("width", 200)
        .attr("height", 20)
        .attr("rx", 5)
        .attr("fill", "#ccc");

    // Human figure
    figure = g.append("g")
        .attr("class", "human-figure")
        .attr("transform", "translate(0, 0)")
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
    // Legs
    figure.append('line').attr('x1', -10).attr('y1', 5).attr('x2', -20).attr('y2', 150).attr('stroke', '#3498db').attr('stroke-width', 15);
    figure.append('line').attr('x1', 10).attr('y1', 5).attr('x2', 20).attr('y2', 150).attr('stroke', '#3498db').attr('stroke-width', 15);
}

// ** Animation Controls Setup **
function setupAnimationControls() {
    const controls = d3.select("#animation-controls");
    
    // Play/Pause button
    controls.select("#play-button").on("click", togglePlayPause);
    
    // Time slider
    controls.select("#time-slider").on("input", function() {
        pauseAnimation();
        currentTimeIndex = parseInt(this.value);
        updateFigurePosition();
    });
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
    
    const condition = currentStep === 1 ? "ECR" : "ECN";
    const participantData = swayData[condition][selectedParticipant];
    
    if (!participantData || participantData.length === 0) return;
    
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
    const condition = currentStep === 1 ? "ECR" : "ECN";
    const participantData = swayData[condition][selectedParticipant];
    
    if (!participantData || participantData.length === 0) return;
    
    // Convert current animation frame to seconds
    const fps = 30;
    const currentTime = currentTimeIndex / fps;
    
    // Find the closest data point to the current time
    const dataPoint = findDataPointByTime(participantData, currentTime);

    console.log(dataPoint);
    
    if (!dataPoint) return;
    
    // Scale factor for visualization (adjust as needed)
    const scaleFactor = 1000;
    const xOffset = dataPoint.copX * scaleFactor;
    const yOffset = dataPoint.copY * scaleFactor;

    console.log(xOffset, yOffset);
    
    // Update figure position
    figure.transition()
        .duration(30) // Quick transition for smooth animation
        .attr("transform", `translate(${xOffset}, ${yOffset})`);
    
    // Update tooltip
    updateTooltip(condition, dataPoint);
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
    
    updateVisualization(currentStep);
}

function handleStepExit(response) {}

// ** Update Visualization **
function updateVisualization(step) {
    const condition = step === 1 ? "ECR" : "ECN";
    if (!swayData[condition][selectedParticipant]) return;
    
    // Reset time index when changing visualization
    currentTimeIndex = 0;
    
    // Update max value for slider based on data length
    const participantData = swayData[condition][selectedParticipant];
    if (participantData && participantData.length > 0) {
        const maxSeconds = 60; // 60 seconds animation
        const fps = 30;
        d3.select("#time-slider")
            .property("max", maxSeconds * fps)
            .property("value", 0);
    }
    
    updateFigurePosition();
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

// ** Tooltip Functions **
function showTooltip(event) {
    tooltipVisible = true;
    tooltip.classed("hidden", false).classed("visible", true);
}

function updateTooltip(condition, dataPoint) {
    if (!dataPoint) return;
    let tooltipContent = `
        <div class="tooltip-title">Participant ${selectedParticipant}</div>
        <div class="tooltip-stat"><span class="tooltip-label">Condition:</span><span>${condition}</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">Time:</span><span>${dataPoint.time.toFixed(2)}s</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">COPx:</span><span>${dataPoint.copX.toFixed(2)} mm</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">COPy:</span><span>${dataPoint.copY.toFixed(2)} mm</span></div>`;
    tooltip.html(tooltipContent)
           .classed("hidden", false)
           .classed("visible", true);


    console.log(tooltipContent);
}

function moveTooltip(event) {
    if (!tooltipVisible) return;
    tooltip.style("left", `${event.pageX + 15}px`).style("top", `${event.pageY - 10}px`);
}

function hideTooltip() {
    tooltipVisible = false;
    tooltip.classed("hidden", true);
}