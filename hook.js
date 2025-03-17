document.addEventListener("DOMContentLoaded", () => {
    const hookText = document.getElementById("hook-text");
    const restOfIntro = document.getElementById("rest-of-intro");

    // Split sentences where you want line breaks
    const hookLines = [
        "Every 11 seconds, someone visits the ER due to a fall.",
        "Every 19 minutes, someone dies.",
        "Could Mozart and VR be the solution?"
    ];

    let lineIndex = 0;
    let charIndex = 0;

    function typeWriter() {
        if (lineIndex < hookLines.length) {
            const currentLine = hookLines[lineIndex];
            if (charIndex < currentLine.length) {
                hookText.innerHTML = hookLines
                    .slice(0, lineIndex)
                    .map(line => `<div>${line}</div>`)
                    .join('') + 
                    `<div>${currentLine.substring(0, charIndex + 1)}<span class="cursor">|</span></div>`;
                charIndex++;
                const delay = 30 + Math.random() * 25;
                setTimeout(typeWriter, delay);
            } else {
                lineIndex++;
                charIndex = 0;
                setTimeout(typeWriter, 200); // Short pause between lines
            }
        } else {
            // Finished typing all lines
            hookText.innerHTML = hookLines
                .map(line => `<div>${line}</div>`)
                .join('');
            hookText.classList.add("done");
            setTimeout(() => {
                restOfIntro.classList.add("visible");
            }, 600);
        }
    }

    typeWriter();
});
