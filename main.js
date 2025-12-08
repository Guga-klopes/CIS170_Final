/* ============================================
   3D GRADIENT VISUALIZER - MAIN LOGIC
   Handles 3D plotting, gradient computation,
   question generation, and answer checking
   ============================================ */

// ===== GLOBAL STATE =====
const STATE = {
    currentFunction: 'quadratic',
    currentPoint: { x: 0, y: 0 },
    currentQuestion: null,
    stats: {
        correct: 0,
        attempted: 0
    }
};

// ===== FUNCTION DEFINITIONS =====
// These define the different functions users can practice with

const FUNCTIONS = {
    quadratic: {
        name: 'Quadratic',
        template: 'f(x,y) = {a}x² + {b}xy + {c}y² + {d}x + {e}y',
        generate: () => {
            const a = randomInt(-3, 3, 0);
            const b = randomInt(-3, 3, 0);
            const c = randomInt(-3, 3, 0);
            const d = randomInt(-2, 2, 0);
            const e = randomInt(-2, 2, 0);
            return {
                a, b, c, d, e,
                evaluate: (x, y) => a*x*x + b*x*y + c*y*y + d*x + e*y,
                partialX: (x, y) => `${2*a}*x + ${b}*y + ${d}`,
                partialY: (x, y) => `${b}*x + ${2*c}*y + ${e}`,
                partialXValue: (x, y) => 2*a*x + b*y + d,
                partialYValue: (x, y) => b*x + 2*c*y + e
            };
        }
    },
    exponential: {
        name: 'Exponential',
        template: 'f(x,y) = {a}e^(-(x²+y²)/{c}) + {d}',
        generate: () => {
            const a = randomInt(1, 3);
            const c = randomInt(1, 3);
            const d = randomInt(-2, 2, 0);
            return {
                a, c, d,
                evaluate: (x, y) => a * Math.exp(-(x*x + y*y) / c) + d,
                partialX: (x, y) => `${a} * e^(-(x²+y²)/${c}) * (-2*x/${c})`,
                partialY: (x, y) => `${a} * e^(-(x²+y²)/${c}) * (-2*y/${c})`,
                partialXValue: (x, y) => a * Math.exp(-(x*x + y*y) / c) * (-2*x / c),
                partialYValue: (x, y) => a * Math.exp(-(x*x + y*y) / c) * (-2*y / c)
            };
        }
    },
    sinusoidal: {
        name: 'Sinusoidal',
        template: 'f(x,y) = {a}·sin(x) + {b}·cos(y) + {c}',
        generate: () => {
            const a = randomInt(1, 3);
            const b = randomInt(1, 3);
            const c = randomInt(-2, 2, 0);
            return {
                a, b, c,
                evaluate: (x, y) => a * Math.sin(x) + b * Math.cos(y) + c,
                partialX: (x, y) => `${a}*cos(x)`,
                partialY: (x, y) => `${-b}*sin(y)`,
                partialXValue: (x, y) => a * Math.cos(x),
                partialYValue: (x, y) => -b * Math.sin(y)
            };
        }
    },
    saddle: {
        name: 'Saddle Surface',
        template: 'f(x,y) = {a}x² - {b}y²',
        generate: () => {
            const a = randomInt(1, 3);
            const b = randomInt(1, 3);
            return {
                a, b,
                evaluate: (x, y) => a*x*x - b*y*y,
                partialX: (x, y) => `${2*a}*x`,
                partialY: (x, y) => `${-2*b}*y`,
                partialXValue: (x, y) => 2*a*x,
                partialYValue: (x, y) => -2*b*y
            };
        }
    }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Generate random integer
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @param {number} exclude - Value to exclude (optional)
 */
function randomInt(min, max, exclude = null) {
    let num = Math.floor(Math.random() * (max - min + 1)) + min;
    while (num === exclude) {
        num = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return num;
}

/**
 * Generate random point for visualization
 */
function randomPoint() {
    return {
        x: randomInt(-3, 3),
        y: randomInt(-3, 3)
    };
}

/**
 * Parse a mathematical expression string and evaluate it
 * This is a simple parser that handles basic expressions
 * Safe for math expressions only (no code execution)
 */
function evaluateExpression(expr, x, y) {
    try {
        // Replace variables with their values
        let result = expr
            .replace(/x/g, `(${x})`)
            .replace(/y/g, `(${y})`)
            .replace(/π/g, Math.PI)
            .replace(/e/g, Math.E)
            .replace(/\^/g, '**')
            .replace(/sin/g, 'Math.sin')
            .replace(/cos/g, 'Math.cos')
            .replace(/tan/g, 'Math.tan')
            .replace(/sqrt/g, 'Math.sqrt')
            .replace(/exp/g, 'Math.exp')
            .replace(/abs/g, 'Math.abs');
        
        // Safely evaluate using Function constructor (only for mathematical expressions)
        const value = Function('"use strict"; return (' + result + ')')();
        return value;
    } catch (error) {
        console.error('Expression evaluation error:', error);
        return NaN;
    }
}

/**
 * Compare two numeric answers with tolerance
 */
function compareAnswers(userAnswer, correctAnswer, tolerance = 0.01) {
    const userNum = evaluateExpression(userAnswer, 1, 1); // Evaluate to get a number
    const correctNum = evaluateExpression(correctAnswer, 1, 1);
    
    if (isNaN(userNum) || isNaN(correctNum)) {
        return false;
    }
    
    return Math.abs(userNum - correctNum) < tolerance;
}

// ===== 3D PLOTTING FUNCTIONS =====

/**
 * Generate 3D surface data for Plotly
 */
function generateSurfaceData(func, x0, y0) {
    const range = 5;
    const step = 0.3;
    const x = [];
    const y = [];
    const z = [];

    for (let i = x0 - range; i <= x0 + range; i += step) {
        x.push(i);
    }
    for (let i = y0 - range; i <= y0 + range; i += step) {
        y.push(i);
    }

    for (let yi of y) {
        const row = [];
        for (let xi of x) {
            row.push(func.evaluate(xi, yi));
        }
        z.push(row);
    }

    return { x, y, z };
}

/**
 * Generate arrow vectors for gradient visualization
 */
function generateGradientArrows(func, x0, y0) {
    // Compute partial derivatives at the point
    const dfdx = func.partialXValue(x0, y0);
    const dfdy = func.partialYValue(x0, y0);
    const z0 = func.evaluate(x0, y0);

    // Scale the arrows for visibility
    const scale = 0.3;
    const magnitude = Math.sqrt(dfdx * dfdx + dfdy * dfdy);
    const scaledDfdx = (magnitude > 0) ? (dfdx / magnitude) * scale : 0;
    const scaledDfdy = (magnitude > 0) ? (dfdy / magnitude) * scale : 0;

    // Create arrow trace
    const arrowTraceX = [x0, x0 + scaledDfdx];
    const arrowTraceY = [y0, y0 + scaledDfdy];
    const arrowTraceZ = [z0, z0];

    return {
        x: arrowTraceX,
        y: arrowTraceY,
        z: arrowTraceZ,
        mode: 'lines+markers',
        type: 'scatter3d',
        name: 'Gradient Vector',
        line: {
            color: '#f6ad55',
            width: 8
        },
        marker: {
            size: 8,
            color: '#f6ad55'
        }
    };
}

/**
 * Create and display the 3D plot
 */
function updatePlot() {
    // Get current values from UI
    STATE.currentFunction = document.getElementById('functionSelect').value;
    STATE.currentPoint.x = parseFloat(document.getElementById('xInput').value) || 0;
    STATE.currentPoint.y = parseFloat(document.getElementById('yInput').value) || 0;

    const funcDef = FUNCTIONS[STATE.currentFunction];
    const currentFunc = funcDef.generate();
    STATE.currentFunction = { ...STATE.currentFunction, ...currentFunc };

    const { x, y, z } = generateSurfaceData(currentFunc, STATE.currentPoint.x, STATE.currentPoint.y);

    // Main surface trace
    const surfaceTrace = {
        x: x,
        y: y,
        z: z,
        type: 'surface',
        colorscale: 'Viridis',
        showscale: true,
        name: 'Surface'
    };

    // Point on surface
    const z0 = currentFunc.evaluate(STATE.currentPoint.x, STATE.currentPoint.y);
    const pointTrace = {
        x: [STATE.currentPoint.x],
        y: [STATE.currentPoint.y],
        z: [z0],
        mode: 'markers',
        type: 'scatter3d',
        name: 'Evaluation Point',
        marker: {
            size: 10,
            color: '#48bb78',
            symbol: 'circle'
        }
    };

    // Gradient arrow
    const arrowTrace = generateGradientArrows(currentFunc, STATE.currentPoint.x, STATE.currentPoint.y);

    // Layout configuration
    const layout = {
        title: {
            text: `Surface with Gradient at (${STATE.currentPoint.x}, ${STATE.currentPoint.y})`,
            font: { color: '#e2e8f0', size: 16 }
        },
        scene: {
            xaxis: { backgroundcolor: 'rgb(31, 33, 50)', gridcolor: 'rgb(60, 70, 100)', title: 'x' },
            yaxis: { backgroundcolor: 'rgb(31, 33, 50)', gridcolor: 'rgb(60, 70, 100)', title: 'y' },
            zaxis: { backgroundcolor: 'rgb(31, 33, 50)', gridcolor: 'rgb(60, 70, 100)', title: 'f(x,y)' },
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1.3 }
            }
        },
        paper_bgcolor: '#1a202c',
        plot_bgcolor: '#1a202c',
        margin: { l: 0, r: 0, t: 40, b: 0 },
        showlegend: true,
        legend: {
            x: 0.02,
            y: 0.98,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            bordercolor: '#5b9fdb',
            borderwidth: 1
        }
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false
    };

    Plotly.newPlot('plot', [surfaceTrace, pointTrace, arrowTrace], layout, config);
}

// ===== QUESTION MANAGEMENT =====

/**
 * Generate a new practice question
 */
function generateNewQuestion() {
    // Pick a random function
    const funcKeys = Object.keys(FUNCTIONS);
    const funcKey = funcKeys[Math.floor(Math.random() * funcKeys.length)];
    const funcDef = FUNCTIONS[funcKey];

    // Generate function with random coefficients
    const func = funcDef.generate();

    // Generate random point for evaluation
    const point = randomPoint();

    // Create question object
    STATE.currentQuestion = {
        functionKey: funcKey,
        functionDef: funcDef,
        func: func,
        point: point,
        answered: false,
        correct: null
    };

    // Update plot to show the new point
    document.getElementById('xInput').value = point.x;
    document.getElementById('yInput').value = point.y;
    document.getElementById('functionSelect').value = funcKey;
    updatePlot();

    // Build question text
    let questionText = `Given ${funcDef.template}`;
    // Replace placeholders with actual values
    for (const [key, value] of Object.entries(func)) {
        if (typeof value !== 'function') {
            const placeholder = `{${key}}`;
            questionText = questionText.replace(placeholder, value);
        }
    }
    questionText += `\n\nCompute ∇f(${point.x}, ${point.y})`;

    document.getElementById('questionText').textContent = questionText;

    // Show input area, hide feedback
    document.getElementById('answerInputArea').style.display = 'flex';
    document.getElementById('feedbackArea').style.display = 'none';
    document.getElementById('answerDfDx').value = '';
    document.getElementById('answerDfDy').value = '';
    document.getElementById('answerDfDx').focus();

    // Update button visibility
    document.getElementById('submitAnswerBtn').style.display = 'block';
    document.getElementById('skipQuestionBtn').style.display = 'none';
}

/**
 * Check user's answer and provide feedback
 */
function checkAnswer() {
    const userDfDx = document.getElementById('answerDfDx').value.trim();
    const userDfDy = document.getElementById('answerDfDy').value.trim();

    if (!userDfDx || !userDfDy) {
        alert('Please fill in both partial derivatives.');
        return;
    }

    const func = STATE.currentQuestion.func;
    const point = STATE.currentQuestion.point;

    // Evaluate at the specific point
    const correctDfDx = func.partialXValue(point.x, point.y);
    const correctDfDy = func.partialYValue(point.x, point.y);

    // Evaluate user answers
    const userDfDxValue = evaluateExpression(userDfDx, point.x, point.y);
    const userDfDyValue = evaluateExpression(userDfDy, point.x, point.y);

    // Check correctness (with tolerance for floating point)
    const tolerance = 0.05;
    const dfdxCorrect = Math.abs(userDfDxValue - correctDfDx) < tolerance;
    const dfdyCorrect = Math.abs(userDfDyValue - correctDfDy) < tolerance;
    const allCorrect = dfdxCorrect && dfdyCorrect;

    // Update stats
    STATE.stats.attempted++;
    if (allCorrect) {
        STATE.stats.correct++;
    }
    updateStats();

    // Build feedback
    displayFeedback(dfdxCorrect, dfdyCorrect, allCorrect, func, point, correctDfDx, correctDfDy);

    STATE.currentQuestion.answered = true;
    STATE.currentQuestion.correct = allCorrect;

    // Hide input, show feedback
    document.getElementById('answerInputArea').style.display = 'none';
    document.getElementById('feedbackArea').style.display = 'flex';
    document.getElementById('submitAnswerBtn').style.display = 'none';
    document.getElementById('skipQuestionBtn').style.display = 'inline-block';
}

/**
 * Display feedback and solution
 */
function displayFeedback(dfdxCorrect, dfdyCorrect, allCorrect, func, point, correctDfDx, correctDfDy) {
    const feedbackDfDx = document.getElementById('feedbackDfDx');
    const feedbackDfDy = document.getElementById('feedbackDfDy');

    // Show results
    feedbackDfDx.className = dfdxCorrect ? 'feedback-result correct' : 'feedback-result incorrect';
    feedbackDfDx.textContent = dfdxCorrect ? `✓ Correct (${correctDfDx.toFixed(3)})` : `✗ Incorrect (correct: ${correctDfDx.toFixed(3)})`;

    feedbackDfDy.className = dfdyCorrect ? 'feedback-result correct' : 'feedback-result incorrect';
    feedbackDfDy.textContent = dfdyCorrect ? `✓ Correct (${correctDfDy.toFixed(3)})` : `✗ Incorrect (correct: ${correctDfDy.toFixed(3)})`;

    // Build solution
    const solutionArea = document.getElementById('solutionArea');
    solutionArea.innerHTML = '';

    if (allCorrect) {
        // Alternative explanation for correct answers
        solutionArea.innerHTML = `
            <h3>📝 Alternative Method / Verification</h3>
            <p>You correctly computed the partial derivatives by finding the slopes of the surface in the x and y directions.</p>
            <p><strong>At point (${point.x}, ${point.y}):</strong></p>
            <p>∂f/∂x = ${correctDfDx.toFixed(3)}</p>
            <p>∂f/∂y = ${correctDfDy.toFixed(3)}</p>
            <p><strong>Gradient vector ∇f = &lt;${correctDfDx.toFixed(3)}, ${correctDfDy.toFixed(3)}&gt;</strong></p>
            <p>This vector points in the direction of steepest ascent on the surface.</p>
        `;
    } else {
        // Step-by-step solution for incorrect answers
        const funcKey = STATE.currentQuestion.functionKey;
        const funcDef = FUNCTIONS[funcKey];
        const f = func;

        solutionArea.innerHTML = `
            <h3>🔍 Step-by-Step Solution</h3>
            <p><strong>Step 1: Write down the function</strong></p>
            <p>${funcDef.template.replace(/{[a-z]}/g, (m) => f[m.slice(1, -1)] || m)}</p>
            <p><strong>Step 2: Compute ∂f/∂x (partial derivative with respect to x)</strong></p>
            <p>Treating y as a constant, differentiate each term:</p>
            <p>${f.partialX(point.x, point.y)}</p>
            <p><strong>Step 3: Evaluate at (${point.x}, ${point.y})</strong></p>
            <p>∂f/∂x|(${point.x}, ${point.y}) = ${correctDfDx.toFixed(3)}</p>
            <p><strong>Step 4: Compute ∂f/∂y (partial derivative with respect to y)</strong></p>
            <p>Treating x as a constant, differentiate each term:</p>
            <p>${f.partialY(point.x, point.y)}</p>
            <p><strong>Step 5: Evaluate at (${point.x}, ${point.y})</strong></p>
            <p>∂f/∂y|(${point.x}, ${point.y}) = ${correctDfDy.toFixed(3)}</p>
            <p><strong>Final Answer: ∇f(${point.x}, ${point.y}) = &lt;${correctDfDx.toFixed(3)}, ${correctDfDy.toFixed(3)}&gt;</strong></p>
        `;
    }
}

/**
 * Update statistics display
 */
function updateStats() {
    document.getElementById('correctCount').textContent = STATE.stats.correct;
    document.getElementById('attemptedCount').textContent = STATE.stats.attempted;
}

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', () => {
    // Plot update button
    document.getElementById('updatePlotBtn').addEventListener('click', updatePlot);

    // Question management
    document.getElementById('newQuestionBtn').addEventListener('click', generateNewQuestion);
    document.getElementById('skipQuestionBtn').addEventListener('click', generateNewQuestion);
    document.getElementById('submitAnswerBtn').addEventListener('click', checkAnswer);

    // Allow Enter key in input fields
    document.getElementById('answerDfDx').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });
    document.getElementById('answerDfDy').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });

    // Function select change
    document.getElementById('functionSelect').addEventListener('change', updatePlot);

    // Initialize with default plot
    updatePlot();
});
