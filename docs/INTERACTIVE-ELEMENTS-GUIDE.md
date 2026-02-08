# Interactive Elements Implementation Guide
**Adding Quizzes, Simulations, and Code Playgrounds**

---

## 📍 Where to Add Interactive Elements

### 1. Quizzes After Each Module

**Location:** End of each module page in `rpo-training/pathways/modules/`

**Files to Update:**
- `rpo-training/pathways/modules/beginner-1.html` ← Add quiz here
- `rpo-training/pathways/modules/beginner-2.html` ← Add quiz here
- `rpo-training/pathways/modules/intermediate-1.html` ← Add quiz here
- All other module files...

**Placement:** Before the "Next Module" button at the bottom of each page

### 2. Interactive Simulations

**Location:** Dedicated simulation pages

**Create New Files:**
- `rpo-training/simulations/` ← New folder
  - `resume-review-sim.html` ← Resume review simulation
  - `candidate-screening-sim.html` ← Screening simulation
  - `prompt-practice-sim.html` ← Prompt writing practice
  - `ai-conversation-sim.html` ← AI conversation practice

**OR Update Existing:**
- `ai-simulations/index.html` ← Add simulations gallery
- `ai-simulations/ai-simulations.html` ← Existing simulations

### 3. Code Playgrounds for Prompts

**Location:** Inside the Prompts Library

**Files to Update:**
- `gbs-prompts/index.html` ← Add "Try It" button to each prompt
- Create: `gbs-prompts/playground.html` ← Dedicated playground page

**Alternative Location:**
- `rpo-training/ai-tools-lab.html` ← Add as new tool

---

## 🎯 Implementation Strategy

### Phase 1: Quiz System
1. Create reusable quiz component
2. Add to one module as pilot
3. Roll out to all modules
4. Track completion

### Phase 2: Interactive Simulations
1. Create simulation framework
2. Build 2-3 pilot simulations
3. Add to training paths
4. Expand library

### Phase 3: Code Playgrounds
1. Build prompt testing interface
2. Integrate with prompt library
3. Add AI response preview
4. Save/share functionality

---

## 🧩 Component Architecture

```
shared/
├── scripts/
│   ├── components/
│   │   ├── quiz.js              ← New: Quiz engine
│   │   ├── simulation.js        ← New: Simulation framework
│   │   └── code-playground.js   ← New: Code playground
│   └── utils/
│       └── quiz-data.json       ← Quiz questions database
├── styles/
│   ├── quiz.css                 ← Quiz styling
│   ├── simulation.css           ← Simulation styling
│   └── playground.css           ← Playground styling
```

---

## 📝 Detailed Implementation

### 1. Quiz System

#### Step 1: Create Quiz Component

**File:** `shared/scripts/components/quiz.js`
**Purpose:** Reusable quiz engine with security

**Features:**
- Multiple choice questions
- True/False questions
- Multi-select questions
- Instant feedback
- Score tracking
- Progress saving
- Retry functionality

#### Step 2: Create Quiz Styles

**File:** `shared/styles/quiz.css`
**Purpose:** Professional quiz UI

#### Step 3: Add to Module Pages

**Example Location:** `rpo-training/pathways/modules/beginner-1.html`
**Placement:** After main content, before navigation buttons

```html
<!-- Main module content -->
<div class="module-content">
    <!-- Existing content -->
</div>

<!-- NEW: Quiz Section -->
<div id="module-quiz" class="quiz-section">
    <!-- Quiz will be injected here -->
</div>

<!-- Navigation buttons -->
<div class="module-navigation">
    <!-- Existing navigation -->
</div>
```

---

### 2. Interactive Simulations

#### Create Simulation Framework

**File:** `shared/scripts/components/simulation.js`
**Purpose:** Framework for interactive scenarios

**Types of Simulations:**
1. **Resume Review** - Practice evaluating AI-analyzed resumes
2. **Candidate Screening** - Practice phone screening with AI assistance
3. **Prompt Engineering** - Build and test prompts in real-time
4. **Email Writing** - Practice writing AI-enhanced emails
5. **Boolean Search** - Interactive boolean string builder

#### Example: Resume Review Simulation

**File:** `rpo-training/simulations/resume-review-sim.html`

**Flow:**
1. Show candidate resume
2. Show AI analysis
3. Ask user questions about findings
4. Provide expert feedback
5. Score and explain

---

### 3. Code Playground

#### Create Playground Component

**File:** `shared/scripts/components/code-playground.js`
**Purpose:** Live prompt testing interface

**Features:**
- Prompt editor
- Variable inputs
- Template preview
- Copy to clipboard
- Save favorites
- Share link

#### Add to Prompts Library

**File:** `gbs-prompts/index.html`
**Update:** Add "Try It" button to each prompt card

```html
<!-- Existing prompt card -->
<div class="prompt-card">
    <h3>Email Outreach</h3>
    <p>Professional candidate outreach email...</p>

    <!-- NEW: Action buttons -->
    <div class="prompt-actions">
        <button class="btn-copy">📋 Copy</button>
        <button class="btn-playground">🎮 Try It</button> <!-- NEW -->
    </div>
</div>
```

---

## 💻 Code Examples

### Example 1: Simple Quiz Component

**Where to add:** `shared/scripts/components/quiz.js`

```javascript
class QuizComponent {
    constructor(containerId, quizData) {
        this.container = document.getElementById(containerId);
        this.quizData = quizData;
        this.currentQuestion = 0;
        this.score = 0;
        this.answers = [];
        this.init();
    }

    init() {
        this.render();
    }

    render() {
        if (this.currentQuestion >= this.quizData.questions.length) {
            this.showResults();
            return;
        }

        const question = this.quizData.questions[this.currentQuestion];

        const quizHTML = `
            <div class="quiz-container">
                <div class="quiz-header">
                    <h3>Knowledge Check</h3>
                    <span class="quiz-progress">Question ${this.currentQuestion + 1} of ${this.quizData.questions.length}</span>
                </div>

                <div class="quiz-body">
                    <p class="quiz-question">${question.question}</p>

                    <div class="quiz-options">
                        ${question.options.map((option, index) => `
                            <label class="quiz-option">
                                <input type="radio" name="answer" value="${index}">
                                <span>${option}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="quiz-footer">
                    <button onclick="quiz.checkAnswer()" class="btn-primary">Submit Answer</button>
                </div>
            </div>
        `;

        SecurityUtils.safeSetInnerHTML(this.container, quizHTML);
    }

    checkAnswer() {
        const selected = document.querySelector('input[name="answer"]:checked');
        if (!selected) {
            alert('Please select an answer');
            return;
        }

        const question = this.quizData.questions[this.currentQuestion];
        const answer = parseInt(selected.value);
        const isCorrect = answer === question.correctAnswer;

        if (isCorrect) this.score++;
        this.answers.push({ question: this.currentQuestion, answer, isCorrect });

        this.showFeedback(isCorrect, question);
    }

    showFeedback(isCorrect, question) {
        const feedbackHTML = `
            <div class="quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}">
                <h4>${isCorrect ? '✅ Correct!' : '❌ Incorrect'}</h4>
                <p>${question.explanation}</p>
                <button onclick="quiz.nextQuestion()" class="btn-primary">
                    ${this.currentQuestion < this.quizData.questions.length - 1 ? 'Next Question' : 'See Results'}
                </button>
            </div>
        `;

        const feedbackDiv = document.createElement('div');
        SecurityUtils.safeSetInnerHTML(feedbackDiv, feedbackHTML);
        this.container.appendChild(feedbackDiv);
    }

    nextQuestion() {
        this.currentQuestion++;
        this.render();
    }

    showResults() {
        const percentage = Math.round((this.score / this.quizData.questions.length) * 100);
        const passed = percentage >= 70;

        const resultsHTML = `
            <div class="quiz-results">
                <h3>Quiz Complete!</h3>
                <div class="score-circle ${passed ? 'pass' : 'fail'}">
                    <span class="score">${percentage}%</span>
                </div>
                <p class="score-text">You got ${this.score} out of ${this.quizData.questions.length} correct</p>

                ${passed ?
                    '<p class="pass-message">🎉 Great job! You can proceed to the next module.</p>' :
                    '<p class="fail-message">Review the material and try again.</p>'
                }

                <div class="quiz-actions">
                    <button onclick="quiz.restart()" class="btn-secondary">Retry Quiz</button>
                    ${passed ? '<button onclick="nextModule()" class="btn-primary">Next Module</button>' : ''}
                </div>
            </div>
        `;

        SecurityUtils.safeSetInnerHTML(this.container, resultsHTML);

        // Save completion
        if (passed) {
            this.saveCompletion();
        }
    }

    saveCompletion() {
        const moduleId = this.quizData.moduleId;
        const completedQuizzes = SecurityUtils.safeLocalStorageGet('completedQuizzes') || [];
        if (!completedQuizzes.includes(moduleId)) {
            completedQuizzes.push(moduleId);
            SecurityUtils.safeLocalStorageSet('completedQuizzes', completedQuizzes);
        }
    }

    restart() {
        this.currentQuestion = 0;
        this.score = 0;
        this.answers = [];
        this.render();
    }
}
```

### Example 2: Quiz Usage in Module Page

**Where to add:** `rpo-training/pathways/modules/beginner-1.html`

**Add before closing `</body>` tag:**

```html
<!-- Quiz Section -->
<div id="module-quiz" class="my-12"></div>

<!-- Quiz Component -->
<script src="../../../shared/scripts/components/quiz.js"></script>
<script>
    // Quiz data for this module
    const quizData = {
        moduleId: 'beginner-1',
        questions: [
            {
                question: "What is the primary purpose of AI in recruitment?",
                options: [
                    "To replace human recruiters",
                    "To augment human decision-making",
                    "To make hiring decisions automatically",
                    "To reduce candidate quality"
                ],
                correctAnswer: 1,
                explanation: "AI is designed to augment and enhance human decision-making, not replace recruiters. It helps with tasks like screening and analysis, while humans make final decisions."
            },
            {
                question: "Which of these is a good use case for AI in recruiting?",
                options: [
                    "Making final hiring decisions",
                    "Screening resumes for keywords",
                    "Replacing phone interviews",
                    "Eliminating diversity initiatives"
                ],
                correctAnswer: 1,
                explanation: "AI excels at screening resumes for relevant keywords and qualifications, saving recruiters time. However, humans should still make final decisions and conduct interviews."
            },
            {
                question: "What should you always do with AI-generated content?",
                options: [
                    "Use it without changes",
                    "Review and personalize it",
                    "Share it immediately",
                    "Ignore it completely"
                ],
                correctAnswer: 1,
                explanation: "Always review and personalize AI-generated content to ensure accuracy, add your unique insights, and maintain a human touch."
            }
        ]
    };

    // Initialize quiz
    let quiz;
    document.addEventListener('DOMContentLoaded', function() {
        quiz = new QuizComponent('module-quiz', quizData);
    });

    function nextModule() {
        window.location.href = 'beginner-2.html';
    }
</script>
```

---

## 🎨 Quiz Styling

**Where to add:** `shared/styles/quiz.css`

```css
/* Quiz Container */
.quiz-container {
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    max-width: 700px;
    margin: 0 auto;
}

.quiz-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #e5e7eb;
}

.quiz-header h3 {
    font-size: 24px;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
}

.quiz-progress {
    background: #e0f2fe;
    color: #0369a1;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
}

/* Question */
.quiz-question {
    font-size: 18px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 24px;
    line-height: 1.6;
}

/* Options */
.quiz-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
}

.quiz-option {
    display: flex;
    align-items: center;
    padding: 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.quiz-option:hover {
    border-color: #4A90E2;
    background: #f0f9ff;
}

.quiz-option input[type="radio"] {
    margin-right: 12px;
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.quiz-option span {
    font-size: 16px;
    color: #4b5563;
}

/* Feedback */
.quiz-feedback {
    margin-top: 20px;
    padding: 20px;
    border-radius: 8px;
    animation: slideIn 0.3s ease;
}

.quiz-feedback.correct {
    background: #d1fae5;
    border: 2px solid #10b981;
}

.quiz-feedback.incorrect {
    background: #fee2e2;
    border: 2px solid #ef4444;
}

.quiz-feedback h4 {
    font-size: 18px;
    margin-bottom: 8px;
}

.quiz-feedback.correct h4 {
    color: #065f46;
}

.quiz-feedback.incorrect h4 {
    color: #991b1b;
}

/* Results */
.quiz-results {
    text-align: center;
    padding: 30px;
}

.score-circle {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 20px auto;
    font-size: 48px;
    font-weight: 700;
}

.score-circle.pass {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    color: #065f46;
    border: 4px solid #10b981;
}

.score-circle.fail {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    color: #991b1b;
    border: 4px solid #ef4444;
}

.pass-message {
    color: #065f46;
    font-weight: 600;
    font-size: 18px;
    margin: 20px 0;
}

.fail-message {
    color: #991b1b;
    font-weight: 600;
    font-size: 18px;
    margin: 20px 0;
}

.quiz-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 24px;
}

/* Animation */
@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive */
@media (max-width: 768px) {
    .quiz-container {
        padding: 20px;
    }

    .quiz-header {
        flex-direction: column;
        gap: 12px;
        text-align: center;
    }

    .quiz-question {
        font-size: 16px;
    }

    .quiz-option {
        padding: 12px;
    }
}
```

---

## 🎮 Example 3: Simple Code Playground

**Where to add:** Create new file `gbs-prompts/playground.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prompt Playground - GBS Learning Hub</title>

    <!-- Security -->
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
        integrity="sha384-4H0KEY16H/RgZTVx9vNEz5PQZbQ/1LDz9Jl8tN0FKYxjBfUOcYhJ3k+xhWLxqUqK"
        crossorigin="anonymous"></script>

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../shared/fonts.css">
    <link rel="stylesheet" href="../shared/buttons.css">

    <style>
        .playground-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            height: calc(100vh - 200px);
        }

        .playground-panel {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .code-editor {
            width: 100%;
            height: 400px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            padding: 15px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            resize: vertical;
        }

        .variable-input {
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
            align-items: center;
        }

        .variable-input label {
            min-width: 120px;
            font-weight: 600;
        }

        .variable-input input {
            flex: 1;
            padding: 8px 12px;
            border: 2px solid #e5e7eb;
            border-radius: 6px;
        }

        .preview-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            min-height: 200px;
            white-space: pre-wrap;
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
        }

        @media (max-width: 968px) {
            .playground-container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body class="bg-gray-50">

    <div class="container mx-auto px-4 py-8">
        <header class="text-center mb-8">
            <h1 class="text-4xl font-bold mb-2">Prompt Playground</h1>
            <p class="text-gray-600">Test and customize your AI prompts in real-time</p>
        </header>

        <div class="playground-container">
            <!-- Left Panel: Editor -->
            <div class="playground-panel">
                <h2 class="text-2xl font-bold mb-4">✏️ Prompt Template</h2>

                <textarea id="prompt-editor" class="code-editor" placeholder="Enter your prompt template here...

Example:
Write a professional email to {candidate_name} about the {role_title} position at {company_name}.

The email should:
- Be friendly and professional
- Highlight {key_skills}
- Mention next steps"></textarea>

                <div class="mt-4">
                    <button onclick="updatePreview()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                        🔄 Update Preview
                    </button>
                    <button onclick="copyToClipboard()" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg ml-2">
                        📋 Copy
                    </button>
                </div>
            </div>

            <!-- Right Panel: Variables & Preview -->
            <div class="playground-panel">
                <h2 class="text-2xl font-bold mb-4">⚙️ Variables</h2>

                <div id="variables-container" class="mb-6">
                    <!-- Variables will be detected and shown here -->
                </div>

                <h3 class="text-xl font-bold mb-3">👁️ Preview</h3>
                <div id="preview-box" class="preview-box">
                    Your preview will appear here...
                </div>
            </div>
        </div>
    </div>

    <!-- Security Utilities -->
    <script src="../shared/scripts/utils/security.js"></script>

    <script>
        let variables = {};

        // Detect variables in template
        function detectVariables() {
            const template = document.getElementById('prompt-editor').value;
            const regex = /\{([^}]+)\}/g;
            const found = new Set();
            let match;

            while ((match = regex.exec(template)) !== null) {
                found.add(match[1]);
            }

            return Array.from(found);
        }

        // Render variable inputs
        function renderVariableInputs() {
            const detected = detectVariables();
            const container = document.getElementById('variables-container');

            if (detected.length === 0) {
                container.innerHTML = '<p class="text-gray-500 italic">No variables detected. Use {variable_name} syntax.</p>';
                return;
            }

            const inputsHTML = detected.map(varName => `
                <div class="variable-input">
                    <label for="var-${varName}">{${varName}}:</label>
                    <input
                        type="text"
                        id="var-${varName}"
                        value="${variables[varName] || ''}"
                        placeholder="Enter ${varName}"
                        oninput="updateVariable('${varName}', this.value)"
                    >
                </div>
            `).join('');

            SecurityUtils.safeSetInnerHTML(container, inputsHTML);
        }

        // Update variable value
        function updateVariable(name, value) {
            variables[name] = SecurityUtils.sanitizeInput(value, { maxLength: 500 });
            updatePreview();
        }

        // Update preview
        function updatePreview() {
            renderVariableInputs();

            let template = document.getElementById('prompt-editor').value;

            // Replace variables with values
            Object.keys(variables).forEach(varName => {
                const regex = new RegExp(`\\{${varName}\\}`, 'g');
                template = template.replace(regex, variables[varName] || `{${varName}}`);
            });

            // Sanitize and display
            const preview = document.getElementById('preview-box');
            preview.textContent = template;
        }

        // Copy to clipboard
        function copyToClipboard() {
            const preview = document.getElementById('preview-box').textContent;
            navigator.clipboard.writeText(preview).then(() => {
                alert('✅ Copied to clipboard!');
            }).catch(() => {
                alert('❌ Failed to copy');
            });
        }

        // Auto-update on typing
        document.getElementById('prompt-editor').addEventListener('input', () => {
            const debounced = SecurityUtils.debounce(updatePreview, 500);
            debounced();
        });

        // Initial render
        updatePreview();
    </script>

</body>
</html>
```

---

## 📍 **Summary: Where to Add Each Element**

| Interactive Element | Primary Location | Secondary Location |
|---------------------|------------------|-------------------|
| **Quizzes** | End of each module in `rpo-training/pathways/modules/*.html` | After lessons in `rpo-training/sessions/*.html` |
| **Simulations** | New folder: `rpo-training/simulations/` | Link from `ai-simulations/index.html` |
| **Code Playground** | New page: `gbs-prompts/playground.html` | Add to `rpo-training/ai-tools-lab.html` |

---

## 🚀 **Implementation Priority**

### Week 1: Quiz System
1. Create `shared/scripts/components/quiz.js`
2. Create `shared/styles/quiz.css`
3. Add quiz to 1 module as pilot
4. Test and refine

### Week 2: Expand Quizzes
5. Add quizzes to all beginner modules
6. Add quizzes to intermediate modules
7. Add quizzes to advanced modules

### Week 3: Code Playground
8. Create `gbs-prompts/playground.html`
9. Test with sample prompts
10. Link from prompts library

### Week 4: Simulations
11. Create simulation framework
12. Build 2-3 pilot simulations
13. Link from training paths

---

Would you like me to create the actual working files for any of these components?
