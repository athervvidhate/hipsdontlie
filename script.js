// Initialize variables
let scroller, figure, tooltip, tooltipVisible = false, currentStep = 0;
let swayData = { ECR: {}, ECN: {} }; // Stores loaded sway data for each participant
let selectedParticipant = 1; // Default participant
let isPlaying = false;
let animationTimer;
let currentTimeIndex = 0;


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
    d3.select("#animation-controls").style("display", "none");
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

                if (!swayData[condition][participant]) {
                    swayData[condition][participant] = [];
                }
                swayData[condition][participant].push({ time, copX, copY });
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

// ** Setup Visualization (Main Figure) **
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
    const boxSize = 300; 
    const boxYOffset = -22; 
    
    g.append("rect")
        .attr("class", "boundary-box")
        .attr("x", -boxSize/2)
        .attr("y", -boxSize/2 + boxYOffset)
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

    // Human figure - initially positioned at (0,0)
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
    figure.append('line').attr('x1', -10).attr('y1', 5).attr('x2', -20).attr('y2', 100).attr('stroke', '#3498db').attr('stroke-width', 15);
    figure.append('line').attr('x1', 10).attr('y1', 5).attr('x2', 20).attr('y2', 100).attr('stroke', '#3498db').attr('stroke-width', 15);
}

// ** Animation Controls Setup **
function setupAnimationControls() {
    const controls = d3.select("#animation-controls");
    
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
    
    controls.select("#play-button").on("click", togglePlayPause);
    
    controls.select("#time-slider").on("input", function() {
        pauseAnimation();
        currentTimeIndex = parseInt(this.value);
        updateFigurePosition();
    });
    
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
    
    if (currentTimeIndex === 0) {
        figure.attr("transform", "translate(0, 0)");
    }
    
    const maxTime = 60; // seconds
    const fps = 30;
    const interval = 1000 / fps;
    
    animationTimer = setInterval(() => {
        currentTimeIndex++;
        
        d3.select("#time-slider")
            .property("value", currentTimeIndex)
            .property("max", maxTime * fps);
            
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
    
    if (currentTimeIndex === 0 && !isPlaying) {
        figure.transition()
            .duration(300)
            .attr("transform", "translate(0, 0)");
        return;
    }
    
    const fps = 30;
    const currentTime = currentTimeIndex / fps;
    const dataPoint = findDataPointByTime(participantData, currentTime);
    
    if (!dataPoint) return;
    
    const scaleFactor = 2500;
    const xOffset = (dataPoint.copX - participantData.avgX) * scaleFactor;
    const yOffset = (dataPoint.copY - participantData.avgY) * scaleFactor;
    
    figure.transition()
        .duration(30)
        .attr("transform", `translate(${xOffset}, ${yOffset})`);
    
    if (tooltipVisible) {
        updateTooltip(condition, dataPoint);
    }
}

// ** Find the closest data point to a given time **
function findDataPointByTime(data, targetTime) {
    if (!data || data.length === 0) return null;
    
    if (targetTime >= data[data.length - 1].time) {
        return data[data.length - 1];
    }
    
    if (targetTime <= data[0].time) {
        return data[0];
    }
    
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
    
    const beforeIndex = Math.max(0, right);
    const afterIndex = Math.min(data.length - 1, left);
    
    const beforeDiff = Math.abs(data[beforeIndex].time - targetTime);
    const afterDiff = Math.abs(data[afterIndex].time - targetTime);
    
    return beforeDiff < afterDiff ? data[beforeIndex] : data[afterIndex];
}

// ******************************************************************
// NEW FUNCTION: Render a small interactive line graph for a condition
// The brush selection itself updates the x-domain to zoom into the selected region.
// A Reset Zoom button resets the view to the original domain.
// The graph dimensions have been increased and the container is centered.
function renderLineGraph(condition, container) {
    const data = swayData[condition][selectedParticipant];
    if (!data) return;
    
    // Set dimensions for the larger graph
    const margin = {top: 20, right: 20, bottom: 40, left: 40};
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    // Create the SVG and main group
    const svg = container.append("svg")
       .attr("width", width + margin.left + margin.right)
       .attr("height", height + margin.top + margin.bottom);
    
    const g = svg.append("g")
       .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Define scales
    const x = d3.scaleLinear()
       .domain(d3.extent(data, d => d.time))
       .range([0, width]);
    const originalDomain = x.domain();
    
    const yMin = d3.min(data, d => Math.min(d.copX, d.copY));
    const yMax = d3.max(data, d => Math.max(d.copX, d.copY));
    const y = d3.scaleLinear()
       .domain([yMin, yMax])
       .range([height, 0]);
    
    // Add axes groups
    const xAxisGroup = g.append("g")
       .attr("class", "x-axis")
       .attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x));
    
    const yAxisGroup = g.append("g")
       .attr("class", "y-axis")
       .call(d3.axisLeft(y));
    
    // Create a group for chart elements (lines)
    const chartGroup = g.append("g")
       .attr("class", "chart-group");
    
    // Define line generators
    const lineX = d3.line()
       .x(d => x(d.time))
       .y(d => y(d.copX));
    
    const lineY = d3.line()
       .x(d => x(d.time))
       .y(d => y(d.copY));
    
    // Append COPx and COPy lines
    chartGroup.append("path")
       .datum(data)
       .attr("class", "line copx-line")
       .attr("fill", "none")
       .attr("stroke", "#1f77b4")
       .attr("stroke-width", 1.5)
       .attr("d", lineX);
    
    chartGroup.append("path")
       .datum(data)
       .attr("class", "line copy-line")
       .attr("fill", "none")
       .attr("stroke", "#ff7f0e")
       .attr("stroke-width", 1.5)
       .attr("d", lineY);
    
    // Define brush behavior to update the x-domain (zoom)
    const brush = d3.brushX()
       .extent([[0, 0], [width, height]])
       .on("end", brushed);
    
    const brushGroup = g.append("g")
       .attr("class", "brush")
       .call(brush);
    
    function brushed(event) {
       if (!event.selection) return;
       const [x0, x1] = event.selection;
       const newDomain = [x.invert(x0), x.invert(x1)];
       // Update the x scale domain
       x.domain(newDomain);
       // Update the x-axis and lines with a smooth transition
       xAxisGroup.transition().duration(750).call(d3.axisBottom(x));
       chartGroup.selectAll(".copx-line")
          .transition().duration(750)
          .attr("d", lineX);
       chartGroup.selectAll(".copy-line")
          .transition().duration(750)
          .attr("d", lineY);
       // Clear the brush selection
       brushGroup.call(brush.move, null);
    }
    
    // Append an HTML legend below the SVG
    container.append("div")
         .attr("class", "legend-container")
         .style("margin-top", "10px")
         .style("text-align", "center")
         .html(`
           <span style="display: inline-block; margin-right: 20px;">
             <span style="background: #1f77b4; border-radius: 50%; display: inline-block; width: 10px; height: 10px; margin-right: 5px;"></span> COPx
           </span>
           <span style="display: inline-block;">
             <span style="background: #ff7f0e; border-radius: 50%; display: inline-block; width: 10px; height: 10px; margin-right: 5px;"></span> COPy
           </span>
         `);
    
    // Append a Reset Zoom button below the legend
    container.append("button")
         .attr("class", "reset-zoom")
         .style("margin-top", "10px")
         .style("display", "block")
         .style("margin-left", "auto")
         .style("margin-right", "auto")
         .style("padding", "5px 10px")
         .style("background", "#3498db")
         .style("color", "white")
         .style("border", "none")
         .style("border-radius", "4px")
         .style("cursor", "pointer")
         .text("Reset Zoom")
         .on("click", function() {
             x.domain(originalDomain);
             xAxisGroup.transition().duration(750).call(d3.axisBottom(x));
             chartGroup.selectAll(".copx-line")
                .transition().duration(750)
                .attr("d", lineX);
             chartGroup.selectAll(".copy-line")
                .transition().duration(750)
                .attr("d", lineY);
         });
}

// ******************************************************************
// Permutation Test Visualization Function
// (This function remains as originally implemented)
// ******************************************************************
function runPermutationTest() {
    const vizContainer = d3.select("#permutation-test-container").select("#viz-container");
    vizContainer.selectAll("*").remove();
    
    const width = vizContainer.node().getBoundingClientRect().width || 
                  d3.select("#permutation-test-container").node().getBoundingClientRect().width;
    const height = 400;
    
    const svg = vizContainer.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
    
    const g = svg.append("g")
        .attr("transform", `translate(50,50)`);
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Permutation Test: Absolute Difference in Mean CoPx");
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("The observed difference shows the mean difference between the participants' medial lateral center of pressure");
    
    const ecrValues = [];
    const ecnValues = [];
    
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
    
    const minLength = Math.min(ecrValues.length, ecnValues.length);
    const ecrTrimmed = ecrValues.slice(0, minLength);
    const ecnTrimmed = ecnValues.slice(0, minLength);
    
    const observedDifferences = [];
    for (let i = 0; i < minLength; i++) {
        observedDifferences.push(ecnTrimmed[i] - ecrTrimmed[i]);
    }
    
    const observedStatistic = Math.abs(d3.mean(observedDifferences));
    
    const numPermutations = 1000;
    const permutationResults = [];
    const allData = [...ecrTrimmed, ...ecnTrimmed];
    
    for (let i = 0; i < numPermutations; i++) {
        const shuffled = [...allData].sort(() => Math.random() - 0.5);
        const perm_ecn = shuffled.slice(0, minLength);
        const perm_ecr = shuffled.slice(minLength, 2 * minLength);
        const permDifferences = [];
        for (let j = 0; j < minLength; j++) {
            permDifferences.push(perm_ecn[j] - perm_ecr[j]);
        }
        permutationResults.push(Math.abs(d3.mean(permDifferences)));
    }
    
    const histogramWidth = width - 100;
    const histogramHeight = height - 100;
    
    const bins = d3.histogram()
        .domain([0, d3.max(permutationResults) * 1.1])
        .thresholds(30)
        (permutationResults);
    
    const x = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.x1)])
        .range([0, histogramWidth]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([histogramHeight, 0]);
    
    g.append("g")
        .attr("transform", `translate(0, ${histogramHeight})`)
        .call(d3.axisBottom(x).ticks(10))
        .append("text")
        .attr("x", histogramWidth / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .text("Mean Difference in CoPx");
    
    g.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -histogramHeight / 2)
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .text("Frequency");
    
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
    
    const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(100));
    const density = kde(permutationResults);
    
    const densityMax = d3.max(density, d => d[1]);
    const histMax = d3.max(bins, d => d.length);
    const densityScale = histMax / densityMax;
    
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
    
    g.append("line")
        .attr("x1", x(observedStatistic))
        .attr("x2", x(observedStatistic))
        .attr("y1", 0)
        .attr("y2", histogramHeight)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
    
    const arrowX = observedStatistic * 0.6;
    const arrowY = y(d3.max(bins, d => d.length) * 0.8);
    
    g.append("path")
        .attr("d", `M${x(arrowX)},${arrowY} L${x(observedStatistic)},${y(2)}`)
        .attr("stroke", "red")
        .attr("fill", "none")
        .attr("marker-end", "url(#arrow)");
    
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
        .text(`P-Value: ${(permutationResults.filter(d => d >= observedStatistic).length / numPermutations).toFixed(3)}`);
    
    g.append("text")
        .attr("x", x(observedStatistic))
        .attr("y", histogramHeight + 30)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .style("font-weight", "bold")
        .text("Observed");
}

function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
}

function kernelEpanechnikov(k) {
    return function(v) {
        v = v / k;
        return Math.abs(v) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}



// Then in the handleStepEnter function
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
    
    // Update visualization (existing function)
    updateVisualization(currentStep);
    
    // Show animation controls only for specific sections by ID
    const currentSectionId = d3.select(response.element).attr("id");
    if (currentSectionId === "control" || currentSectionId === "condition1") {
        d3.select("#animation-controls").style("display", "flex");
    } else {
        d3.select("#animation-controls").style("display", "none");
    }
    
    // For steps that are not the permutation test, add a line graph below the text
    if (d3.select(response.element).attr("id") !== "permutation-test") {
        d3.select(response.element).select(".line-graph").remove();
        // Center the graph container by setting margin to "20px auto"
        const graphContainer = d3.select(response.element)
            .select(".content")
            .append("div")
            .attr("class", "line-graph")
            .style("margin", "20px auto");
        
        const condition = (currentStep === 2 ? "ECR" : "ECN");
        renderLineGraph(condition, graphContainer);
    }
    
    // If on permutation test step, run the permutation test visualization
    if (currentStep === 3) {
        const container = d3.select("#permutation-test-container");
        
        if (container.select("#viz-container").empty()) {
            container.append("div")
                .attr("id", "viz-container");
        }
        
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
                    container.select("#viz-container").selectAll("*").remove();
                    runPermutationTest();
                });
        }
        
        if (container.select("#viz-container svg").empty()) {
            runPermutationTest();
        }
    }
}

function handleStepExit(response) {}

// ** Update Visualization for Main Figure **
function updateVisualization(step) {
    const condition = step === 1 ? "ECR" : "ECN";
    if (!swayData[condition][selectedParticipant]) return;
    
    currentTimeIndex = 0;
    
    figure.transition()
        .duration(300)
        .attr("transform", "translate(0, 0)");
    
    const participantData = swayData[condition][selectedParticipant];
    if (participantData && participantData.length > 0) {
        const maxSeconds = 60;
        const fps = 30;
        d3.select("#time-slider")
            .property("max", maxSeconds * fps)
            .property("value", 0);
    }
}

// ** Participant Selector **
function setupParticipantSelector() {
    const selector = d3.select("#participantSelector").on("change", function () {
        selectedParticipant = +this.value;
        pauseAnimation();
        currentTimeIndex = 0;
        d3.select("#play-button").html('<i class="fas fa-play"></i> Play');
        d3.select("#time-slider").property("value", 0);
        d3.select("#time-display").text("Time: 0s");
        
        updateVisualization(currentStep);
        if (currentStep !== 3) {
            d3.select(".step.is-active").select(".line-graph").remove();
            const graphContainer = d3.select(".step.is-active").select(".content")
                                   .append("div")
                                   .attr("class", "line-graph")
                                   .style("margin", "20px auto");
            const condition = (currentStep === 2 ? "ECR" : "ECN");
            renderLineGraph(condition, graphContainer);
        }
    });
    for (let i = 1; i <= 28; i++) {
        selector.append("option").attr("value", i).text(`Participant ${i}`);
    }
}

function updateTooltip(condition, dataPoint) {
    if (!dataPoint) return;
    
    const tooltipContent = `
        <div class="tooltip-title" style="color: white;">Participant ${selectedParticipant}</div>
        <div class="tooltip-stat"><span class="tooltip-label">Condition:</span><span>${condition}</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">Time:</span><span>${dataPoint.time.toFixed(0)}s</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">COPx:</span><span>${dataPoint.copX.toFixed(3)}m</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">COPy:</span><span>${dataPoint.copY.toFixed(3)}m</span></div>`;
    
    tooltip.html(tooltipContent)
           .classed("hidden", false)
           .classed("visible", true)
           .style("opacity", 1)
           .style("display", "block");
    
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
    
    tooltip.style("left", `${event.pageX + 15}px`)
           .style("top", `${event.pageY - 10}px`)
           .style("opacity", 1)
           .style("display", "block");
}

function showTooltip(event) {
    tooltipVisible = true;
    
    tooltip.classed("hidden", false)
           .classed("visible", true)
           .style("opacity", 1)
           .style("display", "block")
           .style("position", "absolute")
           .style("z-index", 1000);
    
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

// JavaScript to handle the popup
document.getElementById('popupButton').addEventListener('click', function() {
    document.getElementById('popup').classList.remove('hidden');
});

document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('popup').classList.add('hidden');
});

window.addEventListener('click', function(event) {
    if (event.target == document.getElementById('popup')) {
        document.getElementById('popup').classList.add('hidden');
    }
});
