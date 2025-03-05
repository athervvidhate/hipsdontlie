// Initialize variables
let scroller;
let figure;

// Add these variables at the top with your other initializations
let tooltip;
let tooltipVisible = false;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the scrollama
    scroller = scrollama();
    
    // Setup the visualization
    setupVisualization();
    
    // Initialize tooltip
    tooltip = d3.select("#tooltip");
    
    // Setup the scroller
    scroller
        .setup({
            step: '.step',
            offset: 0.5,
            debug: false
        })
        .onStepEnter(handleStepEnter)
        .onStepExit(handleStepExit);
    
    // Handle window resize
    window.addEventListener('resize', scroller.resize);
});

// Setup the visualization using D3
function setupVisualization() {
    const container = d3.select('#visualization');
    const width = container.node().getBoundingClientRect().width;
    const height = container.node().getBoundingClientRect().height;
    
    // Create SVG
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    
    // Create a group for the visualization
    const g = svg.append('g')
        .attr('transform', `translate(${width/2}, ${height/2})`);
    
    // Draw balance platform
    g.append('rect')
        .attr('class', 'platform')
        .attr('x', -100)
        .attr('y', 150)
        .attr('width', 200)
        .attr('height', 20)
        .attr('rx', 5);
    
    // Draw human figure (simplified)
    figure = g.append('g')
        .attr('class', 'human-figure')
        .attr('transform', 'translate(0, 0)')
        .on('mouseover', showTooltip)
        .on('mousemove', moveTooltip)
        .on('mouseout', hideTooltip);
    
    // Head
    figure.append('circle')
        .attr('cx', 0)
        .attr('cy', -120)
        .attr('r', 25)
        .attr('fill', '#3498db');
    
    // Body
    figure.append('rect')
        .attr('x', -15)
        .attr('y', -95)
        .attr('width', 30)
        .attr('height', 100)
        .attr('fill', '#3498db');
    
    // Arms
    figure.append('line')
        .attr('x1', -15)
        .attr('y1', -70)
        .attr('x2', -40)
        .attr('y2', -30)
        .attr('stroke', '#3498db')
        .attr('stroke-width', 10);
    
    figure.append('line')
        .attr('x1', 15)
        .attr('y1', -70)
        .attr('x2', 40)
        .attr('y2', -30)
        .attr('stroke', '#3498db')
        .attr('stroke-width', 10);
    
    // Legs
    figure.append('line')
        .attr('x1', -10)
        .attr('y1', 5)
        .attr('x2', -20)
        .attr('y2', 150)
        .attr('stroke', '#3498db')
        .attr('stroke-width', 15);
    
    figure.append('line')
        .attr('x1', 10)
        .attr('y1', 5)
        .attr('x2', 20)
        .attr('y2', 150)
        .attr('stroke', '#3498db')
        .attr('stroke-width', 15);
    
    // Add AP sway annotation (initially hidden)
    const apAnnotation = g.append('g')
        .attr('class', 'sway-annotation ap-annotation');
    
    apAnnotation.append('path')
        .attr('class', 'ap-arrow')
        .attr('d', 'M0,-180 C-20,-180 -20,-220 0,-220 C20,-220 20,-180 0,-180')
        .attr('marker-end', 'url(#arrowhead)');
    
    apAnnotation.append('text')
        .attr('class', 'ap-label')
        .attr('x', 0)
        .attr('y', -230)
        .text('Anterior-Posterior (AP) Sway');
    
    // Add ML sway annotation (initially hidden)
    const mlAnnotation = g.append('g')
        .attr('class', 'sway-annotation ml-annotation');
    
    mlAnnotation.append('path')
        .attr('class', 'ml-arrow')
        .attr('d', 'M-60,-100 C-60,-80 -100,-80 -100,-100 C-100,-120 -60,-120 -60,-100')
        .attr('marker-end', 'url(#arrowhead)');
    
    mlAnnotation.append('text')
        .attr('class', 'ml-label')
        .attr('x', -80)
        .attr('y', -130)
        .text('Medial-Lateral (ML) Sway');
    
    // Add arrowhead marker
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#e74c3c');
    
    // Add hover interaction for step 2
    svg.on('mouseover', function() {
        if (currentStep === 2) {
            showSwayAnnotations(true);
            startSwayAnimation();
        }
    }).on('mouseout', function() {
        if (currentStep === 2) {
            showSwayAnnotations(false);
            stopSwayAnimation();
        }
    });
}

// Track current step
let currentStep = 0;
let swayInterval;

// Handle step enter
function handleStepEnter(response) {
    currentStep = response.index + 1;
    
    // Update the active step
    d3.selectAll('.step').classed('is-active', false);
    d3.select(response.element).classed('is-active', true);
    
    // Update visualization based on current step
    updateVisualization(currentStep);
}

// Handle step exit
function handleStepExit(response) {
    // Clean up any animations if needed
    if (response.index + 1 === 2) {
        showSwayAnnotations(false);
        stopSwayAnimation();
    }
}

// Update visualization based on current step
function updateVisualization(step) {
    switch(step) {
        case 1:
            // Initial state - slight natural sway
            startNaturalSway();
            break;
        case 2:
            // Show sway directions on hover
            stopSwayAnimation();
            figure.transition()
                .duration(500)
                .attr('transform', 'translate(0, 0)');
            break;
        case 3:
            // Experiment setup
            stopSwayAnimation();
            figure.transition()
                .duration(500)
                .attr('transform', 'translate(0, 0)');
            showSwayAnnotations(false);
            break;
        case 4:
            // Results - show synchronized sway
            startSynchronizedSway();
            break;
    }
}

// Show/hide sway annotations
function showSwayAnnotations(show) {
    d3.selectAll('.sway-annotation')
        .classed('visible', show);
}

// Start natural slight sway animation
function startNaturalSway() {
    stopSwayAnimation();
    swayInterval = setInterval(() => {
        const xOffset = Math.sin(Date.now() / 1000) * 5;
        figure.attr('transform', `translate(${xOffset}, 0)`);
    }, 50);
}

// Start synchronized sway animation
function startSynchronizedSway() {
    stopSwayAnimation();
    swayInterval = setInterval(() => {
        const time = Date.now() / 1000;
        const xOffset = Math.sin(time) * 10;
        const yOffset = Math.sin(time * 0.5) * 5;
        figure.attr('transform', `translate(${xOffset}, ${yOffset})`);
    }, 50);
}

// Start interactive sway animation for step 2
function startSwayAnimation() {
    stopSwayAnimation();
    swayInterval = setInterval(() => {
        const time = Date.now() / 1000;
        const xOffset = Math.sin(time * 1.5) * 15; // ML sway (side to side)
        const yOffset = Math.sin(time * 0.8) * 8;  // AP sway (forward/backward)
        figure.attr('transform', `translate(${xOffset}, ${yOffset})`);
    }, 50);
}

// Stop any ongoing sway animation
function stopSwayAnimation() {
    if (swayInterval) {
        clearInterval(swayInterval);
        swayInterval = null;
    }
}

// Add data visualization for the final step
function addDataVisualization() {
    // This function would be called in step 4 to show actual data
    // For now, we'll just use the synchronized sway animation
    
    // Example of how you might add a data chart:
    /*
    const dataContainer = d3.select('#visualization').append('div')
        .attr('class', 'data-container')
        .style('position', 'absolute')
        .style('bottom', '20px')
        .style('left', '20px')
        .style('width', '300px')
        .style('height', '150px');
        
    // Create a simple line chart showing sway patterns
    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    const chartWidth = 300 - margin.left - margin.right;
    const chartHeight = 150 - margin.top - margin.bottom;
    
    const chartSvg = dataContainer.append('svg')
        .attr('width', chartWidth + margin.left + margin.right)
        .attr('height', chartHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
        
    // Add chart elements here
    */
}

// Function to handle window resize
function handleResize() {
    const container = d3.select('#visualization');
    const width = container.node().getBoundingClientRect().width;
    const height = container.node().getBoundingClientRect().height;
    
    // Update SVG dimensions
    container.select('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);
    
    // Update center position of the visualization group
    container.select('svg g')
        .attr('transform', `translate(${width/2}, ${height/2})`);
    
    // Notify scrollama to update
    scroller.resize();
}

// Add audio functionality for the music component
function playAudio(step) {
    // This would integrate actual audio based on the current step
    // For a real implementation, you would need audio files
    
    /*
    const audioElement = document.getElementById('background-audio');
    
    switch(step) {
        case 1:
            audioElement.src = 'audio/ambient.mp3';
            break;
        case 2:
            audioElement.src = 'audio/explanation.mp3';
            break;
        case 3:
            audioElement.src = 'audio/experiment.mp3';
            break;
        case 4:
            audioElement.src = 'audio/synchronized_rhythm.mp3';
            break;
    }
    
    audioElement.play();
    */
}

// Add this to the window resize event
window.addEventListener('resize', handleResize);

// Add these new functions for tooltip handling
function showTooltip(event) {
    if (currentStep === 0) return; // Don't show tooltip before scrolling starts
    
    tooltipVisible = true;
    tooltip.classed('hidden', false);
    
    // Set tooltip content based on current step
    let content = '';
    
    switch(currentStep) {
        case 1:
            content = `
                <div class="tooltip-stat">
                    <span class="tooltip-label">Natural Sway:</span>
                    <span>±5mm</span>
                </div>
                <p>Even when standing still, the human body naturally sways to maintain balance.</p>
            `;
            break;
        case 2:
            content = `
                <div class="tooltip-stat">
                    <span class="tooltip-label">AP Sway:</span>
                    <span>±8mm</span>
                </div>
                <div class="tooltip-stat">
                    <span class="tooltip-label">ML Sway:</span>
                    <span>±15mm</span>
                </div>
                <p>Hover to see how the body sways in different directions.</p>
            `;
            break;
        case 3:
            content = `
                <div class="tooltip-stat">
                    <span class="tooltip-label">Experiment:</span>
                    <span>VR + Music</span>
                </div>
                <p>Participants wore VR headsets while standing on force plates that measured their center of pressure.</p>
            `;
            break;
        case 4:
            content = `
                <div class="tooltip-stat">
                    <span class="tooltip-label">Synchronized:</span>
                    <span>+40% stability</span>
                </div>
                <p>When audio and visual cues were synchronized, participants showed improved stability patterns.</p>
            `;
            break;
    }
    
    tooltip.select('.tooltip-content').html(content);
    moveTooltip(event);
}

// Update the moveTooltip function to position correctly with the new layout
function moveTooltip(event) {
    if (!tooltipVisible) return;
    
    // Position the tooltip near the cursor but not directly under it
    const tooltipWidth = tooltip.node().getBoundingClientRect().width;
    const tooltipHeight = tooltip.node().getBoundingClientRect().height;
    
    // Adjust positioning to account for the right-side placement
    tooltip
        .style('left', `${event.pageX - tooltipWidth/2}px`)
        .style('top', `${event.pageY - tooltipHeight - 10}px`);
}

function hideTooltip() {
    tooltipVisible = false;
    tooltip.classed('hidden', true);
}