// main.js
let scroller, figure, tooltip, tooltipVisible = false, currentStep = 0;
let swayData = { ECR: {}, ECN: {}, VRN: {}, VRM: {} };
let selectedParticipant = 1;
let isPlaying = false;
let animationTimer;
let currentTimeIndex = 0;

document.addEventListener('DOMContentLoaded', async function () {
    scroller = scrollama();

    tooltip = createTooltip();

    await loadData();
    setupVisualization();
    setupParticipantSelector();
    setupAnimationControls();

    scroller
        .setup({
            step: ".step",
            offset: 0.5,
            debug: false
        })
        .onStepEnter(handleStepEnter)
        .onStepExit(handleStepExit);

    window.addEventListener("resize", scroller.resize);
    d3.select("#animation-controls").style("display", "none");
});
