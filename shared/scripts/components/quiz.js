/**
 * Quiz Component for GBS Learning Hub
 * Secure, reusable quiz system with progress tracking
 */

class QuizComponent {
    constructor(containerId, quizData) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Quiz container with id "${containerId}" not found`);
            return;
        }

        this.quizData = quizData;
        this.currentQuestion = 0;
        this.score = 0;
        this.answers = [];
        this.startTime = Date.now();

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
        const progressPercent = ((this.currentQuestion + 1) / this.quizData.questions.length) * 100;

        const quizHTML = `
            <div class="quiz-container">
                <div class="quiz-header">
                    <h3>Knowledge Check</h3>
                    <span class="quiz-progress">Question ${this.currentQuestion + 1} of ${this.quizData.questions.length}</span>
                </div>

                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progressPercent}%"></div>
                </div>

                <div class="quiz-body">
                    <p class="quiz-question">${SecurityUtils.escapeHTML(question.question)}</p>

                    <div class="quiz-options">
                        ${question.options.map((option, index) => `
                            <label class="quiz-option">
                                <input type="${question.type === 'multi' ? 'checkbox' : 'radio'}"
                                       name="answer"
                                       value="${index}"
                                       aria-label="${SecurityUtils.escapeHTML(option)}">
                                <span>${SecurityUtils.escapeHTML(option)}</span>
                            </label>
                        `).join('')}
                    </div>

                    ${question.hint ? `
                        <div class="quiz-hint">
                            <button onclick="quiz.toggleHint()" class="btn-hint">💡 Show Hint</button>
                            <div id="hint-text" class="hint-text hidden">
                                ${SecurityUtils.escapeHTML(question.hint)}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="quiz-footer">
                    <button onclick="quiz.checkAnswer()" class="btn-primary">Submit Answer</button>
                    ${this.currentQuestion > 0 ? `
                        <button onclick="quiz.previousQuestion()" class="btn-secondary">← Previous</button>
                    ` : ''}
                </div>
            </div>
        `;

        // Use direct innerHTML since this is our own trusted template
        // User data is already escaped with SecurityUtils.escapeHTML() above
        this.container.innerHTML = quizHTML;
    }

    toggleHint() {
        const hintText = document.getElementById('hint-text');
        if (hintText) {
            hintText.classList.toggle('hidden');
        }
    }

    showAlert(message) {
        // Create custom alert modal
        const alertHTML = `
            <div class="quiz-alert-overlay" onclick="this.remove()">
                <div class="quiz-alert-modal" onclick="event.stopPropagation()">
                    <div class="quiz-alert-content">
                        <div class="quiz-alert-icon">⚠️</div>
                        <p class="quiz-alert-message">${SecurityUtils.escapeHTML(message)}</p>
                        <button onclick="this.closest('.quiz-alert-overlay').remove()" class="quiz-alert-btn">
                            OK
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add to body
        const alertDiv = document.createElement('div');
        alertDiv.innerHTML = alertHTML;
        document.body.appendChild(alertDiv.firstElementChild);
    }

    checkAnswer() {
        const question = this.quizData.questions[this.currentQuestion];

        if (question.type === 'multi') {
            const selected = Array.from(document.querySelectorAll('input[name="answer"]:checked'))
                .map(input => parseInt(input.value));

            if (selected.length === 0) {
                this.showAlert('Please select at least one answer');
                return;
            }

            const correctAnswers = question.correctAnswer;
            const isCorrect = selected.length === correctAnswers.length &&
                selected.every(val => correctAnswers.includes(val));

            if (isCorrect) this.score++;
            this.answers.push({ question: this.currentQuestion, answer: selected, isCorrect });

            this.showFeedback(isCorrect, question, selected);
        } else {
            const selected = document.querySelector('input[name="answer"]:checked');
            if (!selected) {
                this.showAlert('Please select an answer');
                return;
            }

            const answer = parseInt(selected.value);
            const isCorrect = answer === question.correctAnswer;

            if (isCorrect) this.score++;
            this.answers.push({ question: this.currentQuestion, answer, isCorrect });

            this.showFeedback(isCorrect, question, answer);
        }
    }

    showFeedback(isCorrect, question, answer) {
        const feedbackHTML = `
            <div class="quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="feedback-icon">
                    ${isCorrect ? '✅' : '❌'}
                </div>
                <h4>${isCorrect ? 'Correct!' : 'Not quite right'}</h4>
                <p class="feedback-explanation">${SecurityUtils.escapeHTML(question.explanation)}</p>

                ${!isCorrect && question.learnMore ? `
                    <div class="learn-more">
                        <a href="${SecurityUtils.sanitizeURL(question.learnMore)}" target="_blank" rel="noopener noreferrer">
                            📚 Learn more about this topic
                        </a>
                    </div>
                ` : ''}

                <button onclick="quiz.nextQuestion()" class="btn-primary">
                    ${this.currentQuestion < this.quizData.questions.length - 1 ? 'Next Question →' : 'See Results'}
                </button>
            </div>
        `;

        const feedbackDiv = document.createElement('div');
        feedbackDiv.innerHTML = feedbackHTML;
        this.container.querySelector('.quiz-container').appendChild(feedbackDiv);

        // Disable options after submission
        document.querySelectorAll('input[name="answer"]').forEach(input => {
            input.disabled = true;
        });
        document.querySelector('.quiz-footer button').disabled = true;
    }

    nextQuestion() {
        this.currentQuestion++;
        this.render();
    }

    previousQuestion() {
        if (this.currentQuestion > 0) {
            this.currentQuestion--;
            this.render();
        }
    }

    showResults() {
        const endTime = Date.now();
        const timeTaken = Math.round((endTime - this.startTime) / 1000); // seconds
        const percentage = Math.round((this.score / this.quizData.questions.length) * 100);
        const passed = percentage >= (this.quizData.passingScore || 70);

        const resultsHTML = `
            <div class="quiz-results">
                <h3>Quiz Complete!</h3>

                <div class="score-circle ${passed ? 'pass' : 'fail'}">
                    <span class="score">${percentage}%</span>
                </div>

                <div class="results-stats">
                    <div class="stat">
                        <span class="stat-label">Score</span>
                        <span class="stat-value">${this.score}/${this.quizData.questions.length}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Time</span>
                        <span class="stat-value">${this.formatTime(timeTaken)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Status</span>
                        <span class="stat-value ${passed ? 'text-green-600' : 'text-red-600'}">
                            ${passed ? 'Passed' : 'Not Passed'}
                        </span>
                    </div>
                </div>

                ${passed ?
                    '<p class="pass-message">🎉 Great job! You\'ve demonstrated understanding of this material.</p>' :
                    '<p class="fail-message">📚 Review the material and try again. You need ' + (this.quizData.passingScore || 70) + '% to pass.</p>'
                }

                <div class="quiz-actions">
                    <button onclick="quiz.restart()" class="btn-secondary">🔄 Retry Quiz</button>
                    ${passed && this.quizData.nextModuleUrl ?
                        `<button onclick="window.location.href='${SecurityUtils.sanitizeURL(this.quizData.nextModuleUrl)}'" class="btn-primary">Next Module →</button>` :
                        ''
                    }
                </div>

                ${this.quizData.showReview ? `
                    <div class="quiz-review">
                        <h4>Review Your Answers</h4>
                        ${this.answers.map((ans, idx) => {
                            const q = this.quizData.questions[idx];
                            return `
                                <div class="review-item ${ans.isCorrect ? 'correct' : 'incorrect'}">
                                    <span class="review-icon">${ans.isCorrect ? '✅' : '❌'}</span>
                                    <span class="review-question">${SecurityUtils.escapeHTML(q.question)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        this.container.innerHTML = resultsHTML;

        // Save completion
        if (passed) {
            this.saveCompletion(percentage, timeTaken);
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }

    saveCompletion(percentage, timeTaken) {
        const moduleId = this.quizData.moduleId;
        const completedQuizzes = SecurityUtils.safeLocalStorageGet('completedQuizzes') || {};

        completedQuizzes[moduleId] = {
            score: this.score,
            total: this.quizData.questions.length,
            percentage: percentage,
            timeTaken: timeTaken,
            completedAt: new Date().toISOString(),
            attempts: (completedQuizzes[moduleId]?.attempts || 0) + 1
        };

        SecurityUtils.safeLocalStorageSet('completedQuizzes', completedQuizzes);

        // Trigger completion event
        if (typeof this.quizData.onComplete === 'function') {
            this.quizData.onComplete(percentage, timeTaken);
        }
    }

    restart() {
        this.currentQuestion = 0;
        this.score = 0;
        this.answers = [];
        this.startTime = Date.now();
        this.render();
    }
}

// Make QuizComponent available globally
if (typeof window !== 'undefined') {
    window.QuizComponent = QuizComponent;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuizComponent;
}
