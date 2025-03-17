// controls.js
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
        .style("cursor", "pointer")
        .on("click", togglePlayPause);

        controls.select("#time-slider")
        .style("flex-grow", "1")
        .style("margin", "0 10px")
        .on("input", function() {
            pauseAnimation();
            currentTimeIndex = parseInt(this.value);
            updateFigurePosition();
    
            const fps = 30;
            const seconds = Math.floor(currentTimeIndex / fps);
            d3.select("#time-display").text(`Time: ${seconds}s`);
        });
    

    controls.select("#time-display")
        .style("min-width", "70px")
        .style("text-align", "right");

    d3.select("body").style("padding-bottom", "60px");
}

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
    
    const condition = currentStep === 2 ? "ECR" : currentStep === 1 ? "ECN" : currentStep === 3 ? "VRN" : currentStep === 4 ? "VRM" : "ECR";
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

function updateFigurePosition() {
    const condition = currentStep === 2 ? "ECR" : currentStep === 1 ? "ECN" : currentStep === 3 ? "VRN" : currentStep === 4 ? "VRM" : "ECR";
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


