// Global state
let currentAuditResult = null;

// Form submission
document.getElementById('auditForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = document.getElementById('url').value.trim();
    const submitBtn = document.getElementById('submitBtn');
    const progressEl = document.getElementById('progress');
    const errorEl = document.getElementById('error');
    const resultsEl = document.getElementById('results');

    // Hide previous results and errors
    errorEl.classList.add('hidden');
    resultsEl.classList.add('hidden');

    // Show progress
    progressEl.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/audit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Audit failed');
        }

        const result = await response.json();
        currentAuditResult = result;

        // Hide progress
        progressEl.classList.add('hidden');

        // Display results
        displayResults(result);

    } catch (error) {
        console.error('Audit error:', error);
        errorEl.textContent = `Error: ${error.message}`;
        errorEl.classList.remove('hidden');
        progressEl.classList.add('hidden');
    } finally {
        submitBtn.disabled = false;
    }
});

function displayResults(result) {
    const resultsEl = document.getElementById('results');

    // Display overall score
    const scoreValue = result.scores.overall;
    const scoreGrade = result.scores.grade;

    document.getElementById('scoreValue').textContent = scoreValue;
    document.getElementById('scoreGrade').textContent = `Grade: ${scoreGrade}`;
    document.getElementById('auditedUrl').textContent = result.url;

    // Color the score circle
    const scoreCircle = document.getElementById('scoreCircle');
    scoreCircle.className = 'score-circle';
    if (scoreValue >= 90) scoreCircle.classList.add('excellent');
    else if (scoreValue >= 75) scoreCircle.classList.add('good');
    else if (scoreValue >= 50) scoreCircle.classList.add('fair');
    else scoreCircle.classList.add('poor');

    // Display metadata
    document.getElementById('industry').textContent = result.metadata.detectedIndustry || 'Unknown';
    document.getElementById('ssrEnabled').textContent = result.metadata.ssrEnabled ? 'Yes' : 'No';
    document.getElementById('schemaCount').textContent = result.metadata.totalSchemas || 0;
    document.getElementById('duration').textContent = `${(result.duration / 1000).toFixed(2)}s`;

    // Display audit categories
    const categoriesEl = document.getElementById('auditCategories');
    categoriesEl.innerHTML = '<h3>Audit Details</h3>';

    for (const [name, audit] of Object.entries(result.auditResults)) {
        const categoryEl = createAuditCategoryElement(name, audit);
        categoriesEl.appendChild(categoryEl);
    }

    // Display recommendations
    const recommendationsEl = document.getElementById('recommendations');
    recommendationsEl.innerHTML = '<h3>AI-Powered Recommendations</h3>';

    if (Object.keys(result.recommendations).length === 0) {
        recommendationsEl.innerHTML += '<p style="color: var(--success);">✅ No critical issues found! Your website is well-optimized for AI agents.</p>';
    } else {
        for (const [auditName, recommendation] of Object.entries(result.recommendations)) {
            if (recommendation.error) {
                recommendationsEl.innerHTML += `
                    <div class="recommendation">
                        <h4>${auditName}</h4>
                        <p style="color: var(--text-secondary);">${recommendation.message}</p>
                        ${recommendation.fallback ? createFallbackRecommendation(recommendation.fallback) : ''}
                    </div>
                `;
            } else {
                const recEl = createRecommendationElement(auditName, recommendation);
                recommendationsEl.appendChild(recEl);
            }
        }
    }

    // Show results
    resultsEl.classList.remove('hidden');
    resultsEl.scrollIntoView({ behavior: 'smooth' });
}

function createAuditCategoryElement(name, audit) {
    const div = document.createElement('div');
    div.className = 'audit-category';

    div.innerHTML = `
        <div class="category-header">
            <div>
                <div class="category-title">${audit.title}</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">${audit.description}</div>
            </div>
            <div class="category-score ${audit.severity}">
                ${audit.score}/100
            </div>
        </div>
        <div class="display-value">${audit.displayValue}</div>
        <div class="findings">
            ${audit.findings.map(finding => `
                <div class="finding ${finding.type}">
                    <div class="finding-title">${finding.title}</div>
                    <div class="finding-message">${finding.message}</div>
                    ${finding.recommendation !== 'n/a' ? `
                        <div class="finding-recommendation">
                            <strong>Recommendation:</strong> ${finding.recommendation}
                        </div>
                    ` : ''}
                    <div style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                        Impact: ${finding.impact} | Effort: ${finding.effort}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    return div;
}

function createRecommendationElement(auditName, recommendation) {
    const div = document.createElement('div');
    div.className = 'recommendation';

    let html = `<h4>🤖 ${formatAuditName(auditName)}</h4>`;

    if (recommendation.summary) {
        html += `<p><strong>Summary:</strong> ${recommendation.summary}</p>`;
    }

    if (recommendation.recommendations && recommendation.recommendations.length > 0) {
        html += '<div style="margin-top: 16px;"><strong>Recommendations:</strong><ul>';
        recommendation.recommendations.forEach(rec => {
            html += `<li>${rec}</li>`;
        });
        html += '</ul></div>';
    }

    if (recommendation.codeExamples && recommendation.codeExamples.length > 0) {
        html += '<div style="margin-top: 16px;"><strong>Code Examples:</strong></div>';
        recommendation.codeExamples.forEach(code => {
            html += `<pre style="background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; margin-top: 8px;"><code>${escapeHtml(code)}</code></pre>`;
        });
    }

    if (recommendation.priority) {
        html += `<div style="margin-top: 12px; font-size: 0.9rem;"><strong>Priority:</strong> ${recommendation.priority.toUpperCase()}</div>`;
    }

    div.innerHTML = html;
    return div;
}

function createFallbackRecommendation(fallback) {
    let html = '<div style="margin-top: 12px; padding: 12px; background: #fffbeb; border-radius: 8px;">';
    html += `<p><strong>${fallback.summary}</strong></p>`;

    if (fallback.recommendations && fallback.recommendations.length > 0) {
        html += '<ul>';
        fallback.recommendations.forEach(rec => {
            html += `<li>${rec}</li>`;
        });
        html += '</ul>';
    }

    if (fallback.note) {
        html += `<p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 8px;">${fallback.note}</p>`;
    }

    html += '</div>';
    return html;
}

function formatAuditName(name) {
    return name.replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function downloadReport() {
    if (!currentAuditResult) return;

    const dataStr = JSON.stringify(currentAuditResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `sober-ai-audit-${new Date().toISOString()}.json`;
    link.click();

    URL.revokeObjectURL(url);
}
